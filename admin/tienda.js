/* Ficha de producto para la tienda virtual: foto, ficha técnica PDF, especificaciones y publicación.
   La imagen puede generarse sola: primera página del PDF o una tarjeta con las especificaciones. */
(() => {
  'use strict';
  const { el } = App;
  const BUCKET = 'catalogo';
  const enc = (path) => path.split('/').map(encodeURIComponent).join('/');
  App.catalogoUrl = (path) => `${App.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${enc(path)}`;
  const putObj = (path, blob, type) => App.api(`/storage/v1/object/${BUCKET}/${enc(path)}`, { method: 'POST', headers: { 'Content-Type': type, 'x-upsert': 'true' }, body: blob });
  const delObj = async (path) => { if (!path) return; try { await App.api(`/storage/v1/object/${BUCKET}/${enc(path)}`, { method: 'DELETE' }); } catch (_) {} };
  const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));

  // ---------- PDF (pdf.js incluido localmente) ----------
  function loadPdfLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!App._pdf) {
      App._pdf = new Promise((res, rej) => {
        const s = el('script', { src: 'vendor/pdf.min.js' });
        s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; res(window.pdfjsLib); };
        s.onerror = () => { App._pdf = null; rej(new Error('pdfjs')); };
        document.head.append(s);
      });
    }
    return App._pdf;
  }
  async function openPdf(blob) { const lib = await loadPdfLib(); return lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise; }
  async function pdfCover(blob) {
    const doc = await openPdf(blob); const page = await doc.getPage(1); const v0 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(2, 1400 / v0.width) }); const c = el('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); await page.render({ canvasContext: x, viewport: vp }).promise;
    return toBlob(c, 'image/jpeg', 0.88);
  }
  async function pdfLines(blob) {
    const doc = await openPdf(blob); const lines = [];
    for (let n = 1; n <= Math.min(doc.numPages, 3); n++) {
      const tc = await (await doc.getPage(n)).getTextContent(); const rows = new Map();
      tc.items.forEach((it) => { if (!it.str || !it.str.trim()) return; const y = Math.round(it.transform[5] / 3) * 3; if (!rows.has(y)) rows.set(y, []); rows.get(y).push(it); });
      [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
        items.sort((a, b) => a.transform[4] - b.transform[4]); let line = '', end = null;
        items.forEach((it) => { const gap = end === null ? 0 : it.transform[4] - end; line += (gap > 8 ? '  ' : gap > 1 ? ' ' : '') + it.str; end = it.transform[4] + (it.width || 0); });
        lines.push(line.trim());
      });
    }
    return lines.filter(Boolean);
  }
  /* Sugiere pares característica / valor a partir del texto del PDF */
  function suggestSpecs(lines) {
    const out = [], seen = new Set(), word = 'A-Za-zÁÉÍÓÚÜáéíóúüñÑ';
    for (const raw of lines) {
      const l = raw.trim(); if (l.length < 4 || l.length > 150) continue;
      const m = l.match(new RegExp(`^([${word}][^:：]{1,45}?)\\s*[:：]\\s*(\\S.{0,90})$`)) || l.match(new RegExp(`^([${word}][${word} ./()%-]{2,40}?)\\s{2,}(\\S.{0,80})$`));
      if (!m) continue; const k = m[1].replace(/\s+/g, ' ').trim(), v = m[2].trim();
      if (!/\d/.test(v) && v.split(/\s+/).length > 6) continue; // descarta frases largas
      const key = k.toLowerCase(); if (seen.has(key)) continue; seen.add(key); out.push({ k, v }); if (out.length >= 20) break;
    }
    return out;
  }

  // ---------- Imágenes ----------
  async function resizeImage(file, max = 1400) {
    const bmp = await createImageBitmap(file); const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = el('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
    return toBlob(c, 'image/jpeg', 0.88);
  }
  const fitText = (x, t, w) => { let s = String(t); if (x.measureText(s).width <= w) return s; while (s.length > 1 && x.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; };
  function wrapLines(x, text, w, max) {
    const words = String(text).split(/\s+/), lines = []; let cur = '';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (x.measureText(t).width > w && cur) { lines.push(cur); cur = wd; } else cur = t; }
    if (cur) lines.push(cur);
    if (lines.length > max) { lines.length = max; lines[max - 1] = fitText(x, lines[max - 1] + ' …', w); }
    return lines;
  }
  /* Tarjeta visual con el nombre y las especificaciones (cuando no hay foto) */
  function specCard({ nombre, categoria, specs, empresa }) {
    const W = 1200, H = 900, c = el('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#f57c00'; x.fillRect(0, 0, W, 20); x.fillRect(0, 0, 14, H);
    x.font = '700 26px system-ui, Arial, sans-serif'; x.fillStyle = '#b45309'; if (categoria) x.fillText(categoria.toUpperCase(), 70, 90);
    x.font = '700 54px system-ui, Arial, sans-serif'; x.fillStyle = '#14213d'; const title = wrapLines(x, nombre || 'Producto', W - 140, 2); title.forEach((l, i) => x.fillText(l, 70, 160 + i * 64));
    let y = 160 + title.length * 64 + 20; x.fillStyle = '#e1e6f0'; x.fillRect(70, y, W - 140, 3); y += 24;
    const rows = (specs || []).filter((s) => s.k && s.v).slice(0, 8);
    rows.forEach((s, i) => {
      if (i % 2 === 0) { x.fillStyle = '#f8fafc'; x.fillRect(70, y, W - 140, 66); }
      x.font = '400 28px system-ui, Arial, sans-serif'; x.fillStyle = '#5b6785'; x.fillText(fitText(x, s.k, 440), 90, y + 44);
      x.font = '700 30px system-ui, Arial, sans-serif'; x.fillStyle = '#14213d'; x.fillText(fitText(x, s.v, 560), 560, y + 44); y += 66;
    });
    if (!rows.length) { x.font = '400 30px system-ui, Arial, sans-serif'; x.fillStyle = '#5b6785'; x.fillText('Ficha técnica disponible bajo solicitud', 70, y + 50); }
    x.font = '400 24px system-ui, Arial, sans-serif'; x.fillStyle = '#94a3b8'; x.fillText(empresa || '', 70, H - 40);
    return toBlob(c, 'image/jpeg', 0.9);
  }

  // ---------- Formulario ----------
  const field = (label, node, hint) => el('div', { class: 'field' }, el('label', { text: label }), node, hint ? el('div', { class: 'hint', text: hint }) : null);
  const selEl = (opts, v) => { const s = el('select', {}, ...opts.map(([k, l]) => el('option', { value: k, text: l }))); s.value = v ?? ''; return s; };

  App.productoFicha = (rec, done) => {
    const st = { id: rec ? rec.id : crypto.randomUUID(), img: rec ? rec.imagen_path : null, pdf: rec ? rec.ficha_path : null, pdfName: rec ? rec.ficha_nombre : null, pendingImg: null, pendingPdf: null,
      specs: ((rec && rec.especificaciones) || []).map((s) => ({ ...s })) };
    const f = {
      nombre: el('input', { value: rec ? rec.nombre : '' }), categoria: selEl([['', '—'], ...App.ESPECIALIDADES], rec && rec.categoria), unidad: el('input', { value: rec ? rec.unidad : 'und' }),
      costo: el('input', { type: 'number', step: 'any', min: '0', value: rec && rec.costo_ref !== null && rec.costo_ref !== undefined ? rec.costo_ref : '' }), moneda: selEl([['USD', 'USD'], ['PAB', 'PAB']], rec ? rec.moneda : 'USD'),
      prov: selEl([['', '—'], ...(App.cache.proveedores || []).map((p) => [p.id, p.nombre])], rec && rec.proveedor_id), descripcion: el('textarea', { value: rec ? rec.descripcion || '' : '', placeholder: 'Descripción corta que verá el cliente en la tienda' }),
      activo: el('input', { type: 'checkbox', checked: rec ? !!rec.activo : true }), publicado: el('input', { type: 'checkbox', checked: rec ? !!rec.publicado : false }), orden: el('input', { type: 'number', step: '1', value: rec ? rec.orden || 0 : 0 })
    };
    const err = el('div', { class: 'msg-err', hidden: true }); const fail = (m) => { err.textContent = m; err.hidden = false; };
    const status = el('span', { class: 'sub' });
    const busy = async (msg, fn) => { status.textContent = msg; try { return await fn(); } catch (e) { fail(e.message === 'pdfjs' ? 'No se pudo cargar el lector de PDF.' : 'No se pudo completar. Revisa el archivo e intenta de nuevo.'); } finally { status.textContent = ''; } };

    // ---- imagen
    const imgBox = el('div', { class: 'ficha-img' });
    function showImg() {
      imgBox.replaceChildren();
      if (st.pendingImg) imgBox.append(el('img', { src: URL.createObjectURL(st.pendingImg), alt: 'Vista previa' }));
      else if (st.img) imgBox.append(el('img', { src: App.catalogoUrl(st.img), alt: 'Imagen del producto' }));
      else imgBox.append(el('div', { class: 'sub', text: 'Sin imagen' }));
    }
    const photo = el('input', { type: 'file', accept: 'image/*', hidden: true });
    photo.addEventListener('change', () => busy('Procesando foto…', async () => { st.pendingImg = await resizeImage(photo.files[0]); photo.value = ''; showImg(); }));
    const pdfSource = async () => { if (st.pendingPdf) return st.pendingPdf; if (st.pdf) return (await fetch(App.catalogoUrl(st.pdf))).blob(); return null; };
    const currentSpecs = () => st.specs.filter((s) => s.k.trim() && s.v.trim()).map((s) => ({ k: s.k.trim(), v: s.v.trim() }));
    const catLabel = () => (f.categoria.value ? App.label(App.ESPECIALIDADES, f.categoria.value) : '');
    const makeCard = () => specCard({ nombre: f.nombre.value.trim(), categoria: catLabel(), specs: currentSpecs(), empresa: (App.brand && App.brand.name) || '' });

    // ---- PDF
    const pdfName = el('span', { class: 'sub' }); const pdfIn = el('input', { type: 'file', accept: 'application/pdf', hidden: true });
    const showPdf = () => { pdfName.textContent = st.pendingPdf ? `${st.pendingPdf.name} (se subirá al guardar)` : st.pdf ? `Ficha actual: ${st.pdfName || 'ficha.pdf'}` : 'Sin ficha PDF'; };
    pdfIn.addEventListener('change', () => { const file = pdfIn.files[0]; pdfIn.value = ''; if (!file) return; if (file.size > 15 * 1024 * 1024) return fail('El PDF supera 15 MB.'); st.pendingPdf = file; err.hidden = true; showPdf(); });

    // ---- especificaciones
    const specList = el('div');
    function drawSpecs() {
      specList.replaceChildren(...st.specs.map((s, i) => { const k = el('input', { value: s.k, placeholder: 'Característica (ej. Calibre)' }), v = el('input', { value: s.v, placeholder: 'Valor (ej. 477 kcmil)' });
        k.addEventListener('input', () => (s.k = k.value)); v.addEventListener('input', () => (s.v = v.value));
        return el('div', { class: 'itemrow', style: 'grid-template-columns:1fr 1.4fr auto' }, k, v, el('button', { class: 'btn ghost small', type: 'button', text: '✕', onclick: () => { st.specs.splice(i, 1); drawSpecs(); } })); }));
    }

    const publishedBox = el('div', { class: 'box' }, el('h3', { text: 'Tienda virtual' }),
      el('p', { class: 'sub', text: 'Los productos publicados aparecen solos en la página pública, con su imagen, especificaciones y ficha PDF. Nunca se muestra el costo ni el proveedor.' }),
      el('label', { class: 'check' }, f.publicado, 'Publicar en la tienda (visible para todos)'), el('div', { class: 'grid2' }, field('Orden', f.orden, 'Los números menores aparecen primero')),
      el('h4', { text: 'Imagen' }), imgBox,
      el('div', { class: 'actions' }, el('button', { class: 'btn small', type: 'button', text: 'Subir foto', onclick: () => photo.click() }),
        el('button', { class: 'btn ghost small', type: 'button', text: 'Usar la 1.ª página del PDF', onclick: () => busy('Leyendo el PDF…', async () => { const src = await pdfSource(); if (!src) return fail('Primero sube la ficha PDF.'); st.pendingImg = await pdfCover(src); showImg(); }) }),
        el('button', { class: 'btn ghost small', type: 'button', text: 'Generar tarjeta con las especificaciones', onclick: () => busy('Generando…', async () => { st.pendingImg = await makeCard(); showImg(); }) }),
        el('button', { class: 'btn ghost small', type: 'button', text: 'Quitar imagen', onclick: () => { st.pendingImg = null; st.img = null; showImg(); } }), photo),
      el('h4', { text: 'Ficha técnica (PDF)' }), el('div', { class: 'actions' }, el('button', { class: 'btn small', type: 'button', text: 'Subir ficha PDF', onclick: () => pdfIn.click() }),
        el('button', { class: 'btn ghost small', type: 'button', text: 'Quitar PDF', onclick: () => { st.pendingPdf = null; st.pdf = null; st.pdfName = null; showPdf(); } }), pdfIn, pdfName),
      el('h4', { text: 'Especificaciones' }), specList,
      el('div', { class: 'actions' }, el('button', { class: 'btn ghost small', type: 'button', text: '+ Característica', onclick: () => { st.specs.push({ k: '', v: '' }); drawSpecs(); } }),
        el('button', { class: 'btn ghost small', type: 'button', text: 'Sugerir desde el PDF', onclick: () => busy('Leyendo el PDF…', async () => {
          const src = await pdfSource(); if (!src) return fail('Primero sube la ficha PDF.');
          const have = new Set(st.specs.map((s) => s.k.trim().toLowerCase())); const sug = suggestSpecs(await pdfLines(src)).filter((s) => !have.has(s.k.toLowerCase()));
          if (!sug.length) return fail('No encontré pares "característica: valor" en el PDF. Escríbelos a mano.'); st.specs.push(...sug); drawSpecs(); App.toast(`${sug.length} sugerencia(s) agregada(s): revísalas y corrige`);
        }) }), status));

    const save = async () => {
      err.hidden = true; const nombre = f.nombre.value.trim(), unidad = f.unidad.value.trim();
      if (nombre.length < 2) return fail('Indica el nombre del producto.'); if (!unidad) return fail('Indica la unidad.');
      const body = { nombre, categoria: f.categoria.value || null, unidad, descripcion: f.descripcion.value.trim() || null, costo_ref: f.costo.value === '' ? null : Math.max(0, Number(f.costo.value) || 0), moneda: f.moneda.value,
        proveedor_id: f.prov.value || null, activo: f.activo.checked, publicado: f.publicado.checked, orden: parseInt(f.orden.value, 10) || 0, especificaciones: currentSpecs() };
      await App.guard(async () => {
        const old = { img: rec && rec.imagen_path, pdf: rec && rec.ficha_path };
        if (body.publicado && !st.img && !st.pendingImg && body.especificaciones.length) st.pendingImg = await makeCard(); // sin foto: se genera la tarjeta
        if (st.pendingImg) { const path = `productos/${st.id}/imagen-${Date.now()}.jpg`; await putObj(path, st.pendingImg, 'image/jpeg'); body.imagen_path = path; } else body.imagen_path = st.img || null;
        if (st.pendingPdf) { const path = `productos/${st.id}/ficha-${Date.now()}.pdf`; await putObj(path, st.pendingPdf, 'application/pdf'); body.ficha_path = path; body.ficha_nombre = st.pendingPdf.name; } else { body.ficha_path = st.pdf || null; body.ficha_nombre = st.pdf ? st.pdfName : null; }
        rec ? await App.patch('productos', rec.id, body) : await App.insert('productos', { id: st.id, ...body });
        if (old.img && old.img !== body.imagen_path) delObj(old.img); if (old.pdf && old.pdf !== body.ficha_path) delObj(old.pdf);
        await App.loadDirs(true); App.closeDialog(); App.toast(body.publicado ? 'Producto guardado y publicado en la tienda' : 'Producto guardado'); done && done();
      });
    };
    const form = el('div', {},
      el('div', { class: 'grid2' }, field('Nombre del producto *', f.nombre), field('Categoría', f.categoria), field('Unidad *', f.unidad, 'und, m, km, juego…'), field('Costo de referencia (interno)', f.costo, 'No se muestra en la tienda'),
        field('Moneda', f.moneda), field('Proveedor habitual (interno)', f.prov)), field('Descripción', f.descripcion), el('label', { class: 'check' }, f.activo, 'Activo (aparece al armar solicitudes y proformas)'),
      publishedBox, err,
      el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: 'Guardar', onclick: save }),
        rec && el('button', { class: 'btn ghost', type: 'button', text: 'Documentos internos', onclick: () => App.openDialog(`Documentos — ${rec.nombre}`, App.docsBox({ scope: { producto_id: rec.id } }), true) }),
        rec && el('button', { class: 'btn danger', type: 'button', text: 'Eliminar', onclick: () => {
          if (!confirm(`¿Eliminar ${rec.nombre}? También se borrarán su imagen, ficha y documentos.`)) return;
          App.guard(async () => { await App.del('productos', rec.id); delObj(rec.imagen_path); delObj(rec.ficha_path); await App.loadDirs(true); App.closeDialog(); App.toast('Eliminado'); done && done(); });
        } })));
    showImg(); showPdf(); drawSpecs();
    App.openDialog(rec ? 'Editar producto' : 'Nuevo producto', form, true);
  };
})();
