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
  const NOT_NAME = /^(tel|phone|mobile|m[oó]vil|cel|fax|email|e-mail|correo|web|website|address|direcci[oó]n|contact|contacto|attn|atenci[oó]n|whatsapp|wechat|skype)\b/i;

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
})();
