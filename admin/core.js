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
    ['transformadores', 'Transformadores'],
    ['alumbrado', 'Alumbrado público'],
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
  App.ORIGENES = [['web', 'Página web'], ['whatsapp', 'WhatsApp'], ['telefono', 'Teléfono'], ['correo', 'Correo'], ['presencial', 'Presencial'], ['otro', 'Otro']];
  App.DOC_TIPOS = [['hoja_datos', 'Hoja de datos'], ['plano', 'Plano'], ['computo', 'Cómputo métrico'], ['especificacion', 'Especificaciones'], ['oferta', 'Oferta / cotización'], ['factura', 'Factura'], ['comprobante', 'Comprobante'], ['otro', 'Otro']];
  App.DOC_DE = [['cliente', 'Del cliente'], ['proveedor', 'Del proveedor'], ['transportista', 'Del transportista'], ['interno', 'Interno']];
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
  App.fmtDay = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
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
    const [clientes, proveedores, transportistas, productos] = await Promise.all([
      App.get('clientes', 'select=*&order=nombre.asc'),
      App.get('proveedores', 'select=*&order=nombre.asc'),
      App.get('transportistas', 'select=*&order=nombre.asc'),
      App.get('productos', 'select=*&order=nombre.asc')
    ]);
    Object.assign(App.cache, { clientes, proveedores, transportistas, productos });
  };
  App.loadBrand = async () => {
    try { App.brand = (await App.get('config_marca', 'id=eq.1&select=*'))[0] || null; } catch (_) { App.brand = null; }
    return App.brand;
  };

  // ---------- paneles y diálogos ----------
  App.openDrawer = (node) => { const p = App.$('panel'); p.replaceChildren(node); App.$('drawer').hidden = false; };
  App.closeDrawer = () => { App.$('drawer').hidden = true; App.$('panel').replaceChildren(); App.onDrawerClose && App.onDrawerClose(); };
  // Dos niveles de diálogo: el segundo (second = true) se abre encima del primero
  const dlg = (second) => [App.$(second === true ? 'modal2' : 'modal'), App.$(second === true ? 'dialog2' : 'dialog')];
  App.closeDialog = (second) => { const [m, d] = dlg(second); m.hidden = true; d.replaceChildren(); };
  App.openDialog = (title, node, wide, second) => {
    const [m, d] = dlg(second); d.className = 'dialog' + (wide ? ' wide' : '');
    d.replaceChildren(el('div', { class: 'panel-head' }, el('h2', { text: title }), el('button', { class: 'btn ghost small', type: 'button', onclick: () => App.closeDialog(second), text: 'Cerrar' })), node);
    m.hidden = false;
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

  App.safeName = (name) => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-100);

  /* ---------- Tablas (cómputos métricos): leer, importar y exportar ---------- */
  App.loadSheetLib = () => {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!App._sheet) {
      App._sheet = new Promise((res, rej) => {
        const s = el('script', { src: 'vendor/xlsx.full.min.js' });
        s.onload = () => res(window.XLSX); s.onerror = () => { App._sheet = null; rej(new Error('xlsx')); };
        document.head.append(s);
      });
    }
    return App._sheet;
  };
  App.parseDelimited = (text) => {
    const first = text.split(/\r?\n/)[0] || '';
    const delim = [['\t', first.split('\t').length], [';', first.split(';').length], [',', first.split(',').length]].sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; rows.push(row); row = []; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  };
  App.readTableFile = async (file) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (['csv', 'txt', 'tsv'].includes(ext)) return App.parseDelimited(await file.text());
    const X = await App.loadSheetLib();
    const wb = X.read(await file.arrayBuffer(), { type: 'array' });
    return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', blankrows: false }).map((r) => r.map((c) => (c === null ? '' : c)));
  };
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9#]+/g, ' ').trim();
  const HINTS = {
    codigo: ['item', 'codigo', 'cod', 'no', 'nro', 'numero', 'n', 'ref', 'referencia', '#'],
    descripcion: ['descripcion', 'concepto', 'partida', 'detalle', 'material', 'articulo', 'producto', 'nombre'],
    unidad: ['unidad', 'und', 'ud', 'um', 'u m', 'medida'], cantidad: ['cantidad', 'cant', 'qty', 'cantidad total'],
    notas: ['observaciones', 'observacion', 'notas', 'nota', 'comentarios', 'comentario']
  };
  App.guessColumns = (headerRow) => {
    const map = {}, used = new Set();
    headerRow.forEach((h, i) => { const n = norm(h); const k = Object.keys(HINTS).find((x) => !used.has(x) && HINTS[x].includes(n)); map[i] = k || ''; if (k) used.add(k); });
    return map;
  };
  App.findHeaderRow = (rows) => {
    const scan = rows.slice(0, 15).map((r) => { const g = App.guessColumns(r); return { n: Object.values(g).filter(Boolean).length, d: Object.values(g).includes('descripcion') }; });
    let i = scan.findIndex((x) => x.n >= 2 && x.d); if (i < 0) i = scan.findIndex((x) => x.d); return i < 0 ? 0 : i;
  };
  const qtyNum = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    let s = String(v ?? '').replace(/[\s ]/g, ''); if (!s) return null;
    if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, ''); else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, ''); else s = s.replace(',', '.');
    const n = Number(s); return Number.isFinite(n) ? n : null;
  };
  App.rowsToItems = (rows, map, hasHeader) => {
    const idx = (f) => Object.keys(map).find((k) => map[k] === f);
    const [ic, id, iu, iq, inn] = ['codigo', 'descripcion', 'unidad', 'cantidad', 'notas'].map(idx);
    const out = [];
    rows.slice(hasHeader ? 1 : 0).forEach((r) => {
      const desc = String(id !== undefined ? r[id] ?? '' : '').trim(); if (!desc) return;
      const prod = (App.cache.productos || []).find((p) => norm(p.nombre) === norm(desc));
      out.push({ producto_id: prod ? prod.id : null, codigo: ic !== undefined ? String(r[ic] ?? '').trim() : '', descripcion: desc.slice(0, 300),
        unidad: (iu !== undefined && String(r[iu] ?? '').trim()) || 'und', cantidad: (iq !== undefined ? qtyNum(r[iq]) : null) ?? 1, notas: inn !== undefined ? String(r[inn] ?? '').trim() : '' });
    });
    return out;
  };
  /* Diálogo: leer archivo o pegar tabla, asignar columnas y revisar antes de importar */
  App.importTableDialog = ({ file, canSaveFile, onApply }) => {
    const body = el('div');
    const err = el('div', { class: 'msg-err', hidden: true });
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    const OPTS = [['', '— ignorar —'], ['codigo', 'Ítem'], ['descripcion', 'Descripción'], ['unidad', 'Unidad'], ['cantidad', 'Cantidad'], ['notas', 'Observaciones']];
    function stepMap(allRows, fileObj) {
      const skipped = App.findHeaderRow(allRows); const rows = allRows.slice(skipped);
      const cols = Math.min(10, Math.max(...rows.slice(0, 60).map((r) => r.length)));
      const guess = App.guessColumns(rows[0] || []); const hasHead = Object.values(guess).some(Boolean);
      const header = el('input', { type: 'checkbox', checked: hasHead });
      const sels = []; const map = () => Object.fromEntries(sels.map((s, i) => [i, s.value]));
      for (let i = 0; i < cols; i++) { const s = el('select', {}, ...OPTS.map(([k, l]) => el('option', { value: k, text: l }))); s.value = guess[i] || ''; sels.push(s); }
      if (!sels.some((s) => s.value === 'descripcion')) { const firstText = sels.findIndex((_, i) => rows.slice(hasHead ? 1 : 0, 6).some((r) => isNaN(Number(r[i])) && String(r[i] ?? '').length > 3)); if (firstText >= 0 && !sels[firstText].value) sels[firstText].value = 'descripcion'; }
      const mode = el('select', {}, el('option', { value: 'append', text: 'Agregar a las partidas existentes' }), el('option', { value: 'replace', text: 'Reemplazar las partidas actuales' }));
      const save = el('input', { type: 'checkbox', checked: true }); const count = el('b');
      const upd = () => { count.textContent = App.rowsToItems(rows, map(), header.checked).length; }; [header, ...sels].forEach((x) => x.addEventListener('input', upd)); upd();
      const prev = el('div', { class: 'table-wrap', style: 'max-height:260px;overflow:auto' }, el('table', { style: 'min-width:0' },
        el('thead', {}, el('tr', {}, ...sels.map((s) => el('th', {}, s)))),
        el('tbody', {}, rows.slice(0, 8).map((r) => el('tr', {}, ...sels.map((_, i) => el('td', { text: String(r[i] ?? '').slice(0, 60) })))))));
      body.replaceChildren(el('p', { class: 'sub' }, `Se leyeron ${rows.length} filas${skipped ? ` (se omitieron ${skipped} filas de título al inicio)` : ''}. Indica qué es cada columna (se detectó automáticamente cuando fue posible). Se importarán `, count, ' partidas.'), prev,
        el('label', { class: 'check' }, header, 'La primera fila es el encabezado'), el('div', { class: 'field' }, el('label', { text: 'Qué hacer con las partidas actuales' }), mode),
        fileObj && canSaveFile ? el('label', { class: 'check' }, save, `Guardar también el archivo original (“${fileObj.name}”) en los documentos de la solicitud`) : null, err,
        el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: 'Importar partidas', onclick: () => {
          const items = App.rowsToItems(rows, map(), header.checked);
          if (!items.length) return fail('No se detectaron partidas. Verifica que una columna esté marcada como “Descripción”.');
          onApply(items, { replace: mode.value === 'replace', file: fileObj && canSaveFile && save.checked ? fileObj : null }); App.closeDialog(true); App.toast(`${items.length} partidas importadas`);
        } })));
    }
    function stepLoad() {
      const f = el('input', { type: 'file', accept: '.xlsx,.xls,.csv,.tsv,.txt' });
      const ta = el('textarea', { placeholder: 'Pega aquí la tabla copiada desde Excel (incluye la fila de encabezados)', style: 'min-height:130px' });
      f.addEventListener('change', async () => { err.hidden = true; try { const rows = await App.readTableFile(f.files[0]); rows.length ? stepMap(rows, f.files[0]) : fail('El archivo no tiene datos.'); } catch (_) { fail('No se pudo leer el archivo. Usa .xlsx, .xls o .csv.'); } });
      body.replaceChildren(el('div', { class: 'field' }, el('label', { text: 'Archivo de Excel o CSV (lista de materiales, cómputos métricos)' }), f),
        el('div', { class: 'field' }, el('label', { text: 'O pega la tabla' }), ta), err,
        el('button', { class: 'btn small', type: 'button', text: 'Leer tabla pegada', onclick: () => { err.hidden = true; const rows = App.parseDelimited(ta.value); rows.length > 1 || (rows[0] || []).length > 1 ? stepMap(rows, null) : fail('Pega una tabla con varias filas o columnas.'); } }));
    }
    App.openDialog('Importar tabla de partidas', body, true, true);
    if (file) App.readTableFile(file).then((rows) => (rows.length ? stepMap(rows, file) : (stepLoad(), fail('El archivo no tiene datos.')))).catch(() => { stepLoad(); fail('No se pudo leer ese archivo. Elige otro o pega la tabla.'); });
    else stepLoad();
  };
  /* Descarga la tabla: 'cliente' (revisar/completar) o 'proveedor' (con columnas para cotizar) */
  App.exportItems = async (items, { name, modo }) => {
    const prov = modo === 'proveedor';
    const head = prov ? ['Ítem', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario', 'Plazo de entrega (días)', 'Observaciones'] : ['Ítem', 'Descripción', 'Unidad', 'Cantidad', 'Observaciones'];
    const aoa = [head, ...items.map((i, n) => (prov ? [i.codigo || String(n + 1), i.descripcion, i.unidad, i.cantidad, '', '', i.notas || ''] : [i.codigo || String(n + 1), i.descripcion, i.unidad, i.cantidad, i.notas || '']))];
    try {
      const X = await App.loadSheetLib(); const ws = X.utils.aoa_to_sheet(aoa);
      ws['!cols'] = (prov ? [8, 58, 11, 12, 16, 22, 40] : [8, 58, 11, 12, 40]).map((wch) => ({ wch }));
      const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Materiales'); X.writeFile(wb, `${name}.xlsx`);
    } catch (_) {
      const esc = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
      App.download(`${name}.csv`, aoa.map((r) => r.map(esc).join(',')).join('\n')); App.toast('Se descargó como CSV (no se pudo generar el Excel).');
    }
  };

  /* Editor de partidas: productos del catálogo o texto libre, con importar/exportar tabla.
     opts.cotizacion_id: guarda el archivo importado como documento de esa solicitud. */
  App.itemsEditor = (initial, opts = {}) => {
    let rows = (initial || []).map((i) => ({ ...i })); const body = el('div'); const pendingFiles = [];
    const catalog = () => (App.cache.productos || []).filter((p) => p.activo);
    const draw = () => body.replaceChildren(...rows.map((it, idx) => {
      const prod = el('select', { title: 'Producto del catálogo' }, el('option', { value: '', text: 'Texto libre' }), ...catalog().map((p) => el('option', { value: p.id, text: p.nombre }))); prod.value = it.producto_id || '';
      const cod = el('input', { value: it.codigo || '', placeholder: 'Ítem', title: 'Ítem / código' });
      const desc = el('input', { value: it.descripcion || '', placeholder: 'Descripción del producto o servicio' });
      const qty = el('input', { type: 'number', min: '0', step: 'any', value: it.cantidad ?? 1, title: 'Cantidad' }); const und = el('input', { value: it.unidad || 'und', title: 'Unidad' });
      prod.addEventListener('change', () => { const p = (App.cache.productos || []).find((x) => x.id === prod.value); it.producto_id = p ? p.id : null; if (p) { it.descripcion = p.nombre; it.unidad = p.unidad; desc.value = p.nombre; und.value = p.unidad; } });
      cod.addEventListener('input', () => (it.codigo = cod.value)); desc.addEventListener('input', () => (it.descripcion = desc.value));
      qty.addEventListener('input', () => (it.cantidad = App.num(qty.value) ?? 0)); und.addEventListener('input', () => (it.unidad = und.value));
      return el('div', { class: 'itemrow' }, cod, prod, desc, qty, und, el('button', { class: 'btn ghost small', type: 'button', text: '✕', onclick: () => { rows.splice(idx, 1); draw(); } }));
    }));
    draw();
    const get = () => rows.filter((i) => (i.descripcion || '').trim()).map((i) => ({ producto_id: i.producto_id || null, codigo: (i.codigo || '').trim(), descripcion: i.descripcion.trim(), cantidad: Number(i.cantidad) || 0, unidad: (i.unidad || 'und').trim(), notas: i.notas || '' }));
    const baseName = (opts.nombre || 'partidas').replace(/[^\w-]+/g, '_');
    const apply = (items, o) => {
      rows = o.replace ? items : [...rows, ...items]; draw();
      if (o.file) {
        if (opts.cotizacion_id) App.uploadDocument(o.file, { scope: { cotizacion_id: opts.cotizacion_id }, tipo: 'computo', de: 'cliente' }).then(() => App.docsChanged()).catch(() => App.toast('No se pudo guardar el archivo original.'));
        else pendingFiles.push(o.file);
      }
    };
    const node = el('div', {}, body, el('div', { class: 'actions' },
      el('button', { class: 'btn ghost small', type: 'button', text: '+ Partida', onclick: () => { rows.push({ producto_id: null, codigo: '', descripcion: '', cantidad: 1, unidad: 'und' }); draw(); } }),
      el('button', { class: 'btn ghost small', type: 'button', text: 'Importar tabla (Excel / CSV / pegar)', onclick: () => App.importTableDialog({ canSaveFile: true, onApply: apply }) }),
      el('button', { class: 'btn ghost small', type: 'button', text: 'Descargar tabla para cotizar (Excel)', onclick: () => (get().length ? App.exportItems(get(), { name: `${baseName}-para-cotizar`, modo: 'proveedor' }) : App.toast('Agrega partidas primero')) }),
      el('a', { class: 'btn ghost small', href: '../plantilla-materiales.xlsx', download: 'plantilla-materiales.xlsx', text: 'Plantilla en blanco para el cliente' })));
    return { node, get, importFile: (file) => App.importTableDialog({ file, canSaveFile: false, onApply: apply }), pendingFiles: () => pendingFiles };
  };
  App.itemsText = (items) => (items || []).map((i) => `${i.cantidad} ${i.unidad} ${i.descripcion}`).join(', ');

  /* ---------- Documentos (hojas de datos, planos, cómputos, ofertas…) ---------- */
  App.uploadDocument = async (file, { scope, tipo, de, notas }) => {
    const key = Object.keys(scope)[0], id = scope[key];
    if (file.size > 25 * 1024 * 1024) { const e = new Error('grande'); e.userMessage = `“${file.name}” supera 25 MB`; throw e; }
    const path = `${key.replace('_id', '')}/${id}/${crypto.randomUUID()}_${App.safeName(file.name)}`;
    const enc = path.split('/').map(encodeURIComponent).join('/');
    await App.api(`/storage/v1/object/documentos/${enc}`, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    try { return await App.insert('documentos', { nombre: file.name, path, bytes: file.size, mime: file.type || null, tipo, de, notas: notas || null, [key]: id }); }
    catch (e) { try { await App.api(`/storage/v1/object/documentos/${enc}`, { method: 'DELETE' }); } catch (_) {} throw e; }
  };
  App.signDoc = async (path, seconds = 900) => {
    const s = await App.api(`/storage/v1/object/sign/documentos/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', body: JSON.stringify({ expiresIn: seconds }) });
    return `${App.SUPABASE_URL}/storage/v1${s.signedURL}`;
  };
  App.docsChanged = () => document.dispatchEvent(new Event('docs-changed'));
  /* opts.onImport(file): si se indica, las hojas de cálculo muestran el botón "Importar partidas" */
  App.docsBox = ({ title, scope, compact, onImport }) => {
    const key = Object.keys(scope)[0], id = scope[key];
    const list = el('div'); const tipo = el('select', {}, ...App.DOC_TIPOS.map(([k, l]) => el('option', { value: k, text: l }))); const de = el('select', {}, ...App.DOC_DE.map(([k, l]) => el('option', { value: k, text: l })));
    de.value = key === 'cotizacion_id' ? 'cliente' : 'proveedor';
    const note = el('input', { type: 'text', placeholder: 'Nota (opcional)', maxlength: '300' }); const file = el('input', { type: 'file', multiple: true, hidden: true }); const status = el('span', { class: 'sub' });
    async function load() {
      try {
        const docs = await App.get('documentos', `${key}=eq.${id}&select=*&order=created_at.desc`);
        const rows = await Promise.all(docs.map(async (d) => {
          let url = null; try { url = await App.signDoc(d.path); } catch (_) {}
          const isSheet = /\.(xlsx|xls|csv|tsv)$/i.test(d.nombre);
          return el('div', { class: 'doc-row' }, el('div', { class: 'grow' }, url ? el('a', { href: url, target: '_blank', rel: 'noopener', text: d.nombre }) : el('span', { text: d.nombre + ' (no disponible)' }), d.notas ? el('div', { class: 'sub', text: d.notas }) : null),
            App.badge(App.label(App.DOC_TIPOS, d.tipo), 'info'), App.badge(App.label(App.DOC_DE, d.de)), el('span', { class: 'sub', text: `${Math.max(1, Math.round((d.bytes || 0) / 1024))} KB · ${App.fmtDate(d.created_at)}` }),
            onImport && isSheet && url ? el('button', { class: 'btn ghost small', type: 'button', text: 'Importar partidas', onclick: async () => { try { const blob = await (await fetch(url)).blob(); onImport(new File([blob], d.nombre)); } catch (_) { App.toast('No se pudo abrir el archivo.'); } } }) : null,
            el('button', { class: 'btn ghost small', type: 'button', text: '✕', title: 'Eliminar', onclick: () => confirm(`¿Eliminar “${d.nombre}”?`) && App.guard(async () => { await App.del('documentos', d.id); try { await App.api(`/storage/v1/object/documentos/${d.path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' }); } catch (_) {} load(); }) }));
        }));
        list.replaceChildren(...(rows.length ? rows : [el('div', { class: 'sub', text: 'Sin documentos todavía.' })]));
      } catch (e) { list.replaceChildren(el('div', { class: 'msg-err', text: 'No se pudieron cargar los documentos.' })); }
    }
    file.addEventListener('change', async () => {
      const files = [...file.files]; file.value = ''; let ok = 0;
      for (const f of files) {
        status.textContent = `Subiendo ${f.name}…`;
        try { await App.uploadDocument(f, { scope, tipo: tipo.value, de: de.value, notas: note.value.trim() }); ok++; }
        catch (e) { if (e.code === 'SESION') { App.clearSession(); return App.showLogin('La sesión expiró. Entra de nuevo.'); } App.toast(e.userMessage || `No se pudo subir “${f.name}”. Revisa el tipo de archivo (máx. 25 MB).`); }
      }
      status.textContent = ''; if (ok) { App.toast(`${ok} documento(s) adjuntado(s)`); note.value = ''; load(); }
    });
    const node = el('div', { class: compact ? '' : 'box', style: compact ? 'margin-top:.6rem;border-top:1px solid var(--line);padding-top:.5rem' : null }, title ? el('h3', { text: title }) : null, list,
      el('div', { class: 'upload-bar' }, el('button', { class: 'btn small', type: 'button', text: '+ Adjuntar archivo', onclick: () => file.click() }), tipo, de, note, file, status));
    const onChange = () => { if (node.isConnected) load(); else document.removeEventListener('docs-changed', onChange); };
    document.addEventListener('docs-changed', onChange);
    load(); return node;
  };

  /* Registro de vistas del menú */
  App.register = (id, label, view) => { App.views[id] = { label, ...view }; App.viewOrder.push(id); };
})();
