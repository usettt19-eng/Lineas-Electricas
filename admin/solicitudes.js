/* Vista: Pipeline de solicitudes + detalle (resumen, proveedores, transporte, costeo/proforma, cobros y pagos). */
(() => {
  'use strict';
  const { el } = App;

  // ---------- helpers de UI ----------
  const field = (label, input, hint) => el('div', { class: 'field' }, el('label', { text: label }), input, hint ? el('div', { class: 'hint', text: hint }) : null);
  const numInput = (v, props = {}) => el('input', { type: 'number', step: 'any', min: '0', value: v ?? '', ...props });
  const sel = (options, value, props = {}) => {
    const s = el('select', props, ...options.map((o) => el('option', { value: o[0], text: o[1] })));
    s.value = value ?? ''; return s;
  };
  const incoOpts = App.INCOTERMS.map((i) => [i, i]);
  const tipoLabel = (r, long) => (r.tipo === 'manual' ? `Manual · ${App.label(App.ORIGENES, r.origen)}` : r.tipo === 'tecnica' ? (long ? 'Especificación técnica' : 'Técnica') : long ? 'Contacto y cotización' : 'Contacto');
  const sig = () => {
    const b = App.brand || {};
    return [b.contact && b.name ? `${b.contact} — ${b.name}` : b.contact || b.name, b.phone, b.email].filter(Boolean).join('\n');
  };
  const setStage = async (D, estado) => {
    await App.patch('cotizaciones', D.r.id, { estado }); D.r.estado = estado;
  };

  // ---------- resumen y mensajes ----------
  function summaryText(r, withClient) {
    const L = []; const line = (l, v) => v && L.push(`${l}: ${v}`);
    L.push(`SOLICITUD DE COTIZACIÓN ${App.folio(r)}`); line('Fecha', App.fmtDay(r.created_at.slice(0, 10)));
    if (withClient) { L.push('', 'CLIENTE'); line('Nombre', r.nombre); line('Empresa', r.empresa); line('Correo', r.correo); line('Teléfono', r.telefono || r.contacto_info); }
    L.push('', 'ESPECIFICACIONES');
    line('Nivel de tensión', r.tension); line('Tipo de requerimiento', r.requerimiento); line('Cambio de dirección', r.cambio_direccion);
    line('Longitud aproximada', r.longitud); line('Terreno', r.terreno); line('Cantidad de estructuras', r.cant_estructuras);
    line('Ángulos horizontales', r.angulo_horizontal); line('Desnivel vertical', r.desnivel_vertical); line('Conductor', r.conductor);
    line('Entrega estimada', r.fecha_entrega ? App.fmtDay(r.fecha_entrega) : null);
    if ((r.items || []).length) L.push('', 'PARTIDAS SOLICITADAS', ...r.items.map((i, n) => `${i.codigo || n + 1}. ${i.descripcion} — ${i.cantidad} ${i.unidad}${i.notas ? ' (' + i.notas + ')' : ''}`));
    else if (r.partidas) L.push('', 'PARTIDAS SOLICITADAS', r.partidas);
    if (r.descripcion) L.push('', 'DESCRIPCIÓN', r.descripcion);
    const n = (r.archivos || []).length; if (n) L.push('', `Documentos técnicos: ${n} archivo(s), se enviarán por separado.`);
    return L.join('\n');
  }
  function suggestEsp(r) {
    const t = [r.partidas, r.descripcion, r.conductor].join(' ').toLowerCase(); const out = new Set();
    [['conductores', /acsr|aaac|acss|conductor|cable|guarda/], ['estructuras', /torre|poste|cruceta|estructura|stub|anclaje|celos/],
      ['aislamiento', /aislador|herraje|grapa|cadena|retenida|yugo/], ['proteccion', /apartarrayo|tierra|cortacircuito|seccionador|fusible|amortiguador|protecc|reconectador/],
      ['opgw', /opgw|fibra/], ['tendido', /tendido|accesorios/],
      ['transformadores', /transformador|pad.?mounted|pedestal|subestaci|\bkva\b|\bmva\b/], ['alumbrado', /alumbrado|luminaria|\bled\b|fotocelda|proyector|farol/]].forEach(([k, re]) => re.test(t) && out.add(k));
    return out;
  }
  const shareText = (share) => (share && share.docs.length ? `\n\nDocumentos técnicos (enlaces de descarga válidos hasta el ${share.until}):\n${share.docs.map((d) => `• ${d.nombre}: ${d.url}`).join('\n')}` : '');
  const provMessage = (r, p, share) =>
    `Estimados ${p ? p.contacto || p.nombre : 'proveedores'}:\n\nSolicitamos cotización para el siguiente suministro:\n\n${summaryText(r, false)}${shareText(share)}\n\nFavor indicar: precio unitario y total, Incoterm (EXW/FOB y puerto de embarque), plazo de entrega, condiciones de pago, validez de la oferta y fichas técnicas.\n\nSaludos cordiales,\n${sig()}`;
  function fleteMessage(r, t, f) {
    const L = [`Estimados ${t ? t.contacto || t.nombre : 'transportistas'}:`, '', `Solicitamos cotización de flete para el siguiente embarque (ref. ${App.folio(r)}):`, ''];
    const line = (l, v) => v !== null && v !== undefined && v !== '' && L.push(`• ${l}: ${v}`);
    line('Modalidad', App.label(App.MODALIDADES, f.modalidad)); line('Origen', f.origen); line('Destino', f.destino);
    line('Peso aproximado', f.peso_kg ? `${f.peso_kg} kg` : null); line('Volumen', f.volumen_m3 ? `${f.volumen_m3} m³` : null); line('Bultos', f.bultos); line('Embalaje', f.embalaje);
    line('Valor de la mercancía (FOB)', f.valor_fob_usd ? App.money(f.valor_fob_usd) : null);
    line('Carga', `Materiales para línea eléctrica de ${r.tension}${r.partidas ? ' — ' + r.partidas : ''}`);
    L.push('', `Favor cotizar de forma desglosada para condiciones ${f.incoterm || 'FOB'} y CIF: flete, seguro, gastos en origen, gastos en destino, tiempo de tránsito y validez de la oferta.`, '', 'Saludos cordiales,', sig());
    return L.join('\n');
  }
  async function signedLinks(archivos, into, onImport) {
    for (const f of archivos || []) {
      // Los datos de adjuntos vienen del formulario público (no son confiables): se valida la ruta antes de firmar nada
      if (!f || typeof f.path !== 'string' || !/^[0-9a-f-]{36}\/\d{1,2}_[A-Za-z0-9._-]{1,100}$/.test(f.path)) { into.append(el('div', { text: `${String((f && f.nombre) || 'archivo').slice(0, 80)} (ruta no válida)` })); continue; }
      try {
        const s = await App.api(`/storage/v1/object/sign/adjuntos/${f.path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', body: JSON.stringify({ expiresIn: 600 }) });
        // &download= fuerza la descarga (el navegador nunca los muestra ni ejecuta dentro del panel)
        const url = `${App.SUPABASE_URL}/storage/v1${s.signedURL}&download=${encodeURIComponent(String(f.nombre || 'archivo').slice(0, 100))}`;
        into.append(el('div', { class: 'doc-row' }, el('a', { href: url, target: '_blank', rel: 'noopener', text: `${String(f.nombre || 'archivo').slice(0, 100)} (${Math.max(1, Math.round((Number(f.bytes) || 0) / 1024))} KB)` }),
          onImport && /\.(xlsx|xls|csv)$/i.test(f.nombre) ? el('button', { class: 'btn ghost small', type: 'button', text: 'Importar partidas', onclick: async () => { try { onImport(new File([await (await fetch(url)).blob()], f.nombre)); } catch (_) { App.toast('No se pudo abrir el archivo.'); } } }) : null));
      } catch (_) { into.append(el('div', { text: `${f.nombre} (no disponible)` })); }
    }
  }

  // ---------- cálculos ----------
  const unitPrice = (i) => App.r2((Number(i.costo_unit) || 0) * (1 + (Number(i.utilidad_pct) || 0) / 100));
  const lineTotal = (i) => App.r2((Number(i.cantidad) || 0) * unitPrice(i));
  function pfCalc(items, itbmsPct) {
    const costo = App.r2(items.reduce((s, i) => s + (Number(i.cantidad) || 0) * (Number(i.costo_unit) || 0), 0));
    const subtotal = App.r2(items.reduce((s, i) => s + lineTotal(i), 0));
    const itbms = App.r2((subtotal * (Number(itbmsPct) || 0)) / 100);
    const utilidad = App.r2(subtotal - costo);
    return { costo, subtotal, itbms, total: App.r2(subtotal + itbms), utilidad, margen: subtotal ? (utilidad / subtotal) * 100 : 0, markup: costo ? (utilidad / costo) * 100 : 0 };
  }
  const fleteCalc = (f) => {
    const fob = App.r2((Number(f.valor_fob_usd) || 0) + (Number(f.gastos_origen_usd) || 0));
    const cfr = App.r2(fob + (Number(f.flete_usd) || 0));
    const cif = App.r2(cfr + (Number(f.seguro_usd) || 0));
    return { fob, cfr, cif, destino: App.r2(cif + (Number(f.gastos_destino_usd) || 0)) };
  };
  // Qué NO cubre el proveedor según su Incoterm (lo que tendrías que pagar tú) y hasta dónde llega TU venta
  const BUY_PAYS = { EXW: ['origen', 'flete', 'seguro', 'destino', 'local', 'aduana', 'arancel'], FOB: ['flete', 'seguro', 'destino', 'local', 'aduana', 'arancel'], CFR: ['seguro', 'destino', 'local', 'aduana', 'arancel'], CIF: ['destino', 'local', 'aduana', 'arancel'], DAP: ['aduana', 'arancel'], DDP: [] };
  const SALE_COVERS = { EXW: [], FOB: ['origen'], CFR: ['origen', 'flete'], CIF: ['origen', 'flete', 'seguro'], DAP: ['origen', 'flete', 'seguro', 'destino', 'local'], DDP: ['origen', 'flete', 'seguro', 'destino', 'local', 'aduana', 'arancel'] };
  const INCO_NAMES = { EXW: 'EXW — En fábrica', FOB: 'FOB — Libre a bordo', CFR: 'CFR — Costo y flete', CIF: 'CIF — Costo, seguro y flete', DAP: 'DAP — Entregado en lugar', DDP: 'DDP — Entregado, derechos pagados' };
  const INCO_LIST = Object.entries(INCO_NAMES);
  const ofertaUsd = (x) => App.r2((Number(x.precio_total) || 0) * (Number(x.tipo_cambio) || 1));
  const ACEPTADAS = ['aceptada', 'ordenada', 'entregada'];
  const creditoItbms = (D) => App.r2(D.rfqs.filter((x) => ACEPTADAS.includes(x.estado) && x.precio_total).reduce((sum, x) => sum + (ofertaUsd(x) * (Number(x.itbms_pct) || 0)) / 100, 0));
  /* Costo puesto = precio del proveedor + lo que él no cubre y tú sí debes cubrir hasta donde llega tu venta. */
  function landedCalc(items, c) {
    const buy = BUY_PAYS[c.incoterm_compra] || BUY_PAYS.FOB, cover = SALE_COVERS[c.incoterm_venta] || SALE_COVERS.CIF;
    const pays = new Set(buy.filter((k) => cover.includes(k)));
    const valor = App.r2(items.reduce((sum, i) => sum + (Number(i.cantidad) || 0) * (Number(i.precio_prov) || 0), 0));
    const val = (k) => (pays.has(k) ? Number(c[k]) || 0 : 0);
    const origen = val('origen'), flete = val('flete');
    const seguro = pays.has('seguro') ? App.r2(((valor + origen + flete) * (Number(c.seguro_pct) || 0)) / 100) : 0;
    const aduanero = App.r2(valor + origen + flete + seguro);
    const arancel = pays.has('arancel') ? App.r2((aduanero * (Number(c.arancel_pct) || 0)) / 100) : 0;
    const destino = val('destino'), aduana = val('aduana'), local = val('local'), otros = Number(c.otros) || 0;
    const extras = App.r2(origen + flete + seguro + arancel + destino + aduana + local + otros);
    return { pays, valor, origen, flete, seguro, aduanero, arancel, destino, aduana, local, otros, extras, total: App.r2(valor + extras), k: valor ? (valor + extras) / valor : 1,
      warn: ['CFR', 'CIF'].includes(c.incoterm_compra) && ['EXW', 'FOB'].includes(c.incoterm_venta) };
  }
  const fleteCost = (f) => App.r2((Number(f.flete_usd) || 0) + (Number(f.seguro_usd) || 0) + (Number(f.gastos_origen_usd) || 0) + (Number(f.gastos_destino_usd) || 0));

  // ============ VISTA PIPELINE ============
  const S = { rows: [], view: 'tablero' };

  App.register('solicitudes', 'Pipeline', {
    async render(main) {
      const q = el('input', { class: 'grow', type: 'search', placeholder: 'Buscar por cliente, empresa, correo, folio…' });
      const fTipo = sel([['', 'Todos los tipos'], ['tecnica', 'Técnica'], ['contacto', 'Contacto'], ['manual', 'Manual']], '');
      const fEtapa = sel([['', 'Todas las etapas'], ...App.SOL_ETAPAS], '');
      const seg = el('div', { class: 'seg' }, el('button', { type: 'button', 'data-v': 'tablero', text: 'Tablero' }), el('button', { type: 'button', 'data-v': 'lista', text: 'Lista' }));
      const stats = el('div', { class: 'stats' }); const body = el('div');
      main.replaceChildren(stats, el('div', { class: 'toolbar' }, el('button', { class: 'btn', type: 'button', text: '+ Nueva solicitud', onclick: () => App.nuevaSolicitud() }), seg, q, fTipo, fEtapa, el('button', { class: 'btn ghost', type: 'button', text: 'Exportar CSV', onclick: exportCsv })), body);

      const filtered = () => {
        const t = q.value.trim().toLowerCase();
        return S.rows.filter((r) => (!fTipo.value || r.tipo === fTipo.value) && (!fEtapa.value || r.estado === fEtapa.value) &&
          (!t || [r.nombre, r.empresa, r.correo, r.telefono, r.contacto_info, r.descripcion, r.partidas, App.folio(r), r.clientes && r.clientes.nombre].some((v) => (v || '').toLowerCase().includes(t))));
      };
      function exportCsv() {
        const rows = filtered().map((r) => ({ folio: App.folio(r), ...r }));
        App.download('solicitudes.csv', App.csv(['folio', 'created_at', 'estado', 'tipo', 'nombre', 'empresa', 'correo', 'telefono', 'contacto_info', 'tension', 'requerimiento', 'cambio_direccion', 'longitud', 'terreno', 'cant_estructuras', 'conductor', 'fecha_entrega', 'partidas', 'descripcion', 'notas'], rows));
      }
      const card = (r) => el('div', { class: 'card', onclick: () => App.openSolicitud(r.id) },
        el('b', { text: r.nombre }), r.empresa ? el('div', { class: 'meta', text: r.empresa }) : null,
        el('div', { class: 'meta', text: `${r.tension} · ${tipoLabel(r)}` }),
        el('div', { class: 'meta', text: `${App.folio(r)} · ${App.fmtDate(r.created_at)}` }),
        r.clientes ? App.badge('Cliente: ' + r.clientes.nombre, 'info') : null, (r.archivos || []).length ? App.badge('📎 ' + r.archivos.length) : null, (r.items || []).length ? App.badge(r.items.length + ' partidas') : null);

      function draw() {
        const all = S.rows, n = (...e) => all.filter((r) => e.includes(r.estado)).length;
        stats.replaceChildren(
          ...[['Total', all.length, ''], ['Nuevas (sin atender)', n('nueva'), n('nueva') ? 'neg' : ''], ['En proceso', n('en_revision', 'cotizando', 'proforma_enviada', 'negociacion'), ''],
            ['Ganadas / en ejecución', n('ganada', 'en_compra', 'en_transito', 'entregada'), 'pos'], ['Perdidas', n('perdida'), '']]
            .map(([l, v, k]) => el('div', { class: 'stat ' + k }, el('b', { text: v }), el('span', { text: l }))));
        [...seg.children].forEach((b) => b.classList.toggle('active', b.dataset.v === S.view));
        const rows = filtered();
        if (S.view === 'tablero') {
          body.replaceChildren(App.board({
            stages: App.SOL_ETAPAS, items: rows, getStage: (r) => r.estado, cardFn: card,
            onMove: (r, estado) => App.guard(async () => { await App.patch('cotizaciones', r.id, { estado }); r.estado = estado; draw(); App.toast(`Movida a “${App.label(App.SOL_ETAPAS, estado)}”`); })
          }));
        } else if (!rows.length) body.replaceChildren(el('div', { class: 'empty', text: 'No hay solicitudes con ese filtro.' }));
        else body.replaceChildren(el('div', { class: 'table-wrap' }, el('table', {},
          el('thead', {}, el('tr', {}, ...['Fecha', 'Folio', 'Cliente', 'Tipo', 'Tensión', 'Archivos', 'Etapa'].map((h) => el('th', { text: h })))),
          el('tbody', {}, rows.map((r) => el('tr', { class: 'click', onclick: () => App.openSolicitud(r.id) },
            el('td', { text: App.fmtDate(r.created_at) }), el('td', { text: App.folio(r) }), el('td', {}, el('b', { text: r.nombre }), r.empresa ? el('div', { class: 'sub', text: r.empresa }) : null),
            el('td', { text: tipoLabel(r) }), el('td', { text: r.tension }), el('td', { text: (r.archivos || []).length || '—' }), el('td', {}, App.stageBadge(r.estado))))))));
      }
      seg.addEventListener('click', (e) => { const v = e.target.dataset && e.target.dataset.v; if (v) { S.view = v; draw(); } });
      [q, fTipo, fEtapa].forEach((x) => x.addEventListener('input', draw));
      await App.guard(async () => {
        S.rows = await App.get('cotizaciones', 'select=*,clientes(nombre)&order=created_at.desc&limit=1000'); draw();
      });
    }
  });

  // ============ NUEVA SOLICITUD (manual) ============
  App.nuevaSolicitud = async () => {
    await App.guard(async () => {
      await App.loadDirs();
      const ed = App.itemsEditor([], { nombre: 'solicitud' }); const f = {};
      const mk = (k, label, node, full) => { f[k] = node; return el('div', { class: 'field' + (full ? ' full' : '') }, el('label', { text: label }), node); };
      const cliSel = sel([['', 'Cliente nuevo / sin vincular'], ...App.cache.clientes.filter((c) => c.activo).map((c) => [c.id, c.nombre + (c.empresa ? ' · ' + c.empresa : '')])], '');
      const err = el('div', { class: 'msg-err full', hidden: true });
      const form = el('form', { class: 'grid2', novalidate: true },
        mk('origen', 'Origen de la solicitud', sel(App.ORIGENES.filter((o) => o[0] !== 'web'), 'whatsapp')), el('div', { class: 'field' }, el('label', { text: 'Cliente existente' }), cliSel),
        mk('nombre', 'Nombre de contacto *', el('input', {})), mk('empresa', 'Empresa', el('input', {})), mk('correo', 'Correo', el('input', { type: 'email' })), mk('telefono', 'Teléfono / WhatsApp', el('input', {})),
        mk('tension', 'Nivel de tensión', sel([['13.8 kV', '13.8 kV'], ['34.5 kV', '34.5 kV'], ['115 kV', '115 kV'], ['230 kV', '230 kV'], ['Por definir', 'Por definir']], 'Por definir')),
        mk('requerimiento', 'Tipo de requerimiento', sel([['', '—'], ['Línea nueva', 'Línea nueva'], ['Ampliación', 'Ampliación'], ['Mantenimiento', 'Mantenimiento'], ['Emergencia', 'Emergencia']], '')),
        mk('cambio_direccion', 'Cambio de dirección', sel([['', '—'], ['Horizontal', 'Horizontal'], ['Vertical', 'Vertical'], ['Ambos', 'Ambos (Horizontal y Vertical)']], '')), mk('fecha_entrega', 'Entrega estimada', el('input', { type: 'date' })),
        mk('origen_mercancia', 'Origen de la mercancía', sel(App.ORIGENES_MERC, 'exterior')), mk('pais_destino', 'País de destino de la venta', el('input', { value: 'Venezuela' })),
        mk('descripcion', 'Descripción / alcance', el('textarea', {}), true),
        el('div', { class: 'full' }, el('h3', { text: 'Partidas (tabla de materiales)' }), el('p', { class: 'sub', text: 'Elige productos del catálogo, escribe líneas libres o importa la tabla que envió el cliente. Los planos y especificaciones los adjuntas al crear la solicitud.' }), ed.node), err,
        el('div', { class: 'actions full' }, el('button', { class: 'btn', type: 'submit', text: 'Crear solicitud' })));
      cliSel.addEventListener('change', () => {
        const c = App.cache.clientes.find((x) => x.id === cliSel.value); if (!c) return;
        [['nombre', c.nombre], ['empresa', c.empresa], ['correo', c.correo], ['telefono', c.telefono]].forEach(([k, v]) => { if (!f[k].value.trim() && v) f[k].value = v; });
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault(); err.hidden = true;
        const v = (k) => f[k].value.trim() || null; const nombre = v('nombre');
        if (!nombre || nombre.length < 2) { err.textContent = 'Indica el nombre de contacto.'; err.hidden = false; return; }
        const items = ed.get();
        App.guard(async () => {
          const row = await App.insert('cotizaciones', { tipo: 'manual', origen: f.origen.value, estado: 'nueva', nombre, empresa: v('empresa'), correo: v('correo'), telefono: v('telefono'), tension: f.tension.value, requerimiento: v('requerimiento'),
            cambio_direccion: v('cambio_direccion'), descripcion: v('descripcion'), fecha_entrega: v('fecha_entrega'), items, partidas: App.itemsText(items) || null, cliente_id: cliSel.value || null, origen_mercancia: f.origen_mercancia.value, pais_destino: v('pais_destino') || 'Venezuela' });
          for (const file of ed.pendingFiles()) { try { await App.uploadDocument(file, { scope: { cotizacion_id: row.id }, tipo: 'computo', de: 'cliente' }); } catch (_) { App.toast('No se pudo guardar el archivo original.'); } }
          App.closeDialog(); App.toast('Solicitud creada: ' + App.folio(row)); App.views.solicitudes.render(App.$('main')); App.openSolicitud(row.id, 'resumen');
        });
      });
      App.openDialog('Nueva solicitud (manual)', form, true);
    });
  };

  // ============ DETALLE ============
  App.openSolicitud = async (id, tab) => {
    await App.guard(async () => {
      await App.loadDirs(); if (!App.brand) await App.loadBrand();
      const rr = await App.get('cotizaciones', `id=eq.${id}&select=*,clientes(nombre)`); const r = rr[0]; if (!r) return App.toast('Solicitud no encontrada');
      const D = { r, tab: tab || 'resumen', espSel: suggestEsp(r), provChecked: new Set(), showAllProv: false, modSel: null, pf: null, includeClient: false };
      await reloadDetail(D, true); renderDetail(D);
    });
  };

  async function reloadDetail(D, first) {
    const id = D.r.id;
    const [rfqs, fletes, proformas, movs] = await Promise.all([
      App.get('rfq_proveedor', `cotizacion_id=eq.${id}&select=*&order=created_at.asc`), App.get('cotizaciones_flete', `cotizacion_id=eq.${id}&select=*&order=created_at.asc`),
      App.get('proformas', `cotizacion_id=eq.${id}&select=*&order=created_at.desc`), App.get('movimientos', `cotizacion_id=eq.${id}&select=*&order=fecha.desc`)
    ]);
    Object.assign(D, { rfqs, fletes, proformas, movs });
    if (first) {
      const best = rfqs.filter((x) => ['aceptada', 'ordenada', 'entregada'].includes(x.estado) && x.moneda === 'USD' && x.precio_total)[0];
      D.flete = { modalidad: 'maritimo', incoterm: 'FOB', origen: '', destino: 'Panamá', peso_kg: null, volumen_m3: null, bultos: null, valor_fob_usd: best ? Number(best.precio_total) : null };
      D.modSel = 'maritimo';
    }
    if (D.pf && D.pf.id) D.pf = proformas.find((p) => p.id === D.pf.id) || null;
  }
  const refresh = async (D) => App.guard(async () => { await reloadDetail(D); renderDetail(D); });

  function renderDetail(D) {
    const r = D.r; const top = App.$('panel').scrollTop;
    const tabs = [['resumen', 'Resumen'], ['proveedores', `Proveedores (${D.rfqs.length})`], ['transporte', `Transporte (${D.fletes.length})`], ['costeo', 'Costeo y proforma'], ['cobros', 'Cobros y pagos']];
    const stage = sel(App.SOL_ETAPAS, r.estado);
    stage.addEventListener('change', () => App.guard(async () => { await setStage(D, stage.value); App.toast('Etapa actualizada'); renderDetail(D); }));
    const body = { resumen: tabResumen, proveedores: tabProveedores, transporte: tabTransporte, costeo: tabCosteo, cobros: tabCobros }[D.tab](D);
    App.openDrawer(el('div', {},
      el('div', { class: 'panel-head' }, el('div', {}, el('h2', { text: r.nombre + (r.empresa ? ' · ' + r.empresa : '') }), el('div', { class: 'sub', text: `${App.folio(r)} · ${App.fmtDate(r.created_at)} · ${tipoLabel(r, true)} · ${App.label(App.ORIGENES_MERC, r.origen_mercancia)} → ${r.pais_destino || 'Venezuela'}` })),
        el('div', { class: 'actions' }, stage, el('button', { class: 'btn ghost small', type: 'button', text: 'Cerrar', onclick: App.closeDrawer }))),
      el('div', { class: 'subtabs' }, tabs.map(([k, l]) => el('button', { type: 'button', class: D.tab === k ? 'active' : '', text: l, onclick: () => { D.tab = k; renderDetail(D); } }))), body));
    App.$('panel').scrollTop = top;
  }

  // ---------- Pestaña: Resumen ----------
  function tabResumen(D) {
    const r = D.r; const dl = el('dl');
    [['Correo', r.correo], ['Teléfono', r.telefono], ['Contacto', r.contacto_info], ['Nivel de tensión', r.tension], ['Requerimiento', r.requerimiento], ['Cambio de dirección', r.cambio_direccion],
      ['Longitud', r.longitud], ['Terreno', r.terreno], ['Estructuras', r.cant_estructuras], ['Ángulo horizontal', r.angulo_horizontal], ['Desnivel vertical', r.desnivel_vertical],
      ['Conductor', r.conductor], ['Entrega estimada', r.fecha_entrega && App.fmtDay(r.fecha_entrega)], ['Partidas', r.partidas], ['Descripción', r.descripcion]]
      .forEach(([l, v]) => v && dl.append(el('dt', { text: l }), el('dd', { text: v })));
    const phone = App.digits(r.telefono || r.contacto_info);
    const mail = r.correo || ((r.contacto_info || '').match(/[^\s/]+@[^\s/]+\.[^\s/]+/) || [])[0];

    // Cliente vinculado
    const cli = el('div', { class: 'box' }, el('h3', { text: 'Cliente' }));
    const link = (clienteId) => App.guard(async () => {
      await App.patch('cotizaciones', D.r.id, { cliente_id: clienteId });
      const c = App.cache.clientes.find((x) => x.id === clienteId); D.r.cliente_id = clienteId; D.r.clientes = c ? { nombre: c.nombre } : null; renderDetail(D);
    });
    if (r.cliente_id) {
      cli.append(el('div', {}, el('a', { href: '#', text: r.clientes ? r.clientes.nombre : 'Ver cliente', onclick: (e) => { e.preventDefault(); App.closeDrawer(); App.openCliente(r.cliente_id); } })),
        el('div', { class: 'actions' }, el('button', { class: 'btn ghost small', type: 'button', text: 'Desvincular', onclick: () => link(null) })));
    } else {
      const match = mail && App.cache.clientes.find((c) => (c.correo || '').toLowerCase() === mail.toLowerCase());
      const pick = sel([['', 'Elegir cliente existente…'], ...App.cache.clientes.map((c) => [c.id, c.nombre + (c.empresa ? ' · ' + c.empresa : '')])], '');
      cli.append(match ? el('div', { class: 'actions' }, el('span', { text: `Posible coincidencia por correo: ${match.nombre}` }), el('button', { class: 'btn small', type: 'button', text: 'Vincular', onclick: () => link(match.id) })) : null,
        el('div', { class: 'actions' },
          el('button', { class: 'btn small', type: 'button', text: '+ Crear cliente con estos datos', onclick: () => App.clienteForm({ nombre: r.nombre, empresa: r.empresa, correo: mail, telefono: r.telefono || r.contacto_info, activo: true }, (c) => link(c.id)) }),
          pick, el('button', { class: 'btn ghost small', type: 'button', text: 'Vincular', onclick: () => pick.value && link(pick.value) })));
    }

    // Resumen para proveedores
    const ta = el('textarea', { class: 'mono' }); const inc = el('input', { type: 'checkbox', checked: D.includeClient });
    const fill = () => { ta.value = summaryText(r, inc.checked); }; inc.addEventListener('change', () => { D.includeClient = inc.checked; fill(); }); fill();
    const resumen = el('div', { class: 'box' }, el('h3', { text: 'Resumen de lo solicitado (para pasar a proveedores)' }),
      el('label', { class: 'check' }, inc, 'Incluir datos del cliente (por defecto NO se comparte la identidad del cliente con terceros)'), ta,
      el('div', { class: 'actions' }, el('button', { class: 'btn small', type: 'button', text: 'Copiar', onclick: () => App.copy(ta.value) }),
        el('button', { class: 'btn ghost small', type: 'button', text: 'Imprimir / PDF', onclick: () => App.printHtml(App.folio(r), `<h1>${App.esc(App.folio(r))}</h1><pre>${App.esc(ta.value)}</pre>`) })));

    const origSel = sel(App.ORIGENES_MERC, r.origen_mercancia || 'exterior'), paisIn = el('input', { value: r.pais_destino || 'Venezuela', maxlength: '60' });
    const operBox = el('div', { class: 'box' }, el('h3', { text: 'Operación' }),
      el('p', { class: 'sub', text: 'De dónde viene la mercancía y a dónde se vende. Define qué costos aplican en el costeo y qué documentos se exigen en el expediente. Todas las ventas son de exportación (ITBMS 0 %).' }),
      el('div', { class: 'grid2' }, field('Origen de la mercancía', origSel, 'Panamá y Zona Libre: la compra se hace dentro del país'), field('País de destino de la venta', paisIn)),
      el('div', { class: 'actions' }, el('button', { class: 'btn small', type: 'button', text: 'Guardar operación', onclick: () => App.guard(async () => {
        const b = { origen_mercancia: origSel.value, pais_destino: paisIn.value.trim() || 'Venezuela' }; await App.patch('cotizaciones', r.id, b); Object.assign(r, b); App.toast('Operación guardada'); renderDetail(D);
      }) })));
    const ed = App.itemsEditor(r.items, { cotizacion_id: r.id, nombre: App.folio(r) });
    const partidasBox = el('div', { class: 'box' }, el('h3', { text: 'Partidas solicitadas (tabla de materiales / cómputos métricos)' }),
      el('p', { class: 'sub', text: 'Es la tabla que se trabaja y se pasa a los proveedores: impórtala del Excel del cliente, edítala aquí y descárgala para enviarla a cotizar.' }), ed.node,
      el('div', { class: 'actions' }, el('button', { class: 'btn small', type: 'button', text: 'Guardar partidas', onclick: () => App.guard(async () => {
        const items = ed.get(); await App.patch('cotizaciones', r.id, { items, partidas: App.itemsText(items) || r.partidas || null });
        r.items = items; if (items.length) r.partidas = App.itemsText(items); App.toast('Partidas guardadas'); renderDetail(D);
      }) })));
    const docsNode = App.docsBox({ title: 'Documentos de esta solicitud (planos, especificaciones, cómputos métricos, hojas de datos)', scope: { cotizacion_id: r.id }, onImport: (file) => ed.importFile(file) });
    const askTable = (via) => {
      const text = `Hola ${r.nombre}, para cotizar con precisión necesitamos la lista de materiales o cómputos métricos en Excel (columnas: Ítem, Descripción, Unidad, Cantidad). Puede usar esta plantilla: ${location.origin}/plantilla-materiales.xlsx\n\nSi tiene planos, especificaciones técnicas u hojas de datos, envíelos también por este medio.\n\n${sig()}`;
      App.openLink(via === 'wa' ? App.waLink(phone, text) : App.mailLink(mail, `Lista de materiales para su cotización ${App.folio(r)}`, text));
    };
    const notas = el('textarea', { placeholder: 'Notas internas (no las ve el cliente)', value: r.notas || '' });
    const files = el('div'); signedLinks(r.archivos, files, (file) => ed.importFile(file));
    return el('div', {},
      el('div', { class: 'box' }, dl, el('div', { class: 'actions' },
        phone.length >= 7 && el('a', { class: 'btn wa small', target: '_blank', rel: 'noopener', href: App.waLink(phone, `Hola ${r.nombre}, recibimos su solicitud de cotización de línea ${r.tension}. `), text: 'WhatsApp' }),
        mail && el('a', { class: 'btn mail small', href: `mailto:${mail}?subject=${encodeURIComponent('Su solicitud de cotización ' + r.tension)}`, text: 'Correo' }),
        phone.length >= 7 && el('a', { class: 'btn ghost small', href: `tel:+${phone}`, text: 'Llamar' }),
        phone.length >= 7 && el('button', { class: 'btn wa small', type: 'button', text: 'Pedir tabla de materiales (WhatsApp)', onclick: () => askTable('wa') }),
        mail && el('button', { class: 'btn mail small', type: 'button', text: 'Pedir tabla (correo)', onclick: () => askTable('mail') }))),
      cli, operBox, partidasBox, docsNode, resumen,
      el('div', { class: 'box' }, el('h3', { text: 'Notas internas' }), notas, el('div', { class: 'actions' }, el('button', { class: 'btn small', type: 'button', text: 'Guardar notas', onclick: () => App.guard(async () => { await App.patch('cotizaciones', r.id, { notas: notas.value.trim() || null }); r.notas = notas.value.trim() || null; App.toast('Notas guardadas'); }) }))),
      (r.archivos || []).length ? el('div', { class: 'box' }, el('h3', { text: 'Archivos adjuntos' }), files) : null);
  }

  // ---------- Pestaña: Proveedores ----------
  async function registerRfq(D, p, via) {
    if (D.rfqs.some((x) => x.proveedor_id === p.id)) return;
    await App.guard(async () => {
      D.rfqs.push(await App.insert('rfq_proveedor', { cotizacion_id: D.r.id, proveedor_id: p.id, via }));
      if (['nueva', 'en_revision'].includes(D.r.estado)) await setStage(D, 'cotizando');
      renderDetail(D);
    });
  }
  function tabProveedores(D) {
    const r = D.r;
    const chips = el('div', { class: 'chips' }, App.ESPECIALIDADES.map(([k, l]) => el('span', { class: 'chip' + (D.espSel.has(k) ? ' on' : ''), text: l, onclick: (e) => { D.espSel.has(k) ? D.espSel.delete(k) : D.espSel.add(k); e.target.classList.toggle('on'); drawList(); } })));
    const all = el('input', { type: 'checkbox', checked: D.showAllProv }); all.addEventListener('change', () => { D.showAllProv = all.checked; drawList(); });
    const list = el('div'); const bulk = el('div', { class: 'actions' });
    function drawList() {
      const cands = App.cache.proveedores.filter((p) => p.activo && (D.showAllProv || D.espSel.size === 0 || (p.especialidades || []).some((e) => D.espSel.has(e))));
      if (!cands.length) { list.replaceChildren(el('div', { class: 'empty', text: App.cache.proveedores.length ? 'Ningún proveedor activo coincide con esas especialidades.' : 'Aún no hay proveedores. Agrégalos en la pestaña “Proveedores” del menú.' })); }
      else list.replaceChildren(...cands.map((p) => {
        const sent = D.rfqs.find((x) => x.proveedor_id === p.id); const msg = () => provMessage(r, p, D.share);
        const chk = el('input', { type: 'checkbox', checked: D.provChecked.has(p.id) }); chk.addEventListener('change', () => { chk.checked ? D.provChecked.add(p.id) : D.provChecked.delete(p.id); });
        return el('div', { class: 'row-card' }, el('div', { class: 'head' }, el('label', { class: 'check' }, chk, el('b', { text: p.nombre })), sent ? App.stageBadge(sent.estado) : App.badge('sin enviar')),
          el('div', { class: 'sub', text: [p.contacto, p.pais].filter(Boolean).join(' · ') }), el('div', {}, (p.especialidades || []).map((k) => App.badge(App.label(App.ESPECIALIDADES, k)))),
          el('div', { class: 'actions' },
            p.whatsapp && el('button', { class: 'btn wa small', type: 'button', text: 'WhatsApp', onclick: () => { App.openLink(App.waLink(p.whatsapp, msg())); registerRfq(D, p, 'whatsapp'); } }),
            p.correo && el('button', { class: 'btn mail small', type: 'button', text: 'Correo', onclick: () => { App.openLink(App.mailLink(p.correo, `Solicitud de cotización ${App.folio(r)} — ${r.tension}`, msg())); registerRfq(D, p, 'correo'); } }),
            el('button', { class: 'btn ghost small', type: 'button', text: 'Copiar mensaje', onclick: () => App.copy(msg()) }),
            !sent && el('button', { class: 'btn ghost small', type: 'button', text: 'Marcar como enviada', onclick: () => registerRfq(D, p, 'manual') })));
      }));
      bulk.replaceChildren(el('button', { class: 'btn mail small', type: 'button', text: 'Correo a seleccionados (CCO)', onclick: () => {
        const ps = App.cache.proveedores.filter((p) => D.provChecked.has(p.id) && p.correo); if (!ps.length) return App.toast('Marca proveedores con correo');
        App.openLink(App.mailLink('', `Solicitud de cotización ${App.folio(r)} — ${r.tension}`, provMessage(r, null, D.share), ps.map((p) => p.correo).join(',')));
        ps.forEach((p) => registerRfq(D, p, 'correo'));
      } }), el('button', { class: 'btn ghost small', type: 'button', text: 'Copiar mensaje general', onclick: () => App.copy(provMessage(r, null, D.share)) }));
    }
    drawList();

    // Documentos del cliente para compartir con proveedores (enlaces temporales)
    const shareBox = el('div', { class: 'box' }, el('h3', { text: 'Documentos y tabla para los proveedores' }), el('div', { class: 'sub', text: 'Cargando documentos…' }));
    App.get('documentos', `cotizacion_id=eq.${r.id}&select=*&order=created_at.desc`).then((docs) => {
      const cand = docs.filter((d) => d.de !== 'interno');
      if (!D.shareSel) D.shareSel = new Set(cand.filter((d) => ['plano', 'computo', 'especificacion', 'hoja_datos'].includes(d.tipo)).map((d) => d.id));
      const days = sel([['3', '3 días'], ['7', '7 días'], ['14', '14 días'], ['30', '30 días']], String(D.shareDays || 7)); const status = el('div', { class: 'sub' });
      async function build() {
        D.shareDays = Number(days.value); const chosen = cand.filter((d) => D.shareSel.has(d.id));
        if (!chosen.length) { D.share = null; status.textContent = 'No se incluirán enlaces de documentos en el mensaje.'; return; }
        status.textContent = 'Generando enlaces…';
        try {
          const until = new Date(Date.now() + D.shareDays * 86400000).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' }); const out = [];
          for (const d of chosen) out.push({ nombre: d.nombre, url: await App.signDoc(d.path, D.shareDays * 86400) });
          D.share = { docs: out, until }; status.textContent = `${out.length} enlace(s) se incluirán en los mensajes; válidos hasta el ${until}.`;
        } catch (_) { D.share = null; status.textContent = 'No se pudieron generar los enlaces.'; }
      }
      days.addEventListener('input', build);
      const checks = cand.map((d) => { const c = el('input', { type: 'checkbox', checked: D.shareSel.has(d.id) }); c.addEventListener('change', () => { c.checked ? D.shareSel.add(d.id) : D.shareSel.delete(d.id); build(); }); return el('label', { class: 'check' }, c, `${d.nombre} `, App.badge(App.label(App.DOC_TIPOS, d.tipo)), App.badge(App.label(App.DOC_DE, d.de))); });
      shareBox.replaceChildren(el('h3', { text: 'Documentos y tabla para los proveedores' }),
        el('p', { class: 'sub', text: 'Marca los documentos del cliente que irán como enlaces de descarga dentro del mensaje. Cualquiera con el enlace podrá descargarlos hasta que venza: revisa que no incluyan datos del cliente que no quieras compartir.' }),
        ...(checks.length ? checks : [el('div', { class: 'sub', text: 'Aún no hay documentos. Adjúntalos en la pestaña Resumen (planos, especificaciones, cómputo métrico).' })]),
        checks.length ? el('div', { class: 'actions' }, el('span', { class: 'sub', text: 'Validez de los enlaces:' }), days) : null, status,
        (r.items || []).length ? el('div', { class: 'actions' }, el('button', { class: 'btn ghost small', type: 'button', text: 'Descargar tabla de partidas para cotizar (Excel)', onclick: () => App.exportItems(r.items, { name: `${App.folio(r)}-para-cotizar`, modo: 'proveedor' }) })) : null);
      build();
    }).catch(() => shareBox.replaceChildren(el('div', { class: 'msg-err', text: 'No se pudieron cargar los documentos.' })));

    // Ofertas registradas
    const priced = D.rfqs.filter((x) => ['respondida', 'negociacion', 'aceptada', 'ordenada', 'entregada'].includes(x.estado) && x.precio_total);
    const best = priced.length ? priced.reduce((a, b) => (ofertaUsd(b) < ofertaUsd(a) ? b : a)) : null;
    const cards = D.rfqs.map((x) => {
      const p = App.cache.proveedores.find((y) => y.id === x.proveedor_id) || { nombre: 'Proveedor' };
      const est = sel(App.OFERTA_ETAPAS, x.estado), precio = numInput(x.precio_total), mon = sel([['USD', 'USD'], ['PAB', 'PAB'], ['EUR', 'EUR'], ['CNY', 'CNY'], ['MXN', 'MXN'], ['COP', 'COP']], x.moneda);
      const inco = sel([['', '—'], ...incoOpts], x.incoterm), plazo = numInput(x.plazo_dias, { step: '1' }), nota = el('input', { value: x.notas || '', placeholder: 'Condiciones, validez, observaciones…' });
      const tc = numInput(x.tipo_cambio ?? 1, { step: 'any' }), itb = numInput(x.itbms_pct ?? 0, { step: 'any' }), usd = el('div', { class: 'sub' });
      const updUsd = () => { const base = App.r2((App.num(precio.value) || 0) * (App.num(tc.value) || 1)); const t = App.r2((base * (App.num(itb.value) || 0)) / 100); usd.textContent = `≈ ${App.money(base)} sin ITBMS${t ? ` · ITBMS ${App.money(t)} (crédito fiscal) · total a pagar ${App.money(base + t)}` : ''}`; };
      [precio, tc, itb].forEach((i) => i.addEventListener('input', updUsd)); mon.addEventListener('input', () => { if (['USD', 'PAB'].includes(mon.value)) tc.value = 1; updUsd(); }); updUsd();
      return el('div', { class: 'row-card' + (best && best.id === x.id && priced.length > 1 ? ' best' : '') },
        el('div', { class: 'head' }, el('b', { text: p.nombre }), el('div', {}, best && best.id === x.id && priced.length > 1 ? App.badge('Mejor precio', 'ok') : null, App.badge('vía ' + x.via))),
        el('div', { class: 'grid4' }, field('Estado', est), field('Precio total', precio), field('Moneda', mon), field('Incoterm', inco), field('Plazo (días)', plazo), field('Tipo de cambio a USD', tc, '1 unidad de la moneda = X USD'), field('ITBMS del proveedor (%)', itb, 'Solo si es proveedor local (7 %)'), el('div', { class: 'field', style: 'grid-column:span 4' }, el('label', { text: 'Notas' }), nota)),
        usd,
        el('div', { class: 'actions' },
          el('button', { class: 'btn small', type: 'button', text: 'Guardar', onclick: () => App.guard(async () => {
            const b = { estado: est.value, precio_total: App.num(precio.value), moneda: mon.value, incoterm: inco.value || null, plazo_dias: App.num(plazo.value), notas: nota.value.trim() || null, tipo_cambio: App.num(tc.value) > 0 ? App.num(tc.value) : 1, itbms_pct: App.num(itb.value) || 0 };
            if (b.estado !== 'enviada' && !x.respondida_at) b.respondida_at = new Date().toISOString();
            Object.assign(x, await App.patch('rfq_proveedor', x.id, b)); App.toast('Oferta guardada'); renderDetail(D);
          }) }),
          el('button', { class: 'btn ghost small', type: 'button', text: 'Quitar', onclick: () => confirm('¿Quitar esta solicitud al proveedor?') && App.guard(async () => { await App.del('rfq_proveedor', x.id); D.rfqs = D.rfqs.filter((y) => y.id !== x.id); renderDetail(D); }) })), App.docsBox({ title: 'Hoja de datos y documentos de esta oferta', scope: { rfq_id: x.id }, compact: true }));
    });
    return el('div', {},
      shareBox,
      el('div', { class: 'box' }, el('h3', { text: 'Enviar solicitud de cotización a proveedores' }), el('p', { class: 'sub', text: 'El mensaje incluye el resumen técnico SIN datos del cliente. Se abre WhatsApp o el correo con el texto listo y el envío queda registrado.' }),
        el('div', { class: 'sub', text: 'Especialidades (sugeridas según lo solicitado):' }), chips, el('label', { class: 'check' }, all, 'Mostrar todos los proveedores activos'), bulk, list),
      el('div', { class: 'box' }, el('h3', { text: 'Ofertas y respuestas' }), D.rfqs.length ? cards : el('div', { class: 'empty', text: 'Aún no has enviado solicitudes a proveedores.' })));
  }

  // ---------- Pestaña: Transporte ----------
  function tabTransporte(D) {
    const r = D.r, F = D.flete;
    if (F.valor_fob_usd === null) {
      const acc = D.rfqs.find((x) => ['aceptada', 'ordenada', 'entregada'].includes(x.estado) && x.moneda === 'USD' && x.precio_total);
      if (acc) F.valor_fob_usd = Number(acc.precio_total);
    }
    const ins = {
      modalidad: sel(App.MODALIDADES, F.modalidad), incoterm: sel(incoOpts, F.incoterm), origen: el('input', { value: F.origen, placeholder: 'Ej. Shanghái, China' }), destino: el('input', { value: F.destino }),
      peso_kg: numInput(F.peso_kg), volumen_m3: numInput(F.volumen_m3), bultos: numInput(F.bultos, { step: '1' }), valor_fob_usd: numInput(F.valor_fob_usd)
    };
    Object.entries(ins).forEach(([k, i]) => i.addEventListener('input', () => {
      F[k] = ['peso_kg', 'volumen_m3', 'bultos', 'valor_fob_usd'].includes(k) ? App.num(i.value) : i.value.trim();
      if (k === 'modalidad') { D.modSel = i.value; drawList(); }
    }));
    // Datos de embalaje: se pegan tal como los envía el proveedor y rellenan peso, bultos y volumen
    if (!D.emb) D.emb = { text: '', descripcion: '', info: '' };
    const embTa = el('textarea', { style: 'min-height:110px', value: D.emb.text, placeholder: 'Pega aquí el embalaje que te envió el proveedor, por ejemplo:\nPESO NETO: 216Kgs\nPESO BRUTO: 225Kgs\n# DE CAJAS DE CARTON: 5 cajas de cartón\nDIMENSIONES DE CADA CAJA: 51cms de largo X 43cms de ancho X 32cms de alto' });
    const embInfo = el('div', { class: 'sub', text: D.emb.info });
    const applyEmb = () => {
      D.emb.text = embTa.value; const txt = embTa.value.trim();
      if (!txt) { D.emb.descripcion = ''; D.emb.info = ''; embInfo.textContent = ''; return; }
      const e = App.parseEmbalaje(txt);
      if (!e) { D.emb.descripcion = ''; D.emb.info = 'No reconocí peso, bultos ni medidas en ese texto.'; embInfo.textContent = D.emb.info; return; }
      ['peso_kg', 'volumen_m3', 'bultos'].forEach((k) => { if (e[k] !== null && e[k] !== undefined) { F[k] = e[k]; ins[k].value = e[k]; } });
      D.emb.descripcion = e.descripcion; D.emb.info = `Detecté: ${e.resumen.join(' · ')}. Revisa los campos de arriba.`; embInfo.textContent = D.emb.info;
    };
    let embTimer; embTa.addEventListener('input', () => { clearTimeout(embTimer); embTimer = setTimeout(applyEmb, 350); });
    const embBox = el('div', { style: 'margin-top:.8rem' }, field('Datos de embalaje (pégalos tal como los envía el proveedor)', embTa, 'Reconoce peso neto y bruto, número de cajas, bultos o pallets, medidas por bulto y volumen. Rellena peso, volumen y bultos solos; puedes corregirlos después.'), embInfo);
    const list = el('div');
    function drawList() {
      const cands = App.cache.transportistas.filter((t) => t.activo && (!D.modSel || (t.modalidades || []).includes(D.modSel)));
      if (!cands.length) return list.replaceChildren(el('div', { class: 'empty', text: App.cache.transportistas.length ? 'Ningún transportista activo cubre esa modalidad.' : 'Aún no hay transportistas. Agrégalos en la pestaña “Transportistas” del menú.' }));
      list.replaceChildren(...cands.map((t) => {
        const sent = D.fletes.find((x) => x.transportista_id === t.id); const msg = () => fleteMessage(r, t, { ...F, embalaje: D.emb && D.emb.descripcion });
        const go = (via) => {
          if (!F.origen || !F.destino) return App.toast('Indica origen y destino antes de enviar');
          const text = msg();
          App.openLink(via === 'whatsapp' ? App.waLink(t.whatsapp, text) : App.mailLink(t.correo, `Cotización de flete ${App.folio(r)} — ${App.label(App.MODALIDADES, F.modalidad)}`, text));
          register(t, via);
        };
        return el('div', { class: 'row-card' }, el('div', { class: 'head' }, el('b', { text: t.nombre }), sent ? App.stageBadge(sent.estado) : App.badge('sin enviar')),
          el('div', { class: 'sub', text: [t.contacto, t.pais, t.cobertura].filter(Boolean).join(' · ') }), el('div', {}, (t.modalidades || []).map((k) => App.badge(App.label(App.MODALIDADES, k)))),
          el('div', { class: 'actions' }, t.whatsapp && el('button', { class: 'btn wa small', type: 'button', text: 'WhatsApp', onclick: () => go('whatsapp') }), t.correo && el('button', { class: 'btn mail small', type: 'button', text: 'Correo', onclick: () => go('correo') }),
            el('button', { class: 'btn ghost small', type: 'button', text: 'Copiar mensaje', onclick: () => (F.origen && F.destino ? App.copy(msg()) : App.toast('Indica origen y destino')) }),
            !sent && el('button', { class: 'btn ghost small', type: 'button', text: 'Marcar como enviada', onclick: () => (F.origen && F.destino ? register(t, 'manual') : App.toast('Indica origen y destino')) })));
      }));
    }
    async function register(t, via) {
      if (D.fletes.some((x) => x.transportista_id === t.id)) return;
      await App.guard(async () => {
        D.fletes.push(await App.insert('cotizaciones_flete', { cotizacion_id: r.id, transportista_id: t.id, via, ...F, notas: D.emb && D.emb.descripcion ? 'Embalaje: ' + D.emb.descripcion : null }));
        if (['nueva', 'en_revision'].includes(r.estado)) await setStage(D, 'cotizando'); renderDetail(D);
      });
    }
    drawList();

    const priced = D.fletes.filter((x) => ['respondida', 'contratada'].includes(x.estado) && Number(x.flete_usd) > 0);
    const best = priced.length ? priced.reduce((a, b) => (fleteCalc(b).destino < fleteCalc(a).destino ? b : a)) : null;
    const cards = D.fletes.map((x) => {
      const t = App.cache.transportistas.find((y) => y.id === x.transportista_id) || { nombre: 'Transportista' };
      const est = sel(App.FLETE_ESTADOS, x.estado), n = {};
      ['valor_fob_usd', 'gastos_origen_usd', 'flete_usd', 'seguro_usd', 'gastos_destino_usd'].forEach((k) => (n[k] = numInput(x[k])));
      n.transito_dias = numInput(x.transito_dias, { step: '1' }); n.validez_dias = numInput(x.validez_dias, { step: '1' });
      const nota = el('input', { value: x.notas || '', placeholder: 'Naviera, ruta, free time, observaciones…' });
      const calc = el('div', { class: 'calc' });
      const upd = () => {
        const c = fleteCalc(Object.fromEntries(['valor_fob_usd', 'gastos_origen_usd', 'flete_usd', 'seguro_usd', 'gastos_destino_usd'].map((k) => [k, App.num(n[k].value)])));
        calc.replaceChildren(...[['FOB (mercancía + gastos origen)', c.fob], ['CFR (FOB + flete)', c.cfr], ['CIF (CFR + seguro)', c.cif]].map(([l, v]) => el('div', {}, el('span', { text: l }), el('span', { text: App.money(v) }))),
          el('div', { class: 'total' }, el('span', { text: 'Puesto en destino (CIF + gastos destino)' }), el('span', { text: App.money(c.destino) })));
      };
      Object.values(n).forEach((i) => i.addEventListener('input', upd)); upd();
      return el('div', { class: 'row-card' + (best && best.id === x.id && priced.length > 1 ? ' best' : '') },
        el('div', { class: 'head' }, el('b', { text: `${t.nombre} · ${App.label(App.MODALIDADES, x.modalidad)} · ${x.incoterm || ''}` }), el('div', {}, best && best.id === x.id && priced.length > 1 ? App.badge('Menor costo en destino', 'ok') : null)),
        el('div', { class: 'sub', text: `${x.origen || '?'} → ${x.destino || '?'}${x.peso_kg ? ' · ' + x.peso_kg + ' kg' : ''}${x.volumen_m3 ? ' · ' + x.volumen_m3 + ' m³' : ''}${x.bultos ? ' · ' + x.bultos + ' bultos' : ''}` }),
        el('div', { class: 'grid3' }, field('Estado', est), field('Valor mercancía FOB (USD)', n.valor_fob_usd), field('Gastos en origen (USD)', n.gastos_origen_usd), field('Flete (USD)', n.flete_usd),
          field('Seguro (USD)', n.seguro_usd, 'Típico: 0.3–0.7 % del valor CIF'), field('Gastos en destino (USD)', n.gastos_destino_usd), field('Tránsito (días)', n.transito_dias), field('Validez (días)', n.validez_dias), el('div', { class: 'field' }, el('label', { text: 'Notas' }), nota)),
        calc, el('div', { class: 'actions' },
          el('button', { class: 'btn small', type: 'button', text: 'Guardar', onclick: () => App.guard(async () => {
            const b = { estado: est.value, notas: nota.value.trim() || null }; Object.entries(n).forEach(([k, i]) => (b[k] = App.num(i.value)));
            if (b.estado !== 'enviada' && !x.respondida_at) b.respondida_at = new Date().toISOString();
            Object.assign(x, await App.patch('cotizaciones_flete', x.id, b)); App.toast('Cotización de flete guardada'); renderDetail(D);
          }) }),
          el('button', { class: 'btn ghost small', type: 'button', text: 'Quitar', onclick: () => confirm('¿Quitar esta cotización de flete?') && App.guard(async () => { await App.del('cotizaciones_flete', x.id); D.fletes = D.fletes.filter((y) => y.id !== x.id); renderDetail(D); }) })));
    });
    return el('div', {},
      el('div', { class: 'box' }, el('h3', { text: 'Datos del embarque a cotizar' }), el('p', { class: 'sub', text: 'Estos datos van en el mensaje al transportista, que cotizará flete, seguro y gastos para condiciones FOB y CIF.' }),
        el('div', { class: 'grid4' }, field('Modalidad', ins.modalidad), field('Incoterm de referencia', ins.incoterm), field('Origen', ins.origen), field('Destino', ins.destino),
          field('Peso (kg)', ins.peso_kg), field('Volumen (m³)', ins.volumen_m3), field('Bultos', ins.bultos), field('Valor FOB (USD)', ins.valor_fob_usd)), embBox),
      el('div', { class: 'box' }, el('h3', { text: 'Enviar a transportistas' }), list),
      el('div', { class: 'box' }, el('h3', { text: 'Cotizaciones de flete recibidas' }), D.fletes.length ? cards : el('div', { class: 'empty', text: 'Aún no has pedido cotizaciones de flete.' })));
  }

  // ---------- Pestaña: Costeo y proforma ----------
  function newDraft(D) {
    const items = []; const offers = D.rfqs.filter((x) => ACEPTADAS.includes(x.estado) && x.precio_total);
    offers.forEach((x) => {
      const p = App.cache.proveedores.find((y) => y.id === x.proveedor_id); const usd = ofertaUsd(x);
      items.push({ descripcion: `Suministro de materiales — línea ${D.r.tension}${p ? ' (' + p.nombre + ')' : ''}`, unidad: 'global', cantidad: 1, precio_prov: usd, costo_unit: usd, utilidad_pct: 20 });
    });
    const fl = D.fletes.find((x) => x.estado === 'contratada'); const valor = items.reduce((sum, i) => sum + i.precio_prov, 0);
    const c = { activo: true, incoterm_compra: (offers.find((x) => x.incoterm) || {}).incoterm || (D.r.origen_mercancia === 'panama' ? 'EXW' : 'FOB'), incoterm_venta: 'CIF',
      origen: fl ? Number(fl.gastos_origen_usd) || 0 : 0, flete: fl ? Number(fl.flete_usd) || 0 : 0, seguro_pct: 0.5, arancel_pct: 0, destino: fl ? Number(fl.gastos_destino_usd) || 0 : 0, aduana: 0, local: 0, otros: 0 };
    if (fl && Number(fl.seguro_usd) > 0) { const den = valor + c.origen + c.flete; if (den > 0) c.seguro_pct = Math.round((Number(fl.seguro_usd) / den) * 100000) / 1000; }
    return { items, costeo: c, validez_dias: 15, condiciones_pago: '50% de anticipo y 50% contra entrega.', notas_cliente: '', itbms_pct: 0, moneda: 'USD', estado: 'borrador' };
  }
  const cliInfo = (D) => {
    const c = D.r.cliente_id && App.cache.clientes.find((x) => x.id === D.r.cliente_id); const r = D.r;
    const mail = (c && c.correo) || r.correo || ((r.contacto_info || '').match(/[^\s/]+@[^\s/]+\.[^\s/]+/) || [])[0];
    return { nombre: (c && c.nombre) || r.nombre, empresa: (c && c.empresa) || r.empresa, ruc: c && c.ruc, correo: mail, tel: App.digits((c && c.telefono) || r.telefono || r.contacto_info), direccion: c && c.direccion };
  };
  function pfMessage(D, pf) {
    const c = cliInfo(D); const k = pfCalc(pf.items, pf.itbms_pct);
    return [`Estimado ${c.nombre}:`, '', `Le enviamos la proforma ${pf.numero} correspondiente a su solicitud ${App.folio(D.r)}.`, '',
      ...pf.items.map((i) => `• ${i.descripcion} — ${i.cantidad}${i.unidad ? ' ' + i.unidad : ''} x ${App.money(unitPrice(i), pf.moneda)} = ${App.money(lineTotal(i), pf.moneda)}`), '',
      `Subtotal: ${App.money(k.subtotal, pf.moneda)}`, pf.itbms_pct > 0 ? `ITBMS (${pf.itbms_pct}%): ${App.money(k.itbms, pf.moneda)}` : null, `TOTAL: ${App.money(k.total, pf.moneda)}`, '',
      pf.costeo && pf.costeo.incoterm_venta ? `Condición de venta: ${pf.costeo.incoterm_venta} — Destino: ${D.r.pais_destino || ''}` : null,
      `Validez de la oferta: ${pf.validez_dias} días.`, pf.condiciones_pago ? `Condiciones de pago: ${pf.condiciones_pago}` : null, pf.notas_cliente || null, '', 'Quedamos atentos a sus comentarios.', sig()].filter((x) => x !== null).join('\n');
  }
  function pfHtml(D, pf) {
    const b = App.brand || {}; const c = cliInfo(D); const k = pfCalc(pf.items, pf.itbms_pct); const e = App.esc;
    const created = new Date(pf.created_at || Date.now()); const until = new Date(created.getTime() + pf.validez_dias * 86400000);
    return `<div class="head"><div><h1>${e(b.name)}</h1><div class="muted">${e(b.address)}<br>${e(b.phone)} · ${e(b.email)}</div></div>
      <div style="text-align:right"><h1>PROFORMA</h1><div><b>${e(pf.numero || 'BORRADOR')}</b></div><div class="muted">Fecha: ${created.toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}<br>Válida hasta: ${until.toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div></div>
      <h2>Cliente</h2><div>${e(c.nombre)}${c.empresa ? ' — ' + e(c.empresa) : ''}${c.ruc ? '<br>RUC: ' + e(c.ruc) : ''}${c.correo ? '<br>' + e(c.correo) : ''}${c.direccion ? '<br>' + e(c.direccion) : ''}</div>
      <div class="muted">Ref. solicitud ${e(App.folio(D.r))} — Línea eléctrica ${e(D.r.tension)}</div>
      ${pf.costeo && pf.costeo.incoterm_venta ? `<div class="muted">Condición de venta: ${e(pf.costeo.incoterm_venta)} — Destino: ${e(D.r.pais_destino || '')}</div>` : ''}
      <table><thead><tr><th>Descripción</th><th class="r">Cant.</th><th class="r">Precio unit.</th><th class="r">Total</th></tr></thead><tbody>
      ${pf.items.map((i) => `<tr><td>${e(i.descripcion)}</td><td class="r">${e(i.cantidad)} ${e(i.unidad || '')}</td><td class="r">${e(App.money(unitPrice(i), pf.moneda))}</td><td class="r">${e(App.money(lineTotal(i), pf.moneda))}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="3" class="r">Subtotal</td><td class="r">${e(App.money(k.subtotal, pf.moneda))}</td></tr>
      ${pf.itbms_pct > 0 ? `<tr><td colspan="3" class="r">ITBMS (${e(pf.itbms_pct)}%)</td><td class="r">${e(App.money(k.itbms, pf.moneda))}</td></tr>` : ''}
      <tr class="tot"><td colspan="3" class="r">TOTAL</td><td class="r">${e(App.money(k.total, pf.moneda))}</td></tr></tfoot></table>
      ${pf.condiciones_pago ? `<h2>Condiciones de pago</h2><div>${e(pf.condiciones_pago)}</div>` : ''}${pf.notas_cliente ? `<h2>Observaciones</h2><pre>${e(pf.notas_cliente)}</pre>` : ''}
      <p class="muted">Venta de exportación: operación no gravada con ITBMS (0 %).</p>
      <p class="muted">Oferta válida por ${e(pf.validez_dias)} días desde la fecha de emisión. Precios sujetos a disponibilidad.</p>`;
  }

  function tabCosteo(D) {
    const r = D.r; const pais = r.pais_destino || 'Venezuela';
    if (!D.pf) D.pf = D.proformas[0] ? { ...D.proformas[0] } : newDraft(D);
    const pf = D.pf; pf.items = (pf.items || []).map((i) => ({ ...i }));
    pf.costeo = { activo: false, incoterm_compra: 'FOB', incoterm_venta: 'CIF', origen: 0, flete: 0, seguro_pct: 0.5, arancel_pct: 0, destino: 0, aduana: 0, local: 0, otros: 0, ...(pf.costeo || {}) };
    const C = pf.costeo; pf.itbms_pct = 0;
    const locked = pf.estado === 'aceptada';
    const selector = el('div', { class: 'chips' },
      ...D.proformas.map((p) => el('span', { class: 'chip' + (pf.id === p.id ? ' on' : ''), text: `${p.numero} · ${App.label(App.PROFORMA_ESTADOS, p.estado)}`, onclick: () => { D.pf = { ...p }; renderDetail(D); } })),
      el('span', { class: 'chip' + (!pf.id ? ' on' : ''), text: '+ Nueva proforma', onclick: () => { D.pf = newDraft(D); renderDetail(D); } }));

    const thead = el('thead'), tbody = el('tbody'), totals = el('div', { class: 'calc' }), landedBox = el('div', { class: 'calc' });
    const credito = creditoItbms(D);
    const applyLanded = () => { if (!C.activo) return null; const L = landedCalc(pf.items, C); pf.items.forEach((i) => { i.costo_unit = App.r2((Number(i.precio_prov) || 0) * L.k); }); return L; };
    function drawLanded(L) {
      landedBox.hidden = !C.activo || !L; if (!L) return;
      const why = (key) => (!BUY_PAYS[C.incoterm_compra].includes(key) ? 'incluido en el precio del proveedor' : !SALE_COVERS[C.incoterm_venta].includes(key) ? 'no lo cubres según tu venta' : null);
      const row = (label, key, value, cls) => { const n = key && why(key); return el('div', { class: cls || '' }, el('span', { text: label }), el('span', { class: n ? 'sub' : '', text: n || App.money(value) })); };
      landedBox.replaceChildren(row(`Mercancía (precio del proveedor, ${C.incoterm_compra})`, null, L.valor), row('+ Gastos en origen', 'origen', L.origen), row('+ Flete internacional', 'flete', L.flete), row(`+ Seguro (${C.seguro_pct} %)`, 'seguro', L.seguro),
        row('= Valor CIF', null, L.aduanero, 'total'), row(`+ Arancel en ${pais} (${C.arancel_pct} %)`, 'arancel', L.arancel), row('+ Gastos en destino', 'destino', L.destino), row('+ Agente aduanal y trámites', 'aduana', L.aduana), row('+ Entrega al cliente', 'local', L.local), row('+ Otros costos', null, L.otros),
        row(`= COSTO TOTAL PUESTO (venta ${C.incoterm_venta})`, null, L.total, 'total'), el('div', {}, el('span', { text: 'Factor aplicado al precio de cada línea' }), el('span', { text: '× ' + L.k.toFixed(4) })),
        credito > 0 ? el('div', {}, el('span', { text: 'ITBMS pagado a proveedores locales (crédito fiscal; no suma al costo)' }), el('span', { text: App.money(credito) })) : null,
        L.warn ? el('div', { class: 'msg-err' }, `Atención: compras con flete incluido (${C.incoterm_compra}) pero vendes ${C.incoterm_venta}. El flete ya viene dentro del precio del proveedor y no se puede separar: tu costo queda más alto de lo necesario.`) : null);
    }
    function recalc() {
      const L = applyLanded(); const k = pfCalc(pf.items, 0);
      [...tbody.children].forEach((tr, idx) => { const it = pf.items[idx]; tr.querySelector('.pu').textContent = App.money(unitPrice(it)); tr.querySelector('.lt').textContent = App.money(lineTotal(it)); const cc = tr.querySelector('.cc'); if (cc) cc.textContent = App.money(it.costo_unit); });
      drawLanded(L);
      const row = (l, v, cls) => el('div', { class: cls || '' }, el('span', { text: l }), el('span', { text: v }));
      totals.replaceChildren(row('Costo total', App.money(k.costo, pf.moneda)), row('Utilidad', `${App.money(k.utilidad, pf.moneda)} (${k.margen.toFixed(1)} % sobre venta · ${k.markup.toFixed(1)} % sobre costo)`), row('TOTAL PROFORMA (exportación, ITBMS 0 %)', App.money(k.total, pf.moneda), 'total'));
    }
    function drawHead() {
      const heads = C.activo ? ['Descripción', 'Cant.', 'Und.', 'Precio proveedor', 'Costo puesto', 'Utilidad %', 'Precio unit.', 'Total venta', ''] : ['Descripción', 'Cant.', 'Und.', 'Costo unit.', 'Utilidad %', 'Precio unit.', 'Total venta', ''];
      const nums = C.activo ? [4, 6, 7] : [5, 6];
      thead.replaceChildren(el('tr', {}, ...heads.map((h, i) => el('th', { class: nums.includes(i) ? 'num' : '', text: h }))));
    }
    function drawRows() {
      drawHead();
      tbody.replaceChildren(...pf.items.map((i, idx) => {
        const bind = (inp, k, isNum) => { inp.addEventListener('input', () => { i[k] = isNum ? App.num(inp.value) ?? 0 : inp.value; recalc(); }); return inp; };
        const cost = C.activo ? [el('td', {}, bind(numInput(i.precio_prov, { disabled: locked, style: 'width:110px' }), 'precio_prov', true)), el('td', { class: 'num cc' })]
          : [el('td', {}, bind(numInput(i.costo_unit, { disabled: locked, style: 'width:110px' }), 'costo_unit', true))];
        return el('tr', {}, el('td', {}, bind(el('input', { value: i.descripcion, disabled: locked }), 'descripcion')), el('td', {}, bind(numInput(i.cantidad, { disabled: locked, style: 'width:70px' }), 'cantidad', true)),
          el('td', {}, bind(el('input', { value: i.unidad || '', disabled: locked, style: 'width:60px' }), 'unidad')), ...cost, el('td', {}, bind(numInput(i.utilidad_pct, { disabled: locked, style: 'width:80px' }), 'utilidad_pct', true)),
          el('td', { class: 'num pu' }), el('td', { class: 'num lt' }), el('td', {}, !locked && el('button', { class: 'btn ghost small', type: 'button', text: '✕', onclick: () => { pf.items.splice(idx, 1); drawRows(); } })));
      })); recalc();
    }

    // ---- Calculador de costo de adquisición
    const FIELDS = [
      ['origen', 'Gastos en origen (USD)', 'Transporte al puerto, corredor de aduanas y DUA si exportas desde Panamá', 'origen'], ['flete', 'Flete internacional (USD)', null, 'flete'], ['seguro_pct', 'Seguro (% sobre mercancía + flete)', 'Típico 0.3–0.7 %', 'seguro'],
      ['destino', 'Gastos en destino (USD)', 'Manejo portuario, almacenaje, agente naviero', 'destino'], ['aduana', 'Agente aduanal y trámites en destino (USD)', null, 'aduana'],
      ['arancel_pct', `Arancel e impuestos de importación en ${pais} (%)`, 'Sobre el valor CIF. Confírmalo con el agente aduanal de ese país', 'arancel'], ['local', 'Entrega hasta el lugar del cliente (USD)', null, 'local'], ['otros', 'Otros costos (USD)', null, null]];
    const useLanded = el('input', { type: 'checkbox', checked: !!C.activo, disabled: locked });
    const buySel = sel(INCO_LIST, C.incoterm_compra, { disabled: locked }), saleSel = sel(INCO_LIST, C.incoterm_venta, { disabled: locked });
    const inputs = {}, wraps = {};
    FIELDS.forEach(([k, label, hint]) => { const inp = numInput(C[k] ?? 0, { disabled: locked }); inputs[k] = inp; inp.addEventListener('input', () => { C[k] = App.num(inp.value) ?? 0; recalc(); }); wraps[k] = field(label, inp, hint); });
    function syncFields() {
      FIELDS.forEach(([k, , , pay]) => { if (!pay) return; const pays = BUY_PAYS[C.incoterm_compra].includes(pay) && SALE_COVERS[C.incoterm_venta].includes(pay); inputs[k].disabled = locked || !pays; wraps[k].style.opacity = pays ? '' : '.5'; });
    }
    function pushToInputs() { Object.entries(inputs).forEach(([k, inp]) => (inp.value = C[k] ?? 0)); buySel.value = C.incoterm_compra; saleSel.value = C.incoterm_venta; syncFields(); }
    buySel.addEventListener('input', () => { C.incoterm_compra = buySel.value; syncFields(); recalc(); });
    saleSel.addEventListener('input', () => { C.incoterm_venta = saleSel.value; syncFields(); recalc(); });
    const calcFields = el('div', {}, el('div', { class: 'grid2' }, field('Incoterm de COMPRA (lo que cubre tu proveedor)', buySel), field(`Incoterm de VENTA a ${pais} (hasta dónde llegas tú)`, saleSel)),
      el('div', { class: 'grid3', style: 'margin-top:.5rem' }, ...FIELDS.map(([k]) => wraps[k])),
      !locked && el('div', { class: 'actions' }, el('button', { class: 'btn ghost small', type: 'button', text: 'Cargar desde la oferta aceptada y el flete contratado', onclick: () => {
        const d = newDraft(D); if (!d.items.length && !d.costeo.flete) return App.toast('No hay oferta aceptada ni flete contratado todavía.');
        Object.assign(C, { incoterm_compra: d.costeo.incoterm_compra, origen: d.costeo.origen, flete: d.costeo.flete, seguro_pct: d.costeo.seguro_pct, destino: d.costeo.destino }); pushToInputs(); recalc(); App.toast('Datos cargados');
      } })), landedBox);
    calcFields.hidden = !C.activo;
    useLanded.addEventListener('change', () => {
      C.activo = useLanded.checked; if (C.activo) pf.items.forEach((i) => { if (i.precio_prov === undefined || i.precio_prov === null) i.precio_prov = Number(i.costo_unit) || 0; });
      calcFields.hidden = !C.activo; drawRows();
    });
    syncFields(); drawRows();

    const util = numInput(20, { style: 'width:90px', disabled: locked });
    const valid = numInput(pf.validez_dias, { step: '1', disabled: locked }), cond = el('input', { value: pf.condiciones_pago || '', disabled: locked }), nota = el('textarea', { value: pf.notas_cliente || '', placeholder: 'Observaciones que verá el cliente en la proforma', disabled: locked });
    const money = el('select', { disabled: locked }, el('option', { value: 'USD', text: 'USD' }), el('option', { value: 'PAB', text: 'PAB' })); money.value = pf.moneda;
    const newItem = (o) => ({ descripcion: '', unidad: 'und', cantidad: 1, precio_prov: 0, costo_unit: 0, utilidad_pct: Number(util.value) || 0, ...o });

    const body = () => ({
      cotizacion_id: r.id, estado: pf.estado, moneda: money.value, validez_dias: Math.max(1, App.num(valid.value) || 15), condiciones_pago: cond.value.trim() || null, notas_cliente: nota.value.trim() || null,
      itbms_pct: 0, costeo: { ...C }, items: pf.items.filter((i) => (i.descripcion || '').trim()), ...(() => { applyLanded(); const k = pfCalc(pf.items, 0); return { total_costo: k.costo, subtotal: k.subtotal, itbms_monto: 0, total: k.total }; })()
    });
    const save = async (extra = {}) => {
      const b = { ...body(), ...extra }; if (!b.items.length) { App.toast('Agrega al menos una línea'); return null; }
      const saved = pf.id ? await App.patch('proformas', pf.id, b) : await App.insert('proformas', b); D.pf = saved; return saved;
    };
    const guarded = (fn) => App.guard(async () => { const s = await fn(); if (s !== null) { await reloadDetail(D); renderDetail(D); } });
    const contact = cliInfo(D);
    const stageTo = async (estado) => { if (['nueva', 'en_revision', 'cotizando'].includes(r.estado)) await setStage(D, estado); };
    return el('div', {},
      el('div', { class: 'box' }, el('h3', { text: 'Proformas de esta solicitud' }), selector),
      locked ? el('div', { class: 'box' }, el('b', { text: 'Proforma aceptada: ' + pf.numero }), el('div', { class: 'actions' }, el('button', { class: 'btn ghost small', type: 'button', text: 'Reabrir como borrador', onclick: () => guarded(() => App.patch('proformas', pf.id, { estado: 'borrador' })) }))) : null,
      el('div', { class: 'box' }, el('h3', { text: 'Costo de adquisición según Incoterm' }),
        el('p', { class: 'sub', text: `Calcula cuánto te cuesta la mercancía puesta donde termina tu venta: precio del proveedor + lo que su Incoterm no cubre y tú sí debes cubrir. Todo en USD. Venta de exportación a ${pais}: ITBMS 0 %. Los aranceles de destino solo cuentan si vendes DDP.` }),
        el('label', { class: 'check' }, useLanded, 'Calcular el costo de adquisición según los Incoterms de compra y de venta'), calcFields),
      el('div', { class: 'box' }, el('h3', { text: 'Líneas, costos y utilidad' }), el('p', { class: 'sub', text: 'La utilidad % se suma sobre el costo puesto de cada línea para fijar el precio al cliente. El cliente solo ve precios, nunca costos ni utilidad.' }),
        !locked && el('div', { class: 'actions' }, el('button', { class: 'btn ghost small', type: 'button', text: 'Cargar / recargar líneas desde las ofertas aceptadas', onclick: () => {
          const d = newDraft(D); if (!d.items.length) return App.toast('No hay ofertas aceptadas. Acepta una oferta en la pestaña Proveedores, o agrega líneas manualmente.');
          if (pf.items.length && !confirm('Esto reemplaza las líneas actuales por las ofertas aceptadas. ¿Continuar?')) return;
          pf.items = d.items; drawRows(); App.toast('Líneas cargadas');
        } }), el('button', { class: 'btn ghost small', type: 'button', text: '+ Línea libre', onclick: () => { pf.items.push(newItem()); drawRows(); } }),
          el('button', { class: 'btn ghost small', type: 'button', text: '+ Del catálogo', onclick: () => App.formDialog({ title: 'Agregar producto del catálogo', submitLabel: 'Agregar', values: { cantidad: 1 },
            fields: [{ k: 'producto', label: 'Producto', type: 'select', required: true, options: (App.cache.productos || []).filter((p) => p.activo).map((p) => [p.id, p.nombre]) }, { k: 'cantidad', label: 'Cantidad', type: 'number', required: true }],
            onSubmit: async (v) => { const p = App.cache.productos.find((x) => x.id === v.producto); pf.items.push(newItem({ descripcion: p.nombre, unidad: p.unidad, cantidad: v.cantidad, precio_prov: Number(p.costo_ref) || 0, costo_unit: Number(p.costo_ref) || 0 })); drawRows(); } }) }),
          el('button', { class: 'btn ghost small', type: 'button', text: 'Cargar desde las partidas de la solicitud', onclick: () => {
            if (!(r.items || []).length) return App.toast('La solicitud no tiene partidas. Agrégalas o impórtalas en la pestaña Resumen.');
            r.items.forEach((i) => { const p = (App.cache.productos || []).find((x) => x.id === i.producto_id); const c0 = p ? Number(p.costo_ref) || 0 : 0; pf.items.push(newItem({ descripcion: i.descripcion, unidad: i.unidad, cantidad: i.cantidad, precio_prov: c0, costo_unit: c0 })); });
            drawRows(); App.toast('Partidas cargadas: completa los precios del proveedor');
          } }),
          el('span', { class: 'sub', text: 'Utilidad global %:' }), util, el('button', { class: 'btn ghost small', type: 'button', text: 'Aplicar a todas', onclick: () => { pf.items.forEach((i) => (i.utilidad_pct = Number(util.value) || 0)); drawRows(); } })),
        el('div', { class: 'table-wrap' }, el('table', { class: 'lines' }, thead, tbody)),
        el('div', { class: 'grid4', style: 'margin-top:.7rem' }, field('Moneda', money), field('Impuesto', el('input', { value: 'Exportación: ITBMS 0 %', disabled: true })), field('Validez (días)', valid), field('Condiciones de pago', cond)), field('Observaciones para el cliente', nota), totals),
      el('div', { class: 'box' }, el('div', { class: 'actions' },
        !locked && el('button', { class: 'btn', type: 'button', text: pf.id ? 'Guardar cambios' : 'Guardar proforma', onclick: () => guarded(() => save().then((s) => { s && App.toast('Proforma guardada: ' + s.numero); return s; })) }),
        el('button', { class: 'btn ghost', type: 'button', text: 'Vista previa / PDF', onclick: () => App.printHtml(pf.numero || 'Proforma', pfHtml(D, { ...pf, ...body(), numero: pf.numero, created_at: pf.created_at })) })),
        pf.id && !locked && el('div', { class: 'actions' },
          contact.tel.length >= 7 && el('button', { class: 'btn wa small', type: 'button', text: 'Enviar por WhatsApp', onclick: () => { App.openLink(App.waLink(contact.tel, pfMessage(D, { ...pf, ...body(), numero: pf.numero }))); App.toast('Adjunta el PDF (Vista previa → Guardar como PDF)'); guarded(async () => { const s = await save({ estado: 'enviada', enviada_at: new Date().toISOString() }); await stageTo('proforma_enviada'); return s; }); } }),
          contact.correo && el('button', { class: 'btn mail small', type: 'button', text: 'Enviar por correo', onclick: () => { App.openLink(App.mailLink(contact.correo, `Proforma ${pf.numero} — ${r.tension}`, pfMessage(D, { ...pf, ...body(), numero: pf.numero }))); App.toast('Adjunta el PDF (Vista previa → Guardar como PDF)'); guarded(async () => { const s = await save({ estado: 'enviada', enviada_at: new Date().toISOString() }); await stageTo('proforma_enviada'); return s; }); } }),
          el('button', { class: 'btn ghost small', type: 'button', text: 'Copiar mensaje', onclick: () => App.copy(pfMessage(D, { ...pf, ...body(), numero: pf.numero })) }),
          el('button', { class: 'btn ok small', style: 'background:var(--ok)', type: 'button', text: 'Marcar aceptada por el cliente', onclick: () => confirm('¿El cliente aceptó esta proforma? La solicitud pasará a “Ganada” y se facturará en cuentas por cobrar.') && guarded(async () => { const s = await save({ estado: 'aceptada' }); await setStage(D, 'ganada'); return s; }) }),
          el('button', { class: 'btn ghost small', type: 'button', text: 'Marcar rechazada', onclick: () => guarded(() => save({ estado: 'rechazada' })) })),
        !pf.id && el('div', { class: 'sub', text: 'Guarda la proforma para poder enviarla al cliente.' })));
  }

  // ---------- Expediente de respaldo y asientos sugeridos ----------
  function expedienteBox(D) {
    const r = D.r; const box = el('div', { class: 'box' });
    const needs = [['orden_compra', 'Orden de compra del cliente'], ['factura', 'Factura del proveedor'], ['bl', 'Conocimiento de embarque / guía aérea'],
      ...(r.origen_mercancia !== 'exterior' ? [['dua', 'DUA de exportación (salida de Panamá)']] : []), ['comprobante', 'Comprobante de pago / transferencia']];
    const ids = D.rfqs.map((x) => x.id);
    async function load() {
      try {
        const [a, b] = await Promise.all([App.get('documentos', `cotizacion_id=eq.${r.id}&select=tipo`), ids.length ? App.get('documentos', `rfq_id=in.(${ids.join(',')})&select=tipo`) : Promise.resolve([])]);
        const have = new Set([...a, ...b].map((d) => d.tipo)); const done = needs.filter(([k]) => have.has(k)).length;
        box.replaceChildren(el('h3', { text: `Expediente de respaldo de la operación (${done}/${needs.length})` }),
          el('p', { class: 'sub', text: 'Documentos que demuestran la operación ante cualquier revisión: ruta internacional, compra, pago y, si sales de Panamá, la declaración de exportación. Adjúntalos eligiendo el tipo correspondiente.' }),
          ...needs.map(([k, l]) => el('div', { class: 'check' }, have.has(k) ? App.badge('✓ Listo', 'ok') : App.badge('Falta', 'warn'), ' ' + l)),
          App.docsBox({ scope: { cotizacion_id: r.id }, compact: true }));
      } catch (_) { box.replaceChildren(el('div', { class: 'msg-err', text: 'No se pudo cargar el expediente.' })); }
    }
    box.replaceChildren(el('h3', { text: 'Expediente de respaldo de la operación' }), el('div', { class: 'sub', text: 'Cargando…' })); load();
    const onChange = () => { if (box.isConnected) load(); else document.removeEventListener('docs-changed', onChange); }; document.addEventListener('docs-changed', onChange);
    return box;
  }
  function asientosBox({ provUsd, fleteComp, itbmsCred, costoComp, venta }) {
    if (!costoComp && !venta) return null;
    const rows = []; const add = (cuenta, deb, cre) => rows.push(el('tr', {}, el('td', { text: cuenta }), el('td', { class: 'num', text: deb ? App.money(deb) : '' }), el('td', { class: 'num', text: cre ? App.money(cre) : '' })));
    const head = (t) => rows.push(el('tr', {}, el('td', { colspan: '3' }, el('b', { text: t }))));
    if (costoComp) {
      head('1. Compra');
      add('Inventario en tránsito / en el exterior', costoComp, 0); if (itbmsCred) add('ITBMS por acreditar (crédito fiscal)', itbmsCred, 0);
      if (provUsd) add('Cuentas por pagar — proveedores', 0, App.r2(provUsd + itbmsCred)); if (fleteComp) add('Cuentas por pagar — transporte / fletes', 0, fleteComp);
    }
    if (venta) {
      head('2. Venta de exportación'); add('Cuentas por cobrar — clientes', venta, 0); add('Ingresos por ventas al exterior (ITBMS 0 %)', 0, venta);
      if (costoComp) { add('Costo de venta internacional', costoComp, 0); add('Inventario en tránsito / en el exterior', 0, costoComp); }
    }
    return el('div', { class: 'box' }, el('h3', { text: 'Asientos contables sugeridos (guía para tu contador)' }),
      el('p', { class: 'sub', text: 'Referencia calculada con los datos de esta solicitud; el panel no registra contabilidad. El tratamiento fiscal (ITBMS, renta de fuente extranjera) debe validarlo tu contador.' }),
      el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: 'Cuenta' }), el('th', { class: 'num', text: 'Débito' }), el('th', { class: 'num', text: 'Crédito' }))), el('tbody', {}, rows))));
  }

  // ---------- Pestaña: Cobros y pagos ----------
  function tabCobros(D) {
    const r = D.r; const acc = D.proformas.find((p) => p.estado === 'aceptada');
    const venta = acc ? Number(acc.total) : 0, ventaNeta = acc ? Number(acc.subtotal) : 0;
    const provUsd = App.r2(D.rfqs.filter((x) => ACEPTADAS.includes(x.estado)).reduce((sum, x) => sum + ofertaUsd(x), 0)), fleteComp = App.r2(D.fletes.filter((x) => x.estado === 'contratada').reduce((sum, x) => sum + fleteCost(x), 0));
    const itbmsCred = creditoItbms(D), costoComp = App.r2(provUsd + fleteComp);
    const sum = (...t) => App.r2(D.movs.filter((m) => t.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0));
    const cobrado = sum('cobro'), pagado = sum('pago_proveedor', 'pago_transportista', 'gasto');
    const add = (tipo) => App.movimientoForm({ tipo, cotizacion_id: r.id, cliente_id: r.cliente_id || null, proforma_id: acc ? acc.id : null }, () => refresh(D));
    return el('div', {},
      el('div', { class: 'stats' },
        ...[['Venta de exportación (proforma aceptada)', App.money(venta), ''], ['Cobrado', App.money(cobrado), 'pos'], ['Por cobrar', App.money(App.r2(venta - cobrado)), venta - cobrado > 0 ? 'neg' : 'pos'],
          ['Costo comprometido (sin ITBMS)', App.money(costoComp), ''], ['Pagado (proveedores, fletes, gastos)', App.money(pagado), ''], ['Por pagar (incluye ITBMS de proveedores locales)', App.money(App.r2(costoComp + itbmsCred - pagado)), ''],
          ...(itbmsCred > 0 ? [['ITBMS pagado a proveedores (crédito fiscal)', App.money(itbmsCred), '']] : []), ['Utilidad estimada (venta sin impuesto − costo)', App.money(App.r2(ventaNeta - costoComp)), ventaNeta - costoComp >= 0 ? 'pos' : 'neg']]
          .map(([l, v, k]) => el('div', { class: 'stat ' + k }, el('b', { text: v }), el('span', { text: l })))),
      expedienteBox(D), asientosBox({ provUsd, fleteComp, itbmsCred, costoComp, venta }),
      !r.cliente_id && el('div', { class: 'box' }, el('b', { text: 'Vincula esta solicitud a un cliente (pestaña Resumen) para que sus cobros entren al estado de cuenta.' })),
      el('div', { class: 'box' }, el('div', { class: 'actions' }, el('button', { class: 'btn small', type: 'button', text: '+ Cobro del cliente', onclick: () => add('cobro') }), el('button', { class: 'btn ghost small', type: 'button', text: '+ Pago a proveedor', onclick: () => add('pago_proveedor') }),
        el('button', { class: 'btn ghost small', type: 'button', text: '+ Pago a transportista', onclick: () => add('pago_transportista') }), el('button', { class: 'btn ghost small', type: 'button', text: '+ Gasto', onclick: () => add('gasto') })),
        D.movs.length ? el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ...['Fecha', 'Tipo', 'Detalle', 'Monto', ''].map((h, i) => el('th', { class: i === 3 ? 'num' : '', text: h })))),
          el('tbody', {}, D.movs.map((m) => el('tr', {}, el('td', { text: App.fmtDay(m.fecha) }), el('td', { text: App.label(App.MOV_TIPOS, m.tipo) }), el('td', { text: [m.metodo, m.referencia, m.notas].filter(Boolean).join(' · ') }),
            el('td', { class: 'num', text: (m.tipo === 'cobro' ? '+ ' : '− ') + App.money(m.monto, m.moneda) }),
            el('td', {}, el('button', { class: 'btn ghost small', type: 'button', text: '✕', onclick: () => confirm('¿Eliminar este movimiento?') && App.guard(async () => { await App.del('movimientos', m.id); await refresh(D); }) }))))))) : el('div', { class: 'empty', text: 'Aún no hay movimientos para esta solicitud.' })));
  }
})();
