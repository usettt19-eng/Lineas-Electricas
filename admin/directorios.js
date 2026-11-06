/* Vistas: Clientes, Proveedores (+ pipeline de ofertas) y Transportistas. */
(() => {
  'use strict';
  const { el } = App;

  const contactCell = (r) =>
    el('td', {}, [r.telefono, r.whatsapp && 'WA ' + r.whatsapp, r.correo].filter(Boolean).map((t) => el('div', { text: t })));

  function cleanContact(v) {
    const wa = App.digits(v.whatsapp);
    if (v.whatsapp && !/^[0-9]{8,15}$/.test(wa)) { const e = new Error('wa'); e.userMessage = 'El WhatsApp debe tener entre 8 y 15 dígitos (con código de país).'; throw e; }
    return { ...v, whatsapp: v.whatsapp ? wa : null };
  }

  /* ---------------- Clientes ---------------- */
  App.clienteFields = [
    { k: 'nombre', label: 'Nombre', required: true }, { k: 'empresa', label: 'Empresa' },
    { k: 'ruc', label: 'RUC / identificación fiscal' }, { k: 'correo', label: 'Correo', type: 'email' },
    { k: 'telefono', label: 'Teléfono / WhatsApp' }, { k: 'direccion', label: 'Dirección' },
    { k: 'notas', label: 'Notas internas', type: 'textarea' }, { k: 'activo', label: 'Cliente activo', type: 'bool' }
  ];
  App.clienteForm = (values, onSaved) =>
    App.formDialog({
      title: values && values.id ? 'Editar cliente' : 'Nuevo cliente', fields: App.clienteFields, values: values || {},
      onSubmit: async (v) => {
        const saved = values && values.id ? await App.patch('clientes', values.id, v) : await App.insert('clientes', v);
        await App.loadDirs(true); onSaved && onSaved(saved);
      }
    });

  /* Estado de cuenta: proformas aceptadas = cargos; cobros = abonos */
  App.statement = (proformas, movs) => {
    const rows = [
      ...proformas.filter((p) => p.estado === 'aceptada').map((p) => ({ fecha: (p.enviada_at || p.created_at).slice(0, 10), concepto: `Proforma ${p.numero}`, cargo: Number(p.total), abono: 0 })),
      ...movs.filter((m) => m.tipo === 'cobro').map((m) => ({ fecha: m.fecha, concepto: `Cobro ${m.metodo ? '(' + m.metodo + ') ' : ''}${m.referencia || ''}`.trim(), cargo: 0, abono: Number(m.monto) }))
    ].sort((a, b) => a.fecha.localeCompare(b.fecha));
    let saldo = 0;
    rows.forEach((r) => { saldo = App.r2(saldo + r.cargo - r.abono); r.saldo = saldo; });
    return { rows, saldo };
  };

  async function openCliente(id) {
    await App.guard(async () => {
      await App.loadDirs();
      const [cots, proformas, movs] = await Promise.all([
        App.get('cotizaciones', `cliente_id=eq.${id}&select=*&order=created_at.desc`),
        App.get('proformas', 'select=*&order=created_at.desc'),
        App.get('movimientos', `cliente_id=eq.${id}&select=*&order=fecha.desc`)
      ]);
      const c = App.cache.clientes.find((x) => x.id === id); if (!c) return;
      const ids = new Set(cots.map((x) => x.id));
      const pf = proformas.filter((p) => ids.has(p.cotizacion_id));
      const st = App.statement(pf, movs);
      const dl = el('dl');
      [['Empresa', c.empresa], ['RUC', c.ruc], ['Correo', c.correo], ['Teléfono', c.telefono], ['Dirección', c.direccion], ['Notas', c.notas]].forEach(([l, v]) => v && dl.append(el('dt', { text: l }), el('dd', { text: v })));
      const phone = App.digits(c.telefono);
      const node = el('div', {},
        el('div', { class: 'panel-head' }, el('div', {}, el('h2', { text: c.nombre }), el('div', { class: 'sub', text: c.activo ? 'Cliente activo' : 'Cliente inactivo' })),
          el('div', { class: 'actions' },
            el('button', { class: 'btn ghost small', type: 'button', text: 'Editar', onclick: () => App.clienteForm(c, () => { openCliente(id); App.views.clientes.render(App.$('main')); }) }),
            el('button', { class: 'btn ghost small', type: 'button', text: 'Cerrar', onclick: App.closeDrawer }))),
        el('div', { class: 'box' }, dl,
          el('div', { class: 'actions' },
            phone.length >= 7 && el('a', { class: 'btn wa small', target: '_blank', rel: 'noopener', href: App.waLink(phone, `Hola ${c.nombre}, `), text: 'WhatsApp' }),
            c.correo && el('a', { class: 'btn mail small', href: `mailto:${c.correo}`, text: 'Correo' }))),
        el('div', { class: 'stats' },
          el('div', { class: 'stat' }, el('b', { text: cots.length }), el('span', { text: 'Solicitudes' })),
          el('div', { class: 'stat' }, el('b', { text: App.money(pf.filter((p) => p.estado === 'aceptada').reduce((s, p) => s + Number(p.total), 0)) }), el('span', { text: 'Facturado (proformas aceptadas)' })),
          el('div', { class: 'stat' }, el('b', { text: App.money(movs.filter((m) => m.tipo === 'cobro').reduce((s, m) => s + Number(m.monto), 0)) }), el('span', { text: 'Cobrado' })),
          el('div', { class: 'stat ' + (st.saldo > 0 ? 'neg' : 'pos') }, el('b', { text: App.money(st.saldo) }), el('span', { text: 'Saldo por cobrar' }))),
        el('div', { class: 'box' }, el('h3', { text: 'Solicitudes asociadas' }),
          cots.length ? el('div', { class: 'table-wrap' }, el('table', {},
            el('thead', {}, el('tr', {}, ...['Folio', 'Fecha', 'Tensión', 'Etapa'].map((h) => el('th', { text: h })))),
            el('tbody', {}, cots.map((r) => el('tr', { class: 'click', onclick: () => { App.closeDrawer(); App.openSolicitud(r.id); } },
              el('td', { text: App.folio(r) }), el('td', { text: App.fmtDate(r.created_at) }), el('td', { text: r.tension }), el('td', {}, App.stageBadge(r.estado))))))) : el('div', { class: 'empty', text: 'Aún no hay solicitudes vinculadas. Vincúlalas desde el detalle de cada solicitud.' })),
        el('div', { class: 'box' }, el('h3', { text: 'Proformas' }),
          pf.length ? el('div', { class: 'table-wrap' }, el('table', {},
            el('thead', {}, el('tr', {}, ...['Número', 'Fecha', 'Estado', 'Total'].map((h, i) => el('th', { class: i === 3 ? 'num' : '', text: h })))),
            el('tbody', {}, pf.map((p) => el('tr', {}, el('td', { text: p.numero }), el('td', { text: App.fmtDate(p.created_at) }), el('td', {}, App.stageBadge(p.estado)), el('td', { class: 'num', text: App.money(p.total, p.moneda) })))))) : el('div', { class: 'empty', text: 'Sin proformas.' })),
        el('div', { class: 'box' }, el('div', { class: 'panel-head' }, el('h3', { text: 'Estado de cuenta' }),
          el('button', { class: 'btn small', type: 'button', text: '+ Registrar cobro', onclick: () => App.movimientoForm({ tipo: 'cobro', cliente_id: id }, () => openCliente(id)) })),
          st.rows.length ? el('div', { class: 'table-wrap' }, el('table', {},
            el('thead', {}, el('tr', {}, ...['Fecha', 'Concepto', 'Cargo', 'Abono', 'Saldo'].map((h, i) => el('th', { class: i > 1 ? 'num' : '', text: h })))),
            el('tbody', {}, st.rows.map((r) => el('tr', {}, el('td', { text: App.fmtDay(r.fecha) }), el('td', { text: r.concepto }),
              el('td', { class: 'num', text: r.cargo ? App.money(r.cargo) : '' }), el('td', { class: 'num', text: r.abono ? App.money(r.abono) : '' }), el('td', { class: 'num', text: App.money(r.saldo) })))))) : el('div', { class: 'empty', text: 'Sin movimientos.' })));
      App.openDrawer(node);
    });
  }
  App.openCliente = openCliente;

  App.register('clientes', 'Clientes', {
    async render(main) {
      const q = el('input', { class: 'grow', type: 'search', placeholder: 'Buscar cliente…' });
      const body = el('div', { class: 'table-wrap' });
      main.replaceChildren(el('div', { class: 'toolbar' }, q, el('button', { class: 'btn', type: 'button', text: '+ Nuevo cliente', onclick: () => App.clienteForm(null, () => App.views.clientes.render(main)) })), body);
      await App.guard(async () => {
        await App.loadDirs(true);
        const [cots, proformas, movs] = await Promise.all([App.get('cotizaciones', 'select=id,cliente_id,estado'), App.get('proformas', 'select=cotizacion_id,estado,total'), App.get('movimientos', "tipo=eq.cobro&select=cliente_id,monto")]);
        const draw = () => {
          const t = q.value.trim().toLowerCase();
          const rows = App.cache.clientes.filter((c) => !t || [c.nombre, c.empresa, c.correo, c.telefono, c.ruc].some((v) => (v || '').toLowerCase().includes(t)));
          if (!rows.length) return body.replaceChildren(el('div', { class: 'empty', text: 'No hay clientes. Se crean desde una solicitud ("Crear cliente") o con el botón de arriba.' }));
          body.replaceChildren(el('table', {},
            el('thead', {}, el('tr', {}, ...['Cliente', 'Contacto', 'Solicitudes', 'Por cobrar'].map((h, i) => el('th', { class: i > 1 ? 'num' : '', text: h })))),
            el('tbody', {}, rows.map((c) => {
              const mine = cots.filter((x) => x.cliente_id === c.id), ids = new Set(mine.map((x) => x.id));
              const fact = proformas.filter((p) => ids.has(p.cotizacion_id) && p.estado === 'aceptada').reduce((s, p) => s + Number(p.total), 0);
              const cob = movs.filter((m) => m.cliente_id === c.id).reduce((s, m) => s + Number(m.monto), 0);
              return el('tr', { class: 'click', onclick: () => openCliente(c.id) },
                el('td', {}, el('b', { text: c.nombre }), c.empresa ? el('div', { class: 'sub', text: c.empresa }) : null, c.activo ? null : App.badge('inactivo')),
                contactCell(c), el('td', { class: 'num', text: mine.length }), el('td', { class: 'num', text: App.money(App.r2(fact - cob)) }));
            }))));
        };
        q.addEventListener('input', draw); draw();
      });
    }
  });

  /* ---------------- Directorios de proveedores y transportistas ---------------- */
  function directory({ table, cache, tagKey, tagLabel, tagOptions, singular, extraFields }) {
    const fields = [
      { k: 'nombre', label: 'Nombre de la empresa', required: true }, { k: 'contacto', label: 'Persona de contacto' },
      { k: 'correo', label: 'Correo', type: 'email' }, { k: 'telefono', label: 'Teléfono' },
      { k: 'whatsapp', label: 'WhatsApp', hint: 'Solo dígitos con código de país (ej. 8613800000000).' }, { k: 'pais', label: 'País' },
      { k: tagKey, label: tagLabel, type: 'checks', options: tagOptions, required: true }, ...extraFields,
      { k: 'notas', label: 'Notas internas', type: 'textarea' }, { k: 'activo', label: 'Activo (aparece al enviar cotizaciones)', type: 'bool' }
    ];
    const edit = (rec, done) =>
      App.formDialog({
        title: rec ? `Editar ${singular}` : `Nuevo ${singular}`, fields, values: rec || {},
        onSubmit: async (v) => { v = cleanContact(v); rec ? await App.patch(table, rec.id, v) : await App.insert(table, v); await App.loadDirs(true); done(); },
        extraActions: rec && el('button', { class: 'btn danger', type: 'button', text: 'Eliminar', onclick: () => {
          if (!confirm(`¿Eliminar ${rec.nombre}? Si tiene cotizaciones o pagos asociados no se podrá; en ese caso desactívalo.`)) return;
          App.guard(async () => { await App.del(table, rec.id); await App.loadDirs(true); App.closeDialog(); done(); App.toast('Eliminado'); });
        } })
      });
    return async function render(container) {
      const q = el('input', { class: 'grow', type: 'search', placeholder: 'Buscar…' });
      const tagSel = el('select', {}, el('option', { value: '', text: `Todas (${tagLabel.toLowerCase()})` }), ...tagOptions.map(([k, l]) => el('option', { value: k, text: l })));
      const inact = el('input', { type: 'checkbox' });
      const body = el('div', { class: 'table-wrap' });
      container.replaceChildren(el('div', { class: 'toolbar' }, q, tagSel, el('label', { class: 'check' }, inact, 'Ver inactivos'),
        el('button', { class: 'btn', type: 'button', text: `+ Nuevo ${singular}`, onclick: () => edit(null, draw) })), body);
      function draw() {
        const t = q.value.trim().toLowerCase();
        const rows = (App.cache[cache] || []).filter((r) => (inact.checked || r.activo) && (!tagSel.value || (r[tagKey] || []).includes(tagSel.value)) &&
          (!t || [r.nombre, r.contacto, r.correo, r.telefono, r.pais].some((v) => (v || '').toLowerCase().includes(t))));
        if (!rows.length) return body.replaceChildren(el('div', { class: 'empty', text: `No hay ${singular}s con ese filtro. Agrega el primero con el botón de arriba.` }));
        body.replaceChildren(el('table', {}, el('thead', {}, el('tr', {}, ...['Nombre', 'Contacto', tagLabel, 'País'].map((h) => el('th', { text: h })))),
          el('tbody', {}, rows.map((r) => el('tr', { class: 'click', onclick: () => edit(r, draw) },
            el('td', {}, el('b', { text: r.nombre }), r.contacto ? el('div', { class: 'sub', text: r.contacto }) : null, r.activo ? null : App.badge('inactivo')),
            contactCell(r), el('td', {}, (r[tagKey] || []).map((k) => App.badge(App.label(tagOptions, k)))), el('td', { text: r.pais || '' }))))));
      }
      [q, tagSel, inact].forEach((x) => x.addEventListener('input', draw));
      await App.guard(async () => { await App.loadDirs(true); draw(); });
    };
  }

  const renderProveedores = directory({ table: 'proveedores', cache: 'proveedores', tagKey: 'especialidades', tagLabel: 'Especialidades', tagOptions: App.ESPECIALIDADES, singular: 'proveedor', extraFields: [] });

  /* Pipeline de ofertas de proveedores */
  async function renderOfertas(container) {
    container.replaceChildren(el('div', { class: 'empty', text: 'Cargando…' }));
    await App.guard(async () => {
      const rows = await App.get('rfq_proveedor', 'select=*,proveedores(nombre),cotizaciones(id,nombre,empresa,tension)&order=created_at.desc');
      const total = rows.filter((r) => ['aceptada', 'ordenada', 'entregada'].includes(r.estado)).reduce((s, r) => s + Number(r.precio_total || 0), 0);
      const board = App.board({
        stages: App.OFERTA_ETAPAS, items: rows, getStage: (r) => r.estado,
        cardFn: (r) => el('div', { class: 'card', onclick: () => App.openSolicitud(r.cotizacion_id, 'proveedores') },
          el('b', { text: r.proveedores ? r.proveedores.nombre : 'Proveedor' }),
          el('div', { class: 'meta', text: `${r.cotizaciones ? 'SOL-' + r.cotizacion_id.slice(0, 8).toUpperCase() + ' · ' + r.cotizaciones.nombre : ''}` }),
          r.precio_total ? el('div', { class: 'amt', text: App.money(r.precio_total, r.moneda) }) : null,
          r.plazo_dias ? el('div', { class: 'meta', text: `Plazo ${r.plazo_dias} días` }) : null),
        onMove: (r, estado) => App.guard(async () => {
          const body = { estado }; if (estado === 'respondida' && !r.respondida_at) body.respondida_at = new Date().toISOString();
          await App.patch('rfq_proveedor', r.id, body); App.toast('Oferta movida'); renderOfertas(container);
        })
      });
      container.replaceChildren(
        el('div', { class: 'stats' }, el('div', { class: 'stat' }, el('b', { text: rows.length }), el('span', { text: 'Ofertas / RFQ' })),
          el('div', { class: 'stat' }, el('b', { text: rows.filter((r) => r.estado === 'enviada').length }), el('span', { text: 'Esperando respuesta' })),
          el('div', { class: 'stat' }, el('b', { text: App.money(total) }), el('span', { text: 'Comprometido (aceptadas en adelante)' }))),
        el('p', { class: 'sub', text: 'Arrastra las tarjetas entre columnas para cambiar la etapa. Haz clic para abrir la solicitud.' }), rows.length ? board : el('div', { class: 'empty', text: 'Aún no has enviado solicitudes de cotización a proveedores.' }));
    });
  }

  App.register('proveedores', 'Proveedores', {
    async render(main) {
      const body = el('div');
      const seg = el('div', { class: 'seg' });
      const show = (which) => {
        [...seg.children].forEach((b) => b.classList.toggle('active', b.dataset.w === which));
        (which === 'ofertas' ? renderOfertas : renderProveedores)(body);
      };
      seg.append(el('button', { 'data-w': 'dir', type: 'button', text: 'Directorio', onclick: () => show('dir') }), el('button', { 'data-w': 'ofertas', type: 'button', text: 'Pipeline de ofertas', onclick: () => show('ofertas') }));
      main.replaceChildren(el('div', { class: 'toolbar' }, seg), body); show(App.provTab || 'dir');
    }
  });

  const renderTransportistas = directory({
    table: 'transportistas', cache: 'transportistas', tagKey: 'modalidades', tagLabel: 'Modalidades', tagOptions: App.MODALIDADES, singular: 'transportista',
    extraFields: [{ k: 'cobertura', label: 'Cobertura / rutas', type: 'textarea', placeholder: 'Ej. China → Colón (marítimo), Miami → Panamá (aéreo)…' }]
  });
  App.register('transportistas', 'Transportistas', { render: (main) => renderTransportistas(main) });

  /* ---------------- Catálogo de productos ---------------- */
  function productoForm(rec, done) {
    const fields = [
      { k: 'nombre', label: 'Nombre del producto', required: true, full: true }, { k: 'categoria', label: 'Categoría', type: 'select', options: App.ESPECIALIDADES },
      { k: 'unidad', label: 'Unidad (und, m, km, juego…)', required: true }, { k: 'costo_ref', label: 'Costo de referencia', type: 'number', hint: 'Lo que te cuesta normalmente. Se usa para pre-llenar el costeo.' },
      { k: 'moneda', label: 'Moneda', type: 'select', options: [['USD', 'USD'], ['PAB', 'PAB']], required: true },
      { k: 'proveedor_id', label: 'Proveedor habitual', type: 'select', options: App.cache.proveedores.map((p) => [p.id, p.nombre]) },
      { k: 'descripcion', label: 'Descripción / especificaciones', type: 'textarea' }, { k: 'activo', label: 'Activo (aparece al armar solicitudes y proformas)', type: 'bool' }
    ];
    App.formDialog({
      title: rec ? 'Editar producto' : 'Nuevo producto', fields, values: rec || { unidad: 'und', moneda: 'USD' },
      onSubmit: async (v) => { rec ? await App.patch('productos', rec.id, v) : await App.insert('productos', v); await App.loadDirs(true); done(); },
      extraActions: rec && [
        el('button', { class: 'btn ghost', type: 'button', text: 'Hojas de datos', onclick: () => App.openDialog(`Documentos — ${rec.nombre}`, App.docsBox({ scope: { producto_id: rec.id } }), true) }),
        el('button', { class: 'btn danger', type: 'button', text: 'Eliminar', onclick: () => {
          if (!confirm(`¿Eliminar ${rec.nombre}? También se borrarán sus documentos.`)) return;
          App.guard(async () => { await App.del('productos', rec.id); await App.loadDirs(true); App.closeDialog(); done(); App.toast('Eliminado'); });
        } })
      ]
    });
  }
  App.register('productos', 'Productos', {
    async render(main) {
      const q = el('input', { class: 'grow', type: 'search', placeholder: 'Buscar producto…' });
      const cat = el('select', {}, el('option', { value: '', text: 'Todas las categorías' }), ...App.ESPECIALIDADES.map(([k, l]) => el('option', { value: k, text: l })));
      const inact = el('input', { type: 'checkbox' }); const body = el('div', { class: 'table-wrap' });
      main.replaceChildren(el('div', { class: 'toolbar' }, q, cat, el('label', { class: 'check' }, inact, 'Ver inactivos'), el('button', { class: 'btn', type: 'button', text: '+ Nuevo producto', onclick: () => productoForm(null, draw) })), body);
      function draw() {
        const t = q.value.trim().toLowerCase();
        const rows = (App.cache.productos || []).filter((p) => (inact.checked || p.activo) && (!cat.value || p.categoria === cat.value) && (!t || [p.nombre, p.descripcion].some((v) => (v || '').toLowerCase().includes(t))));
        if (!rows.length) return body.replaceChildren(el('div', { class: 'empty', text: 'No hay productos. Agrega el primero con el botón de arriba: luego podrás elegirlo al crear solicitudes y costear proformas.' }));
        body.replaceChildren(el('table', {}, el('thead', {}, el('tr', {}, ...['Producto', 'Categoría', 'Unidad', 'Costo ref.', 'Proveedor habitual'].map((h, i) => el('th', { class: i === 3 ? 'num' : '', text: h })))),
          el('tbody', {}, rows.map((p) => el('tr', { class: 'click', onclick: () => productoForm(p, draw) },
            el('td', {}, el('b', { text: p.nombre }), p.descripcion ? el('div', { class: 'sub', text: p.descripcion.slice(0, 90) }) : null, p.activo ? null : App.badge('inactivo')),
            el('td', {}, p.categoria ? App.badge(App.label(App.ESPECIALIDADES, p.categoria)) : null), el('td', { text: p.unidad }), el('td', { class: 'num', text: p.costo_ref ? App.money(p.costo_ref, p.moneda) : '—' }),
            el('td', { text: (App.cache.proveedores.find((x) => x.id === p.proveedor_id) || {}).nombre || '' }))))));
      }
      [q, cat, inact].forEach((x) => x.addEventListener('input', draw));
      await App.guard(async () => { await App.loadDirs(true); draw(); });
    }
  });
})();
