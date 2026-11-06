/* Importar proveedores / transportistas desde texto pegado (web, correo, WhatsApp) o desde Excel/CSV.
   Extrae los datos con reglas (sin servicios externos) y muestra una vista previa para corregir antes de guardar. */
(() => {
  'use strict';
  const { el } = App;

  // Palabras clave (español e inglés) para sugerir especialidades / modalidades
  App.IMPORT_RULES = {
    proveedores: [
      ['conductores', /acsr|aaac|acss|conductor|alumin|\bcables?\b|\bwire\b|overhead line/i],
      ['estructuras', /torre|tower|poste|\bpoles?\b|cruceta|crossarm|steel structure|estructura|galvaniz/i],
      ['aislamiento', /aislador|insulator|herraje|fittings?|hardware|clamp|grapa|connector|conector/i],
      ['proteccion', /apartarrayo|arrester|surge|fusible|\bfuses?\b|cutout|seccionador|recloser|reconectador|grounding|puesta a tierra/i],
      ['opgw', /opgw|fibra|fiber|fibre|optical/i],
      ['tendido', /stringing|tendido|pulley|polea/i],
      ['transformadores', /transformer|transformador|\bkva\b|\bmva\b|pad.?mount|substation|subestaci/i],
      ['alumbrado', /luminaire|luminaria|lighting|street ?light|alumbrado|\bled\b|\blamp\b|l[aá]mpara|fotocelda/i]
    ],
    transportistas: [
      ['maritimo', /mar[ií]tim|maritime|sea ?freight|ocean|\bfcl\b|\blcl\b|naviera|shipping line|contenedor|container/i],
      ['aereo', /a[eé]reo|air ?freight|air ?cargo|airline|courier/i],
      ['terrestre', /terrestre|truck|trucking|road ?freight|ground|cami[oó]n|carretera/i],
      ['multimodal', /multimodal|freight forward|forwarder|log[ií]stic|door.?to.?door/i]
    ]
  };

  const COUNTRY_NAMES = [['China', /\bchina\b|\bprc\b|shanghai|shenzhen|guangzhou|zhejiang|jiangsu|tianjin|beijing/i], ['Colombia', /colombia|bogot[aá]|medell[ií]n|barranquilla|cartagena/i], ['México', /m[eé]xico|monterrey|guadalajara/i],
    ['Panamá', /panam[aá]|zona libre|col[oó]n\b/i], ['Venezuela', /venezuela|caracas|maracaibo/i], ['Estados Unidos', /united states|\busa\b|estados unidos|miami|florida|houston/i], ['España', /espa[nñ]a|spain|madrid|barcelona/i],
    ['Brasil', /brasil|brazil|s[aã]o paulo/i], ['Argentina', /argentina|buenos aires/i], ['Chile', /\bchile\b/i], ['Perú', /per[uú]\b/i], ['Ecuador', /ecuador|guayaquil|quito/i], ['India', /\bindia\b|mumbai|delhi/i],
    ['Turquía', /turqu[ií]a|turkey|t[uü]rkiye|istanbul/i], ['Italia', /italia|italy/i], ['Alemania', /alemania|germany|deutschland/i], ['Corea del Sur', /korea/i], ['Taiwán', /taiwan|taiw[aá]n/i], ['Japón', /japan|jap[oó]n/i]];
  const PREFIX = { 86: 'China', 57: 'Colombia', 52: 'México', 507: 'Panamá', 58: 'Venezuela', 1: 'Estados Unidos / Canadá', 34: 'España', 55: 'Brasil', 54: 'Argentina', 56: 'Chile', 51: 'Perú', 593: 'Ecuador', 886: 'Taiwán', 91: 'India', 90: 'Turquía', 49: 'Alemania', 39: 'Italia', 82: 'Corea del Sur', 81: 'Japón' };
  const TLD = { cn: 'China', co: 'Colombia', mx: 'México', pa: 'Panamá', ve: 'Venezuela', es: 'España', br: 'Brasil', ar: 'Argentina', cl: 'Chile', pe: 'Perú', ec: 'Ecuador', tw: 'Taiwán', in: 'India', tr: 'Turquía', de: 'Alemania', it: 'Italia', kr: 'Corea del Sur', jp: 'Japón' };

  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const URL_RE = /\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+/gi;
  const LABEL = /^(?:company|empresa|raz[oó]n social|name|nombre|proveedor|supplier|manufacturer|fabricante)\s*[:：-]\s*/i;
  const LEGAL = /\b(S\.?\s?A\.?(?:\s?S\.?)?|S\.?\s?R\.?\s?L\.?|LTDA|Ltd\.?|Limited|Inc\.?|Corp\.?|Corporation|GmbH|C\.?\s?A\.?|Company|Group|Grupo|Industries|Industrial|Electric|Electrical|Power|Cables?|Technology|Technologies)\b/i;
  const NOT_NAME = /^(tel|phone|mobile|m[oó]vil|cel|fax|email|e-mail|correo|web|website|address|direcci[oó]n|domicilio|contact|contacto|attn|atenci[oó]n|whatsapp|wechat|skype|rif|ruc|nit|tax|vat|cif)\b/i;

  // Prioridad: prefijo del teléfono (+) > dominio del correo/web > país más mencionado en el texto
  function detectCountry(text, phones, hosts) {
    const p = phones.find((x) => x.plus);
    if (p) for (const len of [3, 2, 1]) { const c = PREFIX[p.digits.slice(0, len)]; if (c) return c; }
    for (const h of hosts) { const tld = h.split('.').pop().toLowerCase(); if (TLD[tld]) return TLD[tld]; }
    const counts = COUNTRY_NAMES.map(([name, re]) => [name, (text.match(new RegExp(re.source, 'gi')) || []).length]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    return counts.length ? counts[0][0] : null;
  }
  const isDateLike = (s) => /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(s) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s);
  function findPhones(lines) {
    const out = [];
    lines.forEach((line) => {
      // los números de RIF/RUC/NIT y las direcciones no son teléfonos
      if (/^(?:rif|ruc|nit|c\.?i\.?f\.?|tax|vat|n[º°o]\s*fiscal|address|direcci[oó]n|domicilio)\b/i.test(line)) return;
      const clean = line.replace(EMAIL, ' ').replace(URL_RE, ' ').replace(/wa\.me\/\d+/gi, ' ');
      const wa = /whats|\bwa\b|wechat|m[oó]vil|movil|mobile|\bcel/i.test(line);
      for (const m of clean.matchAll(/(\+?\d[\d\s().-]{6,}\d)/g)) {
        const raw = m[1].trim(), digits = raw.replace(/\D/g, '');
        if (digits.length < 8 || digits.length > 15 || isDateLike(raw)) continue;
        out.push({ raw, digits, plus: raw.startsWith('+'), wa });
      }
    });
    return out;
  }
  const titleCase = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  /* Un bloque de texto = un proveedor */
  function parseBlock(block, detect) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const emails = [...new Set((block.match(EMAIL) || []).map((e) => e.toLowerCase()))];
    const urls = [...new Set((block.match(URL_RE) || []).map((u) => u.replace(/[),.;]+$/, '')))];
    const waLinks = [...block.matchAll(/wa\.me\/(\d{8,15})|api\.whatsapp\.com\/send\?phone=(\d{8,15})/gi)].map((m) => m[1] || m[2]);
    const phones = findPhones(lines);
    const hosts = [...emails.map((e) => e.split('@')[1]), ...urls.map((u) => u.replace(/^https?:\/\//i, '').split('/')[0])].map((h) => h.replace(/^www\./i, ''));

    // Nombre: línea con sufijo legal entre las primeras; si no, la primera línea "limpia"
    const cand = lines.filter((l) => l.length <= 120 && !l.includes('@') && !/^https?:|^www\./i.test(l) && !NOT_NAME.test(l) && (l.replace(/[\d\s+().-]/g, '').length > 2)).map((l) => l.replace(LABEL, ''));
    let nombre = cand.slice(0, 6).find((l) => LEGAL.test(l)) || cand[0] || '';
    if (!nombre && hosts[0]) nombre = titleCase(hosts[0].split('.')[0]);
    // Contacto: "Contact: Fulano"
    let contacto = null;
    for (const l of lines) { const m = l.match(/^(?:contact(?:o)?(?: person)?|persona de contacto|attn\.?|atenci[oó]n|sales(?: manager)?|ventas)\s*[:：-]\s*(.{2,80})$/i); if (m && !m[1].includes('@') && !/\d{5,}/.test(m[1])) { contacto = m[1].trim(); break; } }

    const first = phones.find((p) => !p.wa) || phones[0];
    const waPhone = waLinks[0] ? { digits: waLinks[0] } : phones.find((p) => p.wa);
    const otrosCorreos = emails.slice(1), otrosTel = phones.filter((p) => p !== first && (!waPhone || p.digits !== waPhone.digits)).map((p) => p.raw);
    const notas = [urls[0] && `Sitio web: ${urls[0]}`, otrosCorreos.length && `Otros correos: ${otrosCorreos.join(', ')}`, otrosTel.length && `Otros teléfonos: ${otrosTel.join(', ')}`].filter(Boolean).join('\n');
    return { nombre: nombre.slice(0, 160), contacto, correo: emails[0] || null, telefono: first ? first.raw : null, whatsapp: waPhone ? waPhone.digits : null,
      waFromPhone: !waPhone && !!first && first.plus, pais: detectCountry(block, phones, hosts), tags: detect(block), notas: notas || null };
  }

  /* Tabla (pegada o archivo) con encabezados */
  const COLS = { nombre: ['nombre', 'empresa', 'proveedor', 'company', 'razon social', 'name', 'supplier', 'compania', 'transportista'], contacto: ['contacto', 'persona de contacto', 'contact', 'contact person', 'atencion'],
    correo: ['correo', 'email', 'e mail', 'mail', 'correo electronico'], telefono: ['telefono', 'tel', 'phone', 'celular', 'movil', 'mobile'], whatsapp: ['whatsapp', 'wa'], pais: ['pais', 'country'],
    especialidades: ['especialidad', 'especialidades', 'categoria', 'categorias', 'productos', 'products', 'product', 'modalidad', 'modalidades'], web: ['web', 'sitio web', 'website', 'url', 'pagina web'], notas: ['notas', 'nota', 'observaciones', 'comentarios'] };
  function fromTable(rows, detect) {
    const guessRow = (r) => { const m = {}, used = new Set(); r.forEach((h, i) => { const n = norm(h); const k = Object.keys(COLS).find((x) => !used.has(x) && COLS[x].includes(n)); if (k) { m[i] = k; used.add(k); } }); return m; };
    let hi = -1, map = {};
    for (let i = 0; i < Math.min(6, rows.length); i++) { const m = guessRow(rows[i]); const v = Object.values(m); if (v.length >= 2 && (v.includes('nombre') || v.includes('correo'))) { hi = i; map = m; break; } }
    if (hi < 0) return null;
    const col = (k) => Object.keys(map).find((i) => map[i] === k);
    return rows.slice(hi + 1).map((r) => {
      const g = (k) => { const i = col(k); return i === undefined ? '' : String(r[i] ?? '').trim(); };
      const text = [g('nombre'), g('especialidades'), g('notas')].join(' '); const wa = App.digits(g('whatsapp')), tel = g('telefono');
      return { nombre: g('nombre').slice(0, 160), contacto: g('contacto') || null, correo: g('correo').toLowerCase() || null, telefono: tel || null, whatsapp: wa.length >= 8 ? wa : null, waFromPhone: false,
        pais: g('pais') || null, tags: detect(text), notas: [g('web') && `Sitio web: ${g('web')}`, g('notas')].filter(Boolean).join('\n') || null };
    }).filter((c) => c.nombre || c.correo);
  }
  function parseText(text, detect) {
    const raw = String(text || '').replace(/\r/g, '').trim(); if (!raw) return [];
    const first = raw.split('\n')[0];
    if (first.includes('\t') || first.split(';').length >= 3 || first.split(',').length >= 4) { const t = fromTable(App.parseDelimited(raw), detect); if (t && t.length) return t; }
    return raw.split(/\n\s*\n+|\n-{3,}\n/).map((b) => b.trim()).filter(Boolean).map((b) => parseBlock(b, detect)).filter((c) => c.correo || c.telefono || c.whatsapp || /Sitio web:/.test(c.notas || '') || LEGAL.test(c.nombre));
  }
  App.parseDirectoryText = parseText;

  /* Diálogo: pegar → vista previa → guardar */
  App.pasteImport = ({ table, cache, singular, plural, tagKey, tagLabel, tagOptions, rules, onDone }) => {
    const detect = (t) => rules.filter(([, re]) => re.test(t)).map(([k]) => k);
    const body = el('div'); const err = el('div', { class: 'msg-err', hidden: true }); const fail = (m) => { err.textContent = m; err.hidden = false; };

    function stepInput() {
      const ta = el('textarea', { style: 'min-height:200px', placeholder: `Pega aquí el texto copiado de la web, de un correo o de WhatsApp.\nPuedes pegar varios ${plural} juntos separados por una línea en blanco, o una tabla copiada de Excel (con encabezados: Nombre, Correo, Teléfono, País…).` });
      const file = el('input', { type: 'file', accept: '.xlsx,.xls,.csv,.tsv,.txt' });
      file.addEventListener('change', async () => {
        err.hidden = true;
        try { const rows = await App.readTableFile(file.files[0]); const c = fromTable(rows, detect); c && c.length ? stepPreview(c) : fail('No encontré columnas reconocibles. Usa encabezados como: Nombre, Contacto, Correo, Teléfono, WhatsApp, País.'); }
        catch (_) { fail('No se pudo leer el archivo. Usa .xlsx, .xls o .csv.'); }
      });
      body.replaceChildren(el('p', { class: 'sub', text: `Pega los datos del ${singular} tal como los encuentres: el panel detecta nombre, correo, teléfono, WhatsApp, país, sitio web y ${tagLabel.toLowerCase()}. Antes de guardar verás una vista previa para corregir.` }),
        el('div', { class: 'field' }, el('label', { text: 'Texto copiado' }), ta), err,
        el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: 'Analizar texto', onclick: () => { err.hidden = true; const c = parseText(ta.value, detect); c.length ? stepPreview(c) : fail('No pude encontrar datos. Pega el texto de la ficha o la firma (con nombre, correo o teléfono).'); } })),
        el('div', { class: 'field', style: 'margin-top:1rem' }, el('label', { text: 'O importa una lista en Excel / CSV' }), file));
    }

    function stepPreview(cands) {
      const existing = App.cache[cache] || [];
      const dup = (c) => existing.find((e) => (c.correo && (e.correo || '').toLowerCase() === c.correo.toLowerCase()) || (c.nombre && norm(e.nombre) === norm(c.nombre)));
      const cards = cands.map((c) => {
        const d = dup(c); const inc = el('input', { type: 'checkbox', checked: !d });
        const f = { nombre: el('input', { value: c.nombre || '' }), contacto: el('input', { value: c.contacto || '' }), correo: el('input', { type: 'email', value: c.correo || '' }),
          telefono: el('input', { value: c.telefono || '' }), whatsapp: el('input', { value: c.whatsapp || '', placeholder: 'Solo dígitos con código de país' }), pais: el('input', { value: c.pais || '' }), notas: el('textarea', { value: c.notas || '', style: 'min-height:50px' }) };
        const waPhone = el('input', { type: 'checkbox', checked: !!c.waFromPhone }); const tags = new Set(c.tags);
        const chips = el('div', { class: 'chips' }, tagOptions.map(([k, l]) => el('span', { class: 'chip' + (tags.has(k) ? ' on' : ''), text: l, onclick: (e) => { tags.has(k) ? tags.delete(k) : tags.add(k); e.target.classList.toggle('on'); } })));
        const fld = (label, node) => el('div', { class: 'field' }, el('label', { text: label }), node);
        const node = el('div', { class: 'row-card' }, el('div', { class: 'head' }, el('label', { class: 'check' }, inc, el('b', { text: c.nombre || c.correo || 'Sin nombre' })), d ? App.badge(`Ya existe: ${d.nombre}`, 'warn') : App.badge('Nuevo', 'ok')),
          el('div', { class: 'grid2' }, fld('Nombre de la empresa *', f.nombre), fld('Persona de contacto', f.contacto), fld('Correo', f.correo), fld('País', f.pais), fld('Teléfono', f.telefono), fld('WhatsApp', f.whatsapp)),
          el('label', { class: 'check' }, waPhone, 'Usar el teléfono como WhatsApp (si no hay otro número)'), el('div', { class: 'sub', text: tagLabel + ' (sugeridas por el texto):' }), chips, fld('Notas', f.notas));
        const get = () => {
          if (!inc.checked) return null;
          let wa = App.digits(f.whatsapp.value); if (!wa && waPhone.checked) wa = App.digits(f.telefono.value);
          const tel = f.telefono.value.trim(); if (wa && (wa.length < 8 || wa.length > 15)) wa = '';
          return { nombre: f.nombre.value.trim(), contacto: f.contacto.value.trim() || null, correo: f.correo.value.trim().toLowerCase() || null, telefono: tel || null, whatsapp: wa || null, pais: f.pais.value.trim() || null, [tagKey]: [...tags], notas: f.notas.value.trim() || null, activo: true };
        };
        return { node, get };
      });
      const save = el('button', { class: 'btn', type: 'button', text: 'Guardar' });
      const count = () => cards.filter((c) => c.get()).length; const upd = () => (save.textContent = `Guardar ${count()} ${count() === 1 ? singular : plural}`);
      body.addEventListener('input', upd); body.addEventListener('click', () => setTimeout(upd, 0)); upd();
      save.addEventListener('click', () => {
        const rows = cards.map((c) => c.get()).filter(Boolean); err.hidden = true;
        if (!rows.length) return fail('Marca al menos uno para guardar.');
        const bad = rows.find((r) => !r.nombre || r.nombre.length < 2); if (bad) return fail('Todos los marcados necesitan nombre de empresa.');
        App.guard(async () => {
          save.disabled = true;
          try { await App.api(`/rest/v1/${table}`, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) }); }
          catch (e) { save.disabled = false; throw e; }
          await App.loadDirs(true); App.closeDialog(); App.toast(`${rows.length} ${rows.length === 1 ? singular : plural} guardado(s)`); onDone && onDone();
        });
      });
      body.replaceChildren(el('p', { class: 'sub', text: `Se detectaron ${cands.length}. Revisa y corrige lo que haga falta; los que ya existen vienen desmarcados.` }), ...cards.map((c) => c.node), err,
        el('div', { class: 'actions' }, save, el('button', { class: 'btn ghost', type: 'button', text: 'Volver', onclick: () => { err.hidden = true; stepInput(); } })));
    }
    App.openDialog(`Importar ${plural}`, body, true); stepInput();
  };

  /* ================= Motor genérico (clientes y productos) ================= */
  App.bulkImport = ({ title, plural, singular, intro, placeholder, parseText: parse, parseRows, makeCard, table, top, onDone }) => {
    const body = el('div'); const err = el('div', { class: 'msg-err', hidden: true }); const fail = (m) => { err.textContent = m; err.hidden = false; };
    function stepInput() {
      const ta = el('textarea', { style: 'min-height:200px', placeholder }); const file = el('input', { type: 'file', accept: '.xlsx,.xls,.csv,.tsv,.txt' });
      file.addEventListener('change', async () => {
        err.hidden = true;
        try { const c = parseRows(await App.readTableFile(file.files[0])); c && c.length ? stepPreview(c) : fail('No encontré columnas reconocibles en el archivo. Revisa los encabezados.'); } catch (_) { fail('No se pudo leer el archivo. Usa .xlsx, .xls o .csv.'); }
      });
      body.replaceChildren(el('p', { class: 'sub', text: intro }), el('div', { class: 'field' }, el('label', { text: 'Texto copiado' }), ta), err,
        el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: 'Analizar texto', onclick: () => { err.hidden = true; const c = parse(ta.value); c.length ? stepPreview(c) : fail('No pude encontrar datos en ese texto.'); } })),
        el('div', { class: 'field', style: 'margin-top:1rem' }, el('label', { text: 'O importa una lista en Excel / CSV' }), file));
    }
    function stepPreview(cands) {
      const cards = cands.map((c) => makeCard(c)); const save = el('button', { class: 'btn', type: 'button', text: 'Guardar' });
      const count = () => cards.filter((c) => c.get()).length; const upd = () => (save.textContent = `Guardar ${count()} ${count() === 1 ? singular : plural}`);
      body.addEventListener('input', upd); body.addEventListener('click', () => setTimeout(upd, 0)); upd();
      save.addEventListener('click', () => {
        const rows = cards.map((c) => c.get()).filter(Boolean); err.hidden = true;
        if (!rows.length) return fail('Marca al menos uno para guardar.');
        if (rows.some((r) => !r.nombre || r.nombre.length < 2)) return fail('Todos los marcados necesitan nombre.');
        App.guard(async () => {
          save.disabled = true;
          try { await App.api(`/rest/v1/${table}`, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) }); } catch (e) { save.disabled = false; throw e; }
          await App.loadDirs(true); App.closeDialog(); App.toast(`${rows.length} ${rows.length === 1 ? singular : plural} guardado(s)`); onDone && onDone();
        });
      });
      body.replaceChildren(el('p', { class: 'sub', text: `Se detectaron ${cands.length}. Revisa y corrige lo que haga falta; los que ya existen vienen desmarcados.` }), top || null, ...cards.map((c) => c.node), err,
        el('div', { class: 'actions' }, save, el('button', { class: 'btn ghost', type: 'button', text: 'Volver', onclick: () => { err.hidden = true; stepInput(); } })));
    }
    App.openDialog(title, body, true); stepInput();
  };
  const fld = (label, node) => el('div', { class: 'field' }, el('label', { text: label }), node);

  /* ---------------- Clientes ---------------- */
  const RUC_RE = /\b(?:RUC|RIF|NIT|C\.?I\.?F\.?|Tax\s*ID|VAT(?:\s*No\.?)?|N[º°o]\s*fiscal)\s*[:#-]?\s*([A-Z]?[-\s]?\d[0-9A-Z.\-\s]{4,20})/i;
  const ADDR_RE = /^(?:address|direcci[oó]n|direccion|domicilio|ubicaci[oó]n)\s*[:：-]\s*(.{4,250})$/i;
  function clienteFromBlock(block) {
    const b = parseBlock(block, () => []); const lines = block.split('\n').map((l) => l.trim());
    let ruc = null, direccion = null;
    for (const l of lines) { if (!ruc) { const m = l.match(RUC_RE); if (m) ruc = m[1].trim().slice(0, 60); } if (!direccion) { const m = l.match(ADDR_RE); if (m) direccion = m[1].trim(); } }
    const empresa = LEGAL.test(b.nombre) ? b.nombre : null; const tel = b.telefono || (b.whatsapp ? '+' + b.whatsapp : null);
    const notas = [b.pais && `País: ${b.pais}`, b.notas].filter(Boolean).join('\n') || null;
    return { nombre: (b.contacto || b.nombre || '').slice(0, 160), empresa, ruc, correo: b.correo, telefono: tel, direccion, notas, ok: !!(b.correo || tel || ruc || empresa) };
  }
  const CLI_COLS = { nombre: ['nombre', 'contacto', 'cliente', 'name', 'persona de contacto'], empresa: ['empresa', 'compania', 'company', 'razon social'], ruc: ['ruc', 'rif', 'nit', 'cif', 'identificacion', 'tax id'], correo: ['correo', 'email', 'e mail', 'mail'], telefono: ['telefono', 'tel', 'phone', 'celular', 'movil', 'whatsapp'], direccion: ['direccion', 'address', 'domicilio'], notas: ['notas', 'observaciones', 'comentarios'] };
  function mapTable(rows, COLS, need) {
    let hi = -1, map = {};
    for (let i = 0; i < Math.min(6, rows.length); i++) { const m = {}, used = new Set(); rows[i].forEach((h, j) => { const k = Object.keys(COLS).find((x) => !used.has(x) && COLS[x].includes(norm(h))); if (k) { m[j] = k; used.add(k); } }); const v = Object.values(m); if (v.length >= 2 && need.some((n) => v.includes(n))) { hi = i; map = m; break; } }
    if (hi < 0) return null; const col = (k) => Object.keys(map).find((j) => map[j] === k);
    return rows.slice(hi + 1).map((r) => (k) => { const j = col(k); return j === undefined ? '' : String(r[j] ?? '').trim(); });
  }
  App.importClientes = (onDone) => {
    const existing = () => App.cache.clientes || [];
    App.bulkImport({
      title: 'Importar clientes', plural: 'clientes', singular: 'cliente', table: 'clientes', onDone,
      intro: 'Pega los datos del cliente (ficha, firma de correo, mensaje de WhatsApp). El panel detecta nombre, empresa, RIF/RUC/NIT, dirección, correo y teléfono. Puedes pegar varios separados por una línea en blanco.',
      placeholder: 'Ej.\nConstructora Orinoco C.A.\nRIF: J-31234567-8\nContacto: Ing. María Pérez\nDirección: Av. Francisco de Miranda, Caracas\nTel: +58 212 555 1234\nmperez@orinoco.com',
      parseText: (text) => { const raw = String(text || '').replace(/\r/g, '').trim(); if (!raw) return [];
        const first = raw.split('\n')[0]; if (first.includes('\t') || first.split(';').length >= 3 || first.split(',').length >= 4) { const t = CLI_COLS && mapTable(App.parseDelimited(raw), CLI_COLS, ['nombre', 'correo', 'empresa']); if (t) return t.map((g) => ({ nombre: g('nombre') || g('empresa'), empresa: g('empresa') || null, ruc: g('ruc') || null, correo: g('correo').toLowerCase() || null, telefono: g('telefono') || null, direccion: g('direccion') || null, notas: g('notas') || null })).filter((c) => c.nombre); }
        return raw.split(/\n\s*\n+|\n-{3,}\n/).map((b) => clienteFromBlock(b.trim())).filter((c) => c.ok && c.nombre); },
      parseRows: (rows) => { const t = mapTable(rows, CLI_COLS, ['nombre', 'correo', 'empresa']); return t && t.map((g) => ({ nombre: g('nombre') || g('empresa'), empresa: g('empresa') || null, ruc: g('ruc') || null, correo: g('correo').toLowerCase() || null, telefono: g('telefono') || null, direccion: g('direccion') || null, notas: g('notas') || null })).filter((c) => c.nombre); },
      makeCard: (c) => {
        const d = existing().find((e) => (c.correo && (e.correo || '').toLowerCase() === c.correo.toLowerCase()) || (c.ruc && e.ruc && norm(e.ruc) === norm(c.ruc)) || (c.nombre && norm(e.nombre) === norm(c.nombre)));
        const inc = el('input', { type: 'checkbox', checked: !d }); const f = { nombre: el('input', { value: c.nombre || '' }), empresa: el('input', { value: c.empresa || '' }), ruc: el('input', { value: c.ruc || '' }), correo: el('input', { type: 'email', value: c.correo || '' }),
          telefono: el('input', { value: c.telefono || '' }), direccion: el('input', { value: c.direccion || '' }), notas: el('textarea', { value: c.notas || '', style: 'min-height:50px' }) };
        const node = el('div', { class: 'row-card' }, el('div', { class: 'head' }, el('label', { class: 'check' }, inc, el('b', { text: c.nombre })), d ? App.badge(`Ya existe: ${d.nombre}`, 'warn') : App.badge('Nuevo', 'ok')),
          el('div', { class: 'grid2' }, fld('Nombre / contacto *', f.nombre), fld('Empresa', f.empresa), fld('RIF / RUC / NIT', f.ruc), fld('Correo', f.correo), fld('Teléfono / WhatsApp', f.telefono), fld('Dirección', f.direccion)), fld('Notas', f.notas));
        const v = (k) => f[k].value.trim() || null;
        return { node, get: () => (inc.checked ? { nombre: f.nombre.value.trim(), empresa: v('empresa'), ruc: v('ruc'), correo: (v('correo') || '').toLowerCase() || null, telefono: v('telefono'), direccion: v('direccion'), notas: v('notas'), activo: true } : null) };
      }
    });
  };

  /* ---------------- Productos ---------------- */
  const UNITS = [[/^(m|mt|mts|metro|metros|meter|meters)$/i, 'm'], [/^(km|kilometro|kilometros)$/i, 'km'], [/^(und|unidad|unidades|unit|units|pc|pcs|pza|pieza|piezas|ea)$/i, 'und'], [/^(juego|juegos|set|sets|kit)$/i, 'juego'], [/^(kg|kilo|kilos)$/i, 'kg'], [/^(ton|tn|tonelada|toneladas)$/i, 'ton'], [/^(rollo|rollos|roll|rolls)$/i, 'rollo'], [/^(carrete|carretes|reel|reels)$/i, 'carrete']];
  const normUnit = (u) => { const t = String(u || '').trim(); const f = UNITS.find(([re]) => re.test(t)); return f ? f[1] : t ? t.slice(0, 20) : 'und'; };
  const PRICE_NUM = (s) => { let t = String(s).replace(/\s/g, ''); if (t.includes(',') && t.includes('.')) t = t.replace(/,/g, ''); else if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, ''); else t = t.replace(',', '.'); const n = Number(t); return Number.isFinite(n) ? n : null; };
  const PRICE_RE = /(?:US\$|USD|\$|PAB|B\/\.?)\s*(\d[\d.,]*)|(\d[\d.,]*)\s*(?:USD|US\$|PAB|d[oó]lares)/i;
  const UNIT_RE = /(?:\/|\bper\s+|\bpor\s+|\bx\s+)(m|mts?|metros?|km|und|unidad(?:es)?|pcs?|pzas?|piezas?|juego|set|kg|ton|rollo|roll|carrete|reel)\b/i;
  function detectCategory(text, rules) { const hit = rules.find(([, re]) => re.test(text)); return hit ? hit[0] : null; }
  function productFromBlock(block, rules) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean); let head = lines[0].replace(/^(?:[-•*·▪]+|\d+[.)])\s*/, '');
    let costo = null; const pm = head.match(PRICE_RE); if (pm) { costo = PRICE_NUM(pm[1] || pm[2]); head = head.replace(pm[0], ' '); }
    let unidad = null; const um = head.match(UNIT_RE); if (um) { unidad = normUnit(um[1]); head = head.replace(um[0], ' '); }
    head = head.replace(/\(\s*\)/g, '').replace(/\s*[-–—:|,]+\s*$/g, '').replace(/\s+/g, ' ').replace(/\s*[-–—|]\s*$/, '').trim();
    return { nombre: head.slice(0, 200), descripcion: lines.slice(1).join(' ').slice(0, 1000) || null, categoria: detectCategory(block, rules), unidad: unidad || 'und', costo_ref: costo, moneda: 'USD', proveedor: null };
  }
  const PROD_COLS = { nombre: ['nombre', 'producto', 'product', 'item', 'articulo', 'material'], descripcion: ['descripcion', 'description', 'detalle', 'especificaciones', 'specs'], unidad: ['unidad', 'und', 'um', 'unit', 'uom'],
    costo: ['costo', 'costo ref', 'precio', 'precio unitario', 'price', 'unit price', 'cost', 'precio usd'], moneda: ['moneda', 'currency'], categoria: ['categoria', 'category', 'familia'], proveedor: ['proveedor', 'supplier', 'vendor'] };
  function productsFromTable(rows, rules) {
    let t = mapTable(rows, PROD_COLS, ['nombre']);
    if (!t) { const alt = { ...PROD_COLS, nombre: [...PROD_COLS.nombre, 'descripcion', 'description'], descripcion: ['detalle', 'especificaciones', 'specs'] }; t = mapTable(rows, alt, ['nombre']); }
    if (!t) return null;
    return t.map((g) => { const text = [g('nombre'), g('descripcion'), g('categoria')].join(' '); const cat = App.ESPECIALIDADES.find(([k, l]) => norm(g('categoria')) === norm(k) || norm(g('categoria')) === norm(l));
      return { nombre: g('nombre').slice(0, 200), descripcion: g('descripcion').slice(0, 1000) || null, categoria: cat ? cat[0] : detectCategory(text, rules), unidad: normUnit(g('unidad')), costo_ref: g('costo') ? PRICE_NUM(g('costo').replace(/[^\d.,]/g, '')) : null, moneda: /pab/i.test(g('moneda')) ? 'PAB' : 'USD', proveedor: g('proveedor') || null }; }).filter((p) => p.nombre);
  }
  App.importProductos = (onDone) => {
    const rules = App.IMPORT_RULES.proveedores; const existing = () => App.cache.productos || [];
    const provs = (App.cache.proveedores || []).filter((p) => p.activo);
    const provAll = el('select', {}, el('option', { value: '', text: '— ninguno —' }), ...provs.map((p) => el('option', { value: p.id, text: p.nombre })));
    const top = el('div', { class: 'field' }, el('label', { text: 'Proveedor habitual para todos los productos que no traigan uno (opcional)' }), provAll);
    App.bulkImport({
      title: 'Importar productos', plural: 'productos', singular: 'producto', table: 'productos', onDone, top,
      intro: 'Pega una lista de productos (uno por línea) o una lista de precios copiada de la web o de Excel. El panel detecta nombre, precio, unidad y categoría. Ej.: "Conductor ACSR 477 Hawk - $3.50/m".',
      placeholder: 'Ej.\nConductor ACSR 477 MCM Hawk - $3.50/m\nAislador polimérico suspensión 115 kV - USD 48.00 por und\nCruceta metálica galvanizada tipo PT - 85 USD\n\n…o una tabla de Excel con encabezados: Producto, Unidad, Precio, Proveedor',
      parseText: (text) => { const raw = String(text || '').replace(/\r/g, '').trim(); if (!raw) return [];
        const first = raw.split('\n')[0]; if (first.includes('\t') || first.split(';').length >= 3) { const t = productsFromTable(App.parseDelimited(raw), rules); if (t && t.length) return t; }
        const blocks = /\n\s*\n/.test(raw) ? raw.split(/\n\s*\n+/) : raw.split('\n'); return blocks.map((b) => b.trim()).filter(Boolean).map((b) => productFromBlock(b, rules)).filter((p) => p.nombre && p.nombre.length >= 2); },
      parseRows: (rows) => productsFromTable(rows, rules),
      makeCard: (c) => {
        const d = existing().find((e) => norm(e.nombre) === norm(c.nombre)); const inc = el('input', { type: 'checkbox', checked: !d });
        const prov = (c.proveedor && provs.find((p) => norm(p.nombre) === norm(c.proveedor))) || null;
        const sel2 = (opts, val) => { const s = el('select', {}, ...opts.map(([k, l]) => el('option', { value: k, text: l }))); s.value = val ?? ''; return s; };
        const f = { nombre: el('input', { value: c.nombre }), descripcion: el('textarea', { value: c.descripcion || '', style: 'min-height:50px' }), categoria: sel2([['', '—'], ...App.ESPECIALIDADES], c.categoria), unidad: el('input', { value: c.unidad || 'und' }),
          costo: el('input', { type: 'number', step: 'any', min: '0', value: c.costo_ref ?? '' }), moneda: sel2([['USD', 'USD'], ['PAB', 'PAB']], c.moneda), prov: sel2([['', '— usar el de arriba —'], ...provs.map((p) => [p.id, p.nombre])], prov ? prov.id : '') };
        const node = el('div', { class: 'row-card' }, el('div', { class: 'head' }, el('label', { class: 'check' }, inc, el('b', { text: c.nombre })), d ? App.badge('Ya existe', 'warn') : App.badge('Nuevo', 'ok'), c.proveedor && !prov ? App.badge(`Proveedor “${c.proveedor}” no registrado`, 'warn') : null),
          el('div', { class: 'grid2' }, fld('Nombre del producto *', f.nombre), fld('Categoría', f.categoria), fld('Unidad', f.unidad), fld('Costo de referencia', f.costo), fld('Moneda', f.moneda), fld('Proveedor habitual', f.prov)), fld('Descripción', f.descripcion));
        return { node, get: () => (inc.checked ? { nombre: f.nombre.value.trim(), categoria: f.categoria.value || null, unidad: f.unidad.value.trim() || 'und', descripcion: f.descripcion.value.trim() || null, costo_ref: f.costo.value === '' ? null : Math.max(0, Number(f.costo.value) || 0),
          moneda: f.moneda.value, proveedor_id: f.prov.value || provAll.value || null, activo: true } : null) };
      }
    });
  };

  /* ================= Embalaje: peso, bultos, medidas y volumen desde el texto del proveedor ================= */
  const NUMX = '(\\d+(?:[.,]\\d+)*)';
  const numE = (s) => { let t = String(s).trim(); if (t.includes(',') && t.includes('.')) t = t.replace(/,/g, ''); else if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, ''); else t = t.replace(',', '.'); const n = Number(t); return Number.isFinite(n) ? n : null; };
  const toKg = (v, u) => (/^(lb|lbs|libras?)$/.test(u) ? v * 0.45359237 : /^(t|ton|tons|tonelada|toneladas)$/.test(u) ? v * 1000 : v);
  const KG = '(kgs?|kilos?|kilogramos?|lbs?|libras?|tons?|toneladas?|t)\\b';
  const PK = '(cajas?|bultos?|pallets?|paletas?|tarimas?|cartons?|ctns?|boxes|box|packages?|pkgs?|sacos?|rollos?|carretes?|reels?|drums?|tambores?|cajones|crates?)';
  const UN = '(cms?|centimetros?|mm|milimetros?|mts?|metros?|m|pulgadas?|in)';
  const r3 = (n) => Math.round(n * 1000) / 1000, r2e = (n) => Math.round(n * 100) / 100;
  const UNIT_CM = (u) => (/^(mm|milimetros?)$/.test(u) ? 0.1 : /^(m|mt|mts|metros?)$/.test(u) ? 100 : /^(in|pulgadas?)$/.test(u) ? 2.54 : 1);

  function parseEmbalajeBlock(raw) {
    const t = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); const orig = t.length === raw.length ? raw : t;
    const grab = (labels) => { const m = t.match(new RegExp(`(?:${labels})\\s*[:=\\-]?\\s*${NUMX}\\s*${KG}`)); return m ? toKg(numE(m[1]), m[2]) : null; };
    const neto = grab('peso\\s*neto|net\\s*weight|n\\.?\\s?w\\.?');
    let bruto = grab('peso\\s*bruto|gross\\s*weight|g\\.?\\s?w\\.?'); if (bruto === null) bruto = grab('peso(?:\\s*total)?|(?<!net\\s)(?<!gross\\s)weight');
    let bultos = null, tipo = null; let m = t.match(new RegExp(`(\\d+)\\s*(?:x\\s*)?${PK}(?:\\s+de\\s+[a-z]+)?`));
    if (m) { bultos = parseInt(m[1], 10); tipo = orig.slice(m.index, m.index + m[0].length).trim(); } else { m = t.match(new RegExp(`${PK}[^\\d\\n]{0,30}[:=]\\s*(\\d+)`)); if (m) { bultos = parseInt(m[2], 10); tipo = `${bultos} ${m[1]}`; } }
    let dims = null; const UO = `(?:${UN}(?![a-z]))?`; const dm = t.match(new RegExp(`${NUMX}\\s*${UO}[^x*×\\d\\n]{0,25}?[x×*]\\s*${NUMX}\\s*${UO}[^x*×\\d\\n]{0,25}?[x×*]\\s*${NUMX}\\s*${UO}`));
    if (dm) { const v = [numE(dm[1]), numE(dm[3]), numE(dm[5])]; const u = dm[2] || dm[4] || dm[6]; const f = u ? UNIT_CM(u) : Math.max(...v) <= 5 ? 100 : 1; if (v.every((x) => x > 0)) dims = { l: r2e(v[0] * f), w: r2e(v[1] * f), h: r2e(v[2] * f) }; }
    let volumen = null; const vm = t.match(new RegExp(`(?:volumen|volume|cbm|cubicaje)\\s*[:=\\-]?\\s*${NUMX}\\s*(m3|m³|cbm)?`)); if (vm) volumen = numE(vm[1]);
    if (volumen === null && dims) volumen = (bultos || 1) * ((dims.l * dims.w * dims.h) / 1e6);
    if (dims && bultos === null) bultos = 1;
    const ok = [neto, bruto, bultos, dims, volumen].some((x) => x !== null);
    return ok ? { neto, bruto, bultos, tipo, dims, volumen } : null;
  }
  /* Devuelve { peso_kg, peso_neto, bultos, volumen_m3, descripcion, resumen[] } o null si no reconoce nada */
  App.parseEmbalaje = (text) => {
    const raw = String(text || '').replace(/\r/g, '').trim(); if (!raw) return null;
    const norm0 = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); const cuts = [...norm0.matchAll(/^.*(?:se empacar|packing\s*:|packing list|empaque\s*:).*$/gm)].map((x) => x.index);
    const pieces = cuts.length >= 2 && norm0.length === raw.length ? cuts.map((s, i) => raw.slice(s, cuts[i + 1] ?? raw.length)) : raw.split(/\n\s*\n+/);
    const blocks = pieces.map(parseEmbalajeBlock).filter(Boolean); if (!blocks.length) return null;
    const sum = (f) => blocks.reduce((s, b) => s + (f(b) || 0), 0); const has = (f) => blocks.some((b) => f(b) !== null && f(b) !== undefined);
    const bruto = has((b) => b.bruto) || has((b) => b.neto) ? r2e(blocks.reduce((s, b) => s + (b.bruto ?? b.neto ?? 0), 0)) : null;
    const neto = has((b) => b.neto) ? r2e(sum((b) => b.neto)) : null, bultos = has((b) => b.bultos) ? sum((b) => b.bultos) : null, vol = has((b) => b.volumen) ? r3(sum((b) => b.volumen)) : null;
    const one = blocks.length === 1 ? blocks[0] : null; const dims = one && one.dims;
    const partes = [one && one.tipo ? one.tipo : bultos ? `${bultos} bultos` : null, dims ? `de ${dims.l} × ${dims.w} × ${dims.h} cm` : null].filter(Boolean).join(' ');
    const descripcion = [partes, neto !== null ? `peso neto ${neto} kg` : null, bruto !== null ? `peso bruto ${bruto} kg` : null, vol !== null ? `volumen ${vol} m³` : null].filter(Boolean).join('; ');
    const resumen = [bruto !== null && `peso ${neto !== null ? 'bruto ' : ''}${bruto} kg`, neto !== null && `peso neto ${neto} kg`, bultos !== null && `${bultos} bulto(s)${one && one.tipo ? ' (' + one.tipo.replace(/^\d+\s*/, '') + ')' : ''}`, dims && `${dims.l} × ${dims.w} × ${dims.h} cm por bulto`, vol !== null && `volumen ${vol} m³`, blocks.length > 1 && `suma de ${blocks.length} productos`].filter(Boolean);
    return { peso_kg: bruto, peso_neto: neto, bultos, volumen_m3: vol, descripcion, resumen };
  };
})();
