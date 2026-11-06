/* Vista: Finanzas (movimientos, cuentas por cobrar y por pagar) y formulario de movimientos. */
(() => {
  'use strict';
  const { el } = App;
  const OK_RFQ = ['aceptada', 'ordenada', 'entregada'];
  const fleteCost = (f) => App.r2((Number(f.flete_usd) || 0) + (Number(f.seguro_usd) || 0) + (Number(f.gastos_origen_usd) || 0) + (Number(f.gastos_destino_usd) || 0));
  const sumBy = (arr, fn) => App.r2(arr.reduce((s, x) => s + fn(x), 0));

  /* Formulario para registrar un cobro, pago o gasto */
  App.movimientoForm = (defaults, onSaved) => {
    App.guard(async () => {
      await App.loadDirs();
      const opt = (arr) => arr.map((x) => [x.id, x.nombre]);
      const fields = [
        { k: 'tipo', label: 'Tipo de movimiento', type: 'select', options: App.MOV_TIPOS, required: true },
        { k: 'fecha', label: 'Fecha', type: 'date', required: true }, { k: 'monto', label: 'Monto', type: 'number', required: true },
        { k: 'moneda', label: 'Moneda', type: 'select', options: [['USD', 'USD'], ['PAB', 'PAB']], required: true },
        { k: 'metodo', label: 'Método de pago', type: 'select', options: App.METODOS }, { k: 'referencia', label: 'Referencia / n.º de comprobante' },
        { k: 'cliente_id', label: 'Cliente (para cobros)', type: 'select', options: opt(App.cache.clientes) },
        { k: 'proveedor_id', label: 'Proveedor (para pagos a proveedor)', type: 'select', options: opt(App.cache.proveedores) },
        { k: 'transportista_id', label: 'Transportista (para pagos de flete)', type: 'select', options: opt(App.cache.transportistas) },
        { k: 'notas', label: 'Notas', type: 'textarea' }
      ];
      App.formDialog({
        title: 'Registrar movimiento', fields, values: { fecha: App.today(), moneda: 'USD', ...defaults },
        onSubmit: async (v) => {
          const need = { cobro: ['cliente_id', 'el cliente'], pago_proveedor: ['proveedor_id', 'el proveedor'], pago_transportista: ['transportista_id', 'el transportista'] }[v.tipo];
          const fail = (m) => { const e = new Error(m); e.userMessage = m; throw e; };
          if (!(v.monto > 0)) fail('El monto debe ser mayor que cero.');
          if (need && !v[need[0]]) fail(`Indica ${need[1]}.`);
          await App.insert('movimientos', { ...v, cotizacion_id: defaults.cotizacion_id || null, proforma_id: defaults.proforma_id || null });
          App.toast('Movimiento registrado'); onSaved && onSaved();
        }
      });
    });
  };

  App.register('finanzas', 'Finanzas', {
    async render(main) {
      const seg = el('div', { class: 'seg' }); const stats = el('div', { class: 'stats' }); const body = el('div');
      main.replaceChildren(el('div', { class: 'toolbar' }, seg, el('button', { class: 'btn', type: 'button', text: '+ Registrar movimiento', onclick: () => App.movimientoForm({}, () => App.views.finanzas.render(main)) })), stats, body);
      let tab = App.finTab || 'mov';
      await App.guard(async () => {
        await App.loadDirs();
        const [movs, proformas, cots, rfqs, fletes] = await Promise.all([
          App.get('movimientos', 'select=*&order=fecha.desc,created_at.desc&limit=2000'), App.get('proformas', 'select=id,cotizacion_id,estado,total,numero,moneda'),
          App.get('cotizaciones', 'select=id,cliente_id'), App.get('rfq_proveedor', 'select=proveedor_id,estado,precio_total,moneda'),
          App.get('cotizaciones_flete', 'select=transportista_id,estado,flete_usd,seguro_usd,gastos_origen_usd,gastos_destino_usd')
        ]);
        const cliOf = Object.fromEntries(cots.map((c) => [c.id, c.cliente_id]));
        const aceptadas = proformas.filter((p) => p.estado === 'aceptada');
        const cxc = App.cache.clientes.map((c) => {
          const fact = sumBy(aceptadas.filter((p) => cliOf[p.cotizacion_id] === c.id), (p) => Number(p.total));
          const cob = sumBy(movs.filter((m) => m.tipo === 'cobro' && m.cliente_id === c.id), (m) => Number(m.monto));
          return { c, fact, cob, saldo: App.r2(fact - cob) };
        }).filter((x) => x.fact || x.cob);
        const sinCliente = aceptadas.filter((p) => !cliOf[p.cotizacion_id]).length;
        const cxpProv = App.cache.proveedores.map((p) => {
          const comp = sumBy(rfqs.filter((x) => x.proveedor_id === p.id && OK_RFQ.includes(x.estado) && ['USD', 'PAB'].includes(x.moneda)), (x) => Number(x.precio_total || 0));
          const pag = sumBy(movs.filter((m) => m.tipo === 'pago_proveedor' && m.proveedor_id === p.id), (m) => Number(m.monto));
          return { n: p.nombre, comp, pag, saldo: App.r2(comp - pag) };
        }).filter((x) => x.comp || x.pag);
        const cxpTr = App.cache.transportistas.map((t) => {
          const comp = sumBy(fletes.filter((x) => x.transportista_id === t.id && x.estado === 'contratada'), fleteCost);
          const pag = sumBy(movs.filter((m) => m.tipo === 'pago_transportista' && m.transportista_id === t.id), (m) => Number(m.monto));
          return { n: t.nombre, comp, pag, saldo: App.r2(comp - pag) };
        }).filter((x) => x.comp || x.pag);

        const mes = App.today().slice(0, 7);
        const mm = movs.filter((m) => m.fecha.startsWith(mes));
        const cobMes = sumBy(mm.filter((m) => m.tipo === 'cobro'), (m) => Number(m.monto)), pagMes = sumBy(mm.filter((m) => m.tipo !== 'cobro'), (m) => Number(m.monto));
        const porCobrar = sumBy(cxc, (x) => x.saldo), porPagar = sumBy([...cxpProv, ...cxpTr], (x) => x.saldo);
        stats.replaceChildren(...[['Por cobrar', App.money(porCobrar), porCobrar > 0 ? 'neg' : 'pos'], ['Por pagar', App.money(porPagar), ''], ['Cobrado este mes', App.money(cobMes), 'pos'],
          ['Pagado este mes', App.money(pagMes), ''], ['Flujo neto del mes', App.money(App.r2(cobMes - pagMes)), cobMes - pagMes >= 0 ? 'pos' : 'neg']].map(([l, v, k]) => el('div', { class: 'stat ' + k }, el('b', { text: v }), el('span', { text: l }))));

        const party = (m) => {
          if (m.cliente_id) return (App.cache.clientes.find((x) => x.id === m.cliente_id) || {}).nombre;
          if (m.proveedor_id) return (App.cache.proveedores.find((x) => x.id === m.proveedor_id) || {}).nombre;
          if (m.transportista_id) return (App.cache.transportistas.find((x) => x.id === m.transportista_id) || {}).nombre;
          return '';
        };
        const simpleTable = (title, rows, cols, onRow) => el('div', { class: 'box' }, el('h3', { text: title }),
          rows.length ? el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ...cols.map((h, i) => el('th', { class: i ? 'num' : '', text: h })))),
            el('tbody', {}, rows.map((r) => el('tr', { class: onRow ? 'click' : '', onclick: onRow ? () => onRow(r) : null }, el('td', {}, el('b', { text: r.n })), el('td', { class: 'num', text: App.money(r.a) }), el('td', { class: 'num', text: App.money(r.b) }), el('td', { class: 'num', text: App.money(r.saldo) })))),
            el('tfoot', {}, el('tr', {}, el('td', { text: 'Total' }), el('td', { class: 'num', text: App.money(sumBy(rows, (r) => r.a)) }), el('td', { class: 'num', text: App.money(sumBy(rows, (r) => r.b)) }), el('td', { class: 'num', text: App.money(sumBy(rows, (r) => r.saldo)) }))))) : el('div', { class: 'empty', text: 'Sin datos todavía.' }));

        function draw() {
          App.finTab = tab;
          [...seg.children].forEach((b) => b.classList.toggle('active', b.dataset.t === tab));
          if (tab === 'cxc') {
            body.replaceChildren(sinCliente ? el('div', { class: 'box' }, el('b', { text: `⚠ ${sinCliente} proforma(s) aceptada(s) pertenecen a solicitudes sin cliente vinculado y no aparecen aquí. Vincúlalas desde la pestaña Resumen de cada solicitud.` })) : null,
              simpleTable('Cuentas por cobrar (proformas aceptadas − cobros)', cxc.map((x) => ({ n: x.c.nombre, a: x.fact, b: x.cob, saldo: x.saldo, id: x.c.id })), ['Cliente', 'Facturado', 'Cobrado', 'Saldo'], (r) => App.openCliente(r.id)));
          } else if (tab === 'cxp') {
            body.replaceChildren(el('p', { class: 'sub', text: 'Comprometido = ofertas aceptadas / con orden / entregadas (proveedores) y fletes contratados (transportistas), en USD/PAB.' }),
              simpleTable('Proveedores', cxpProv.map((x) => ({ n: x.n, a: x.comp, b: x.pag, saldo: x.saldo })), ['Proveedor', 'Comprometido', 'Pagado', 'Saldo']),
              simpleTable('Transportistas', cxpTr.map((x) => ({ n: x.n, a: x.comp, b: x.pag, saldo: x.saldo })), ['Transportista', 'Comprometido', 'Pagado', 'Saldo']));
          } else drawMov();
        }
        function drawMov() {
          const q = el('input', { class: 'grow', type: 'search', placeholder: 'Buscar por parte, referencia o notas…' });
          const ft = el('select', {}, el('option', { value: '', text: 'Todos los tipos' }), ...App.MOV_TIPOS.map(([k, l]) => el('option', { value: k, text: l })));
          const d1 = el('input', { type: 'date', title: 'Desde' }), d2 = el('input', { type: 'date', title: 'Hasta' }); const list = el('div', { class: 'table-wrap' });
          const rowsF = () => { const t = q.value.trim().toLowerCase(); return movs.filter((m) => (!ft.value || m.tipo === ft.value) && (!d1.value || m.fecha >= d1.value) && (!d2.value || m.fecha <= d2.value) && (!t || [party(m), m.referencia, m.notas].some((v) => (v || '').toLowerCase().includes(t)))); };
          const paint = () => {
            const rows = rowsF();
            list.replaceChildren(rows.length ? el('table', {}, el('thead', {}, el('tr', {}, ...['Fecha', 'Tipo', 'Parte', 'Detalle', 'Monto', ''].map((h, i) => el('th', { class: i === 4 ? 'num' : '', text: h })))),
              el('tbody', {}, rows.map((m) => el('tr', {}, el('td', { text: App.fmtDay(m.fecha) }), el('td', { text: App.label(App.MOV_TIPOS, m.tipo) }), el('td', { text: party(m) || '' }), el('td', { text: [m.metodo, m.referencia, m.notas].filter(Boolean).join(' · ') }),
                el('td', { class: 'num', text: (m.tipo === 'cobro' ? '+ ' : '− ') + App.money(m.monto, m.moneda) }),
                el('td', {}, el('button', { class: 'btn ghost small', type: 'button', text: '✕', onclick: () => confirm('¿Eliminar este movimiento?') && App.guard(async () => { await App.del('movimientos', m.id); App.views.finanzas.render(main); }) })))))) : el('div', { class: 'empty', text: 'No hay movimientos con ese filtro.' }));
          };
          [q, ft, d1, d2].forEach((x) => x.addEventListener('input', paint));
          body.replaceChildren(el('div', { class: 'toolbar' }, q, ft, d1, d2, el('button', { class: 'btn ghost', type: 'button', text: 'Exportar CSV', onclick: () => App.download('movimientos.csv', App.csv(['fecha', 'tipo', 'parte', 'monto', 'moneda', 'metodo', 'referencia', 'notas'], rowsF().map((m) => ({ ...m, parte: party(m) })))) })), list); paint();
        }
        seg.replaceChildren(...[['mov', 'Movimientos'], ['cxc', 'Por cobrar'], ['cxp', 'Por pagar']].map(([k, l]) => el('button', { type: 'button', 'data-t': k, text: l, onclick: () => { tab = k; draw(); } })));
        draw();
      });
    }
  });
})();
