/* Núcleo del panel: sesión, API de Supabase, utilidades de interfaz y constantes compartidas. */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://atsvcwvfapfzabrywjwx.supabase.co';
  const ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0c3Zjd3ZmYXBmemFicnl3and4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MTUyODEsImV4cCI6MjEwOTQ5MTI4MX0.jET54CTvKQcpAdpOrHL-n0j-eAoiwvDNlIjXO-Hmrdc';
  const SESSION_KEY = 'use_admin_session_v1';

  ['append', 'prepend', 'replaceChildren'].forEach((m) => {
    const orig = Element.prototype[m];
    Element.prototype[m] = function (...nodes) { return orig.apply(this, nodes.filter((x) => x !== null && x !== undefined && x !== false)); };
  });

  const App = (window.App = { SUPABASE_URL, session: null, views: {}, viewOrder: [], cache: {}, brand: null });

  // ---------- constantes ----------
  App.ESPECIALIDADES = [
    ['conductores', 'Conductores y cables'],
    ['estructuras', 'Torres, postes y crucetas'],
    ['aislamiento', 'Aisladores y herrajes'],
    ['proteccion', 'Protección y puesta a tierra'],
    ['opgw', 'Fibra óptica / OPGW'],
    ['tendido', 'Accesorios de tendido'],
    ['otros', 'Otros']
  ];
  App.MODALIDADES = [['maritimo', 'Marítimo'], ['aereo', 'Aéreo'], ['terrestre', 'Terrestre'], ['multimodal', 'Multimodal']];
  App.INCOTERMS = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'];
  App.SOL_ETAPAS = [
    ['nueva', 'Nueva'], ['en_revision', 'En revisión'], ['cotizando', 'Cotizando'], ['proforma_enviada', 'Proforma enviada'],
    ['negociacion', 'Negociación'], ['ganada', 'Ganada'], ['en_compra', 'En compra'], ['en_transito', 'En tránsito'],
    ['entregada', 'Entregada'], ['cerrada', 'Cerrada'], ['perdida', 'Perdida']
  ];
  App.OFERTA_ETAPAS = [
    ['enviada', 'Enviada'], ['respondida', 'Respondida'], ['negociacion', 'Negociación'], ['aceptada', 'Aceptada'],
    ['ordenada', 'Orden emitida'], ['entregada', 'Entregada'], ['descartada', 'Descartada']
  ];
  App.FLETE_ESTADOS = [['enviada', 'Enviada'], ['respondida', 'Respondida'], ['contratada', 'Contratada'], ['descartada', 'Descartada']];
  App.PROFORMA_ESTADOS = [['borrador', 'Borrador'], ['enviada', 'Enviada'], ['aceptada', 'Aceptada'], ['rechazada', 'Rechazada'], ['vencida', 'Vencida']];
  App.MOV_TIPOS = [['cobro', 'Cobro de cliente'], ['pago_proveedor', 'Pago a proveedor'], ['pago_transportista', 'Pago a transportista'], ['gasto', 'Gasto'], ['ajuste', 'Ajuste']];
  App.METODOS = [['transferencia', 'Transferencia'], ['ach', 'ACH'], ['efectivo', 'Efectivo'], ['cheque', 'Cheque'], ['tarjeta', 'Tarjeta'], ['otro', 'Otro']];
  App.label = (list, key) => (list.find((x) => x[0] === key) || [key, key || '—'])[1];

  // ---------- DOM ----------
  App.$ = (id) => document.getElementById(id);
  App.el = function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') n[k] = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    kids.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return n;
  };
  const { el } = App;
  App.toast = (msg) => {
    const t = App.$('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(App._tt); App._tt = setTimeout(() => (t.hidden = true), 3200);
  };
  App.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- formatos ----------
  App.fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('es-PA', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  App.fmtDay = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-PA', { dateStyle: 'medium' }) : '—');
  App.money = (n, cur = 'USD') =>
    n === null || n === undefined || n === '' ? '—' : `${cur} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  App.num = (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = Number(String(v).replace(/,/g, '.'));
    return Number.isFinite(n) ? n : null;
  };
  App.r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  App.digits = (s) => String(s || '').replace(/\D/g, '');
  App.folio = (r) => 'SOL-' + r.id.slice(0, 8).toUpperCase();
  App.today = () => new Date().toISOString().slice(0, 10);
  App.download = (name, text, type = 'text/csv;charset=utf-8') => {
    const a = el('a', { href: URL.createObjectURL(new Blob(['﻿' + text], { type })), download: name });
    a.click(); URL.revokeObjectURL(a.href);
  };
  App.csv = (cols, rows) => {
    const esc = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  };
  App.badge = (text, kind) => el('span', { class: 'badge ' + (kind || ''), text });
  App.stageBadge = (key) => {
    const kinds = { nueva: 'warn', ganada: 'ok', entregada: 'ok', cerrada: 'ok', perdida: 'bad', descartada: 'bad', aceptada: 'ok', ordenada: 'ok', contratada: 'ok', respondida: 'info', proforma_enviada: 'violet', enviada: 'info' };
    return App.badge(App.label([...App.SOL_ETAPAS, ...App.OFERTA_ETAPAS, ...App.FLETE_ESTADOS, ...App.PROFORMA_ESTADOS], key), kinds[key]);
  };

  // ---------- mensajes y enlaces ----------
  App.waLink = (num, text) => `https://wa.me/${App.digits(num)}?text=${encodeURIComponent(text)}`;
  App.mailLink = (to, subject, body, bcc) =>
    `mailto:${to || ''}?${bcc ? 'bcc=' + encodeURIComponent(bcc) + '&' : ''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  App.openLink = (url) => window.open(url, '_blank', 'noopener');
  App.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const t = el('textarea', { style: 'position:fixed;opacity:0' }); t.value = text; document.body.append(t); t.select();
      try { document.execCommand('copy'); } catch (__) {} t.remove();
    }
    App.toast('Copiado al portapapeles');
  };
  App.printHtml = (title, bodyHtml) => {
    const w = window.open('', '_blank');
    if (!w) return App.toast('El navegador bloqueó la ventana. Permite ventanas emergentes para imprimir.');
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${App.esc(title)}</title><style>
      body{font-family:system-ui,Arial,sans-serif;color:#111;margin:32px;font-size:13px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 6px}
      table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f3f3f3;font-size:11px;text-transform:uppercase}
      td.r,th.r{text-align:right}.head{display:flex;justify-content:space-between;border-bottom:3px solid #f57c00;padding-bottom:10px;margin-bottom:14px}
      .muted{color:#666}.tot td{font-weight:700;border-top:2px solid #111}pre{white-space:pre-wrap;font-family:inherit}@media print{button{display:none}}
      </style></head><body>${bodyHtml}<p><button onclick="window.print()">Imprimir / Guardar PDF</button></p></body></html>`);
    w.document.close();
  };

  // ---------- sesión y API ----------
  const saveSession = () => { try { App.session ? localStorage.setItem(SESSION_KEY, JSON.stringify(App.session)) : localStorage.removeItem(SESSION_KEY); } catch (_) {} };
  App.loadSession = () => { try { App.session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { App.session = null; } return App.session; };
  App.clearSession = () => { App.session = null; saveSession(); };

  App.authRequest = async (path, body) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, { method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || data.error_description || 'Error de autenticación');
    return { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at, user: data.user };
  };
  App.login = async (email, password) => { App.session = await App.authRequest('token?grant_type=password', { email, password }); saveSession(); };
  async function fresh() {
    if (!App.session || App.session.expires_at - 60 > Date.now() / 1000) return;
    App.session = await App.authRequest('token?grant_type=refresh_token', { refresh_token: App.session.refresh_token });
    saveSession();
  }
  App.api = async (path, opts = {}) => {
    await fresh();
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      ...opts,
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${App.session.access_token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
    if (res.status === 401) { const e = new Error('SESION'); e.code = 'SESION'; throw e; }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const e = new Error(body.message || res.statusText); e.code = body.code; throw e;
    }
    if (res.status === 204) return null;
    return res.json().catch(() => null);
  };
  App.get = (table, query = '') => App.api(`/rest/v1/${table}?${query}`);
  App.insert = async (table, obj) => (await App.api(`/rest/v1/${table}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(obj) }))[0];
  App.patch = async (table, id, obj) => {
    const out = await App.api(`/rest/v1/${table}?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(obj) });
    if (!out || !out.length) throw new Error('Sin permiso o registro inexistente');
    return out[0];
  };
  App.del = (table, id) => App.api(`/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE' });
  App.errMsg = (e) => {
    if (e.code === '23503') return 'No se puede: hay registros que dependen de este.';
    if (e.code === '23505') return 'Ya existe un registro igual.';
    if (e.code === '23514') return 'Algún dato no es válido (revisa montos, números y formatos).';
    return 'No se pudo completar la operación.';
  };
  App.guard = async (fn) => {
    try { return await fn(); }
    catch (e) {
      if (e.code === 'SESION') { App.clearSession(); App.showLogin('La sesión expiró. Entra de nuevo.'); return; }
      App.toast(App.errMsg(e));
    }
  };

  // ---------- datos compartidos (directorios y marca) ----------
  App.loadDirs = async (force) => {
    if (!force && App.cache.clientes) return;
    const [clientes, proveedores, transportistas] = await Promise.all([
      App.get('clientes', 'select=*&order=nombre.asc'),
      App.get('proveedores', 'select=*&order=nombre.asc'),
      App.get('transportistas', 'select=*&order=nombre.asc')
    ]);
    Object.assign(App.cache, { clientes, proveedores, transportistas });
  };
  App.loadBrand = async () => {
    try { App.brand = (await App.get('config_marca', 'id=eq.1&select=*'))[0] || null; } catch (_) { App.brand = null; }
    return App.brand;
  };

  // ---------- paneles y diálogos ----------
  App.openDrawer = (node) => { const p = App.$('panel'); p.replaceChildren(node); App.$('drawer').hidden = false; };
  App.closeDrawer = () => { App.$('drawer').hidden = true; App.$('panel').replaceChildren(); App.onDrawerClose && App.onDrawerClose(); };
  App.closeDialog = () => { App.$('modal').hidden = true; App.$('dialog').replaceChildren(); };
  App.openDialog = (title, node, wide) => {
    const d = App.$('dialog'); d.className = 'dialog' + (wide ? ' wide' : '');
    d.replaceChildren(el('div', { class: 'panel-head' }, el('h2', { text: title }), el('button', { class: 'btn ghost small', type: 'button', onclick: App.closeDialog, text: 'Cerrar' })), node);
    App.$('modal').hidden = false;
  };

  /* Formulario genérico. fields: [{k,label,type,options,required,hint,full,placeholder,step}] */
  App.formDialog = ({ title, fields, values = {}, submitLabel = 'Guardar', onSubmit, extraActions }) => {
    const inputs = {};
    const form = el('form', { class: 'grid2', novalidate: true });
    fields.forEach((f) => {
      let input;
      const v = values[f.k];
      if (f.type === 'textarea') input = el('textarea', { value: v ?? '', placeholder: f.placeholder });
      else if (f.type === 'select') {
        input = el('select', {}, el('option', { value: '', text: f.required ? 'Seleccionar…' : '—' }), ...f.options.map(([k, l]) => el('option', { value: k, text: l })));
        input.value = v ?? '';
      } else if (f.type === 'checks') {
        const set = new Set(v || []);
        input = el('div', { class: 'chips' }, ...f.options.map(([k, l]) => {
          const c = el('span', { class: 'chip' + (set.has(k) ? ' on' : ''), 'data-k': k, text: l, onclick: () => c.classList.toggle('on') });
          return c;
        }));
      } else if (f.type === 'bool') {
        input = el('input', { type: 'checkbox', checked: v === undefined ? true : !!v });
      } else input = el('input', { type: f.type || 'text', value: v ?? '', placeholder: f.placeholder, step: f.step, inputmode: f.type === 'number' ? 'decimal' : null });
      inputs[f.k] = input;
      if (f.type === 'bool') form.append(el('label', { class: 'check full' }, input, f.label));
      else form.append(el('div', { class: 'field' + (f.full || f.type === 'textarea' || f.type === 'checks' ? ' full' : '') }, el('label', { text: f.label + (f.required ? ' *' : '') }), input, f.hint ? el('div', { class: 'hint', text: f.hint }) : null));
    });
    const err = el('div', { class: 'msg-err full', hidden: true });
    const submit = el('button', { class: 'btn', type: 'submit', text: submitLabel });
    form.append(err, el('div', { class: 'actions full' }, submit, extraActions || null));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = {};
      for (const f of fields) {
        const i = inputs[f.k];
        let val;
        if (f.type === 'checks') val = [...i.querySelectorAll('.chip.on')].map((c) => c.dataset.k);
        else if (f.type === 'bool') val = i.checked;
        else if (f.type === 'number') val = App.num(i.value);
        else { val = i.value.trim(); if (val === '') val = null; }
        if (f.required && (val === null || (Array.isArray(val) && !val.length))) { err.textContent = `Falta: ${f.label}`; err.hidden = false; return; }
        out[f.k] = val;
      }
      submit.disabled = true; err.hidden = true;
      try { await onSubmit(out); App.closeDialog(); }
      catch (ex) {
        if (ex.code === 'SESION') { App.clearSession(); App.closeDialog(); return App.showLogin('La sesión expiró. Entra de nuevo.'); }
        err.textContent = ex.userMessage || App.errMsg(ex); err.hidden = false;
      } finally { submit.disabled = false; }
    });
    App.openDialog(title, form);
  };

  /* Arrastrar y soltar para tableros */
  App.board = ({ stages, items, cardFn, getStage, onMove }) => {
    const wrap = el('div', { class: 'board' });
    stages.forEach(([key, label]) => {
      const list = items.filter((i) => getStage(i) === key);
      const col = el('div', { class: 'col', 'data-stage': key });
      col.append(el('h4', {}, el('span', { text: label }), el('span', { text: list.length })));
      list.forEach((i) => {
        const c = cardFn(i); c.draggable = true;
        c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', i.id); e.dataTransfer.effectAllowed = 'move'; });
        col.append(c);
      });
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', () => col.classList.remove('over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault(); col.classList.remove('over');
        const id = e.dataTransfer.getData('text/plain'); const it = items.find((x) => x.id === id);
        if (it && getStage(it) !== key) onMove(it, key);
      });
      wrap.append(col);
    });
    return wrap;
  };

  /* Registro de vistas del menú */
  App.register = (id, label, view) => { App.views[id] = { label, ...view }; App.viewOrder.push(id); };
})();
