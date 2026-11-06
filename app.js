/**
 * LÍNEAS ELÉCTRICAS 13.8 kV, 34.5 kV, 115 kV y 230 kV
 * Lógica interactiva de catálogo, especificaciones por nivel de tensión,
 * formularios de cotización, carga de archivos y personalización de marca.
 */

const VOLTAGE_SPECIFICATIONS = {
  '13.8 kV': {
    title: 'Especificaciones de Suministro — Líneas de 13.8 kV',
    category: 'MEDIA TENSIÓN · DISTRIBUCIÓN PRIMARIA',
    summary:
      'Materiales para líneas de distribución primaria: postes, crucetas, aisladores, conductores (próximamente), herrajes, apartarrayos, puesta a tierra y accesorios.',
    conductors: [
      'Conductores desnudos ACSR ( calibres 1/0 AWG Raven a 336.4 kcmil Linnet ) y AAAC',
      'Cable semiaislado / ecológico para zonas arboladas cuando se especifique',
      'Alambre de amarre de aluminio suave y varillas de armar preformadas'
    ],
    structures: [
      'Postes de concreto reforzado (PC 11-500, 12-750, 13-600) y de acero',
      'Crucetas de acero galvanizado (tipo PR, PT, PV) o poliméricas',
      'Bastidores, abrazaderas, tirantes planos y angulares galvanizados'
    ],
    insulationAndHardware: [
      'Aisladores tipo alfiler (pin), tipo poste (13PD / 15 kV) y suspensión poliméricos o porcelana ANSI',
      'Grapas de remate de aluminio/hierro dúctil, guardacabos, pernos ojo y tuercas de ojo',
      'Retenidas completas para estructuras de ángulo horizontal y remate'
    ],
    protection: [
      'Cortacircuitos fusibles de expulsión (15 kV, 100A / 200A) y cuchillas monopolar/tripolar',
      'Apartarrayos poliméricos de óxido de zinc (ZnO) clase distribución (10 kV / 12 kV)',
      'Sistemas de puesta a tierra con electrodo Copperweld y conectores bimetálicos'
    ]
  },
  '34.5 kV': {
    title: 'Especificaciones de Suministro — Líneas de 34.5 kV',
    category: 'MEDIA TENSIÓN · SUBTRANSMISIÓN Y DISTRIBUCIÓN',
    summary:
      'Suministro para subtransmisión y distribución: postes reforzados, aisladores, conductores y cables de guarda (próximamente), estructuras de ángulo y herrajes.',
    conductors: [
      'Conductores de fase ACSR y AAAC (266.8 Partridge, 336.4 Linnet, 477 Hawk)',
      'Cable de guarda de acero galvanizado EHS (5/16", 3/8") o ACS para blindaje',
      'Empalmes a compresión de tensión completa y conectores de derivación'
    ],
    structures: [
      'Postes de concreto reforzado de alta carga (13 m, 14 m, 15 m) y postes de acero',
      'Estructuras tipo TS, TD, TR y estructuras de ángulo horizontal y desnivel vertical',
      'Crucetas metálicas reforzadas y bayonetas para hilo de guarda'
    ],
    insulationAndHardware: [
      'Aisladores tipo Line Post (35 kV ANSI 57-2 / 57-3) y cadenas de suspensión/tensión',
      'Herrajes de retención para cambios de dirección horizontal y grapas de alto ángulo vertical',
      'Anclas de expansión, pernos de anclaje y cable de retenida de alta resistencia'
    ],
    protection: [
      'Apartarrayos clase distribución pesada / intermedia para 34.5 kV (27 kV / 30 kV)',
      'Seccionadores bajo carga, reconectadores automáticos y cortacircuitos de 38 kV',
      'Amortiguadores de vibración y desviadores de vuelo para protección de avifauna'
    ]
  },
  '115 kV': {
    title: 'Especificaciones de Suministro — Líneas de 115 kV',
    category: 'ALTA TENSIÓN · SUBTRANSMISIÓN Y TRANSMISIÓN',
    summary:
      'Estructuras, torres, cadenas de aisladores, conductores y cables de guarda (próximamente), herrajes, anclajes, cimentaciones y equipos de línea.',
    conductors: [
      'Conductores ACSR, AAAC y ACSS (477 Hawk, 795 Drake, 954 Rail, 1113 Bluejay)',
      'Cables de guarda EHS / Alumoweld y cable óptico OPGW de 24 a 48 fibras',
      'Cajas de empalme óptico, bajantes, grapas guía y herrajes preformados para OPGW'
    ],
    structures: [
      'Torres de celosía de acero galvanizado (suspensión, ángulo pequeño/mediano/grande y remate)',
      'Postes metálicos troncocónicos autosoportados o bridados para zonas urbanas e industriales',
      'Stubs de cimentación, plantillas y pernos de anclaje en acero de alta fluencia'
    ],
    insulationAndHardware: [
      'Cadenas de aisladores de vidrio templado, porcelana (ANSI 52-3 / 52-5) o poliméricos de 115 kV',
      'Conjuntos completos de herrajes de suspensión y tensión (70 kN, 120 kN, 160 kN)',
      'Contrapesos para control de carga vertical en desniveles y grapas de compresión'
    ],
    protection: [
      'Amortiguadores tipo Stockbridge sintonizados para conductor de fase y cable de guarda',
      'Apartarrayos de línea (TLA) de 115 kV y anillos de control de efecto corona',
      'Esferas de señalización aeronáutica, placas de peligro y mallas de puesta a tierra por torre'
    ]
  },
  '230 kV': {
    title: 'Especificaciones de Suministro — Líneas de 230 kV',
    category: 'ALTA TENSIÓN · TRANSMISIÓN TRONCAL DE GRAN POTENCIA',
    summary:
      'Torres autosoportadas, postes tubulares, conductores de gran capacidad y OPGW (próximamente), cadenas de aisladores, herrajes de alta resistencia y sistemas de protección.',
    conductors: [
      'Conductores de gran capacidad en configuración simple o en haz (2x o 3x por fase): ACSR 795 Drake, 954, 1113',
      'Cable de guarda OPGW de alta capacidad de cortocircuito y segundo hilo de guarda ACS/EHS',
      'Empalmes y terminales a compresión para alta tensión con acabado libre de efecto corona'
    ],
    structures: [
      'Torres autosoportadas de celosía para simple y doble circuito (tangente, deflexión horizontal y terminal)',
      'Postes tubulares de acero de gran altura para cruces especiales, ríos y derechos de vía restringidos',
      'Anclajes profundos, parrillas metálicas y herrajes estructurales de alta resistencia'
    ],
    insulationAndHardware: [
      'Cadenas sencillas, dobles en "I" y cadenas en "V" (120 kN, 160 kN, 210 kN) de vidrio, porcelana o silicona',
      'Yugos triangulares/rectangulares, anillos anticorona y raquetas de guarda',
      'Separadores-amortiguadores (spacer-dampers) para conductores en haz y contrapesos para cambios de cota'
    ],
    protection: [
      'Sistemas de puesta a tierra de contrapeso continuo y electrodos profundos de baja impedancia',
      'Balizamiento diurno/nocturno para vanos de cruce de cañones y carreteras',
      'Lotes completos de accesorios de tendido y mantenimiento para líneas de 230 kV'
    ]
  }
};

const DEFAULT_BRAND_CONFIG = {
  name: 'Use Union de Servicios Especializados',
  contact: 'Ing. Ruben Suarez',
  phone: '+507 432-0507',
  whatsapp: '5074320507',
  email: 'info@useservices.company',
  address: 'Av. Aquilino de la Guardia - PH Ocean Business - Piso 19, Bella Vista, Panamá'
};

document.addEventListener('DOMContentLoaded', () => {
  // Año actual en el pie de página
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 1. Menú móvil responsivo
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainNav = document.getElementById('mainNav');
  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
    });

    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 2. Resaltado activo en navegación al hacer scroll
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener(
    'scroll',
    () => {
      const scrollPos = window.scrollY + 140;
      sections.forEach((sec) => {
        const top = sec.offsetTop;
        const height = sec.offsetHeight;
        const id = sec.getAttribute('id');
        if (scrollPos >= top && scrollPos < top + height) {
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { passive: true }
  );

  // 3. Filtrado de categorías de productos (Sección 4)
  const filterChips = document.querySelectorAll('.filter-chip');
  const productCards = document.querySelectorAll('.product-card');

  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.getAttribute('data-filter');
      filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      productCards.forEach((card) => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Escapa texto antes de insertarlo como HTML (evita inyección de código desde campos del formulario o nombres de producto)
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // 4. Selección de productos desde el catálogo hacia el formulario de cotización
  const selectedProducts = new Set();
  const selectedContainer = document.getElementById('selectedProductsContainer');
  const selectedList = document.getElementById('selectedProductsList');
  const contactDescription = document.getElementById('contactDescription');

  // Barra flotante: avisa cuántos productos lleva el cliente y lo lleva al formulario
  let quoteBar = null;
  function updateQuoteBar() {
    if (!quoteBar) {
      quoteBar = document.createElement('a');
      quoteBar.className = 'quote-bar';
      quoteBar.href = '#cotizacion';
      quoteBar.setAttribute('aria-live', 'polite');
      document.body.appendChild(quoteBar);
    }
    const n = selectedProducts.size;
    quoteBar.hidden = n === 0;
    quoteBar.innerHTML = `<span class="qb-count">${n}</span><span class="qb-text">${n === 1 ? 'producto' : 'productos'} en su cotización</span><strong>Ir a cotizar →</strong>`;
  }

  function renderSelectedProducts() {
    updateQuoteBar();
    if (!selectedContainer || !selectedList) return;
    selectedList.innerHTML = '';
    if (selectedProducts.size === 0) {
      selectedContainer.hidden = true;
      return;
    }
    selectedContainer.hidden = false;
    selectedProducts.forEach((prodName) => {
      const tag = document.createElement('span');
      tag.className = 'selected-tag';
      const label = document.createElement('span');
      label.textContent = prodName;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', `Quitar ${prodName}`);
      removeBtn.textContent = '✕';
      tag.append(label, removeBtn);
      removeBtn.addEventListener('click', () => {
        selectedProducts.delete(prodName);
        document
          .querySelectorAll(`[data-select-product="${CSS.escape(prodName)}"]`)
          .forEach((btn) => {
            btn.classList.remove('added');
            btn.textContent = 'Incluir en cotización +';
          });
        renderSelectedProducts();
      });
      selectedList.appendChild(tag);
    });
  }

  function bindSelectButton(btn) {
    btn.addEventListener('click', () => {
      const prod = btn.getAttribute('data-select-product');
      const adding = !selectedProducts.has(prod);
      if (adding) selectedProducts.add(prod);
      else selectedProducts.delete(prod);
      // se actualizan todos los botones del mismo producto (tarjeta, tienda y ficha)
      document.querySelectorAll(`[data-select-product="${CSS.escape(prod)}"]`).forEach((b) => {
        b.classList.toggle('added', adding);
        b.textContent = adding ? '✓ Incluido en cotización' : 'Incluir en cotización +';
      });
      renderSelectedProducts();

      // También sincronizar con la descripción del formulario de contacto si está vacía o agregando líneas
      if (contactDescription && selectedProducts.size > 0) {
        const itemsText = Array.from(selectedProducts).join(', ');
        if (!contactDescription.value.includes('Partidas de interés:')) {
          contactDescription.value = `Partidas de interés: ${itemsText}.\n` + contactDescription.value;
        } else {
          contactDescription.value = contactDescription.value.replace(
            /Partidas de interés:.*\n?/,
            `Partidas de interés: ${itemsText}.\n`
          );
        }
      }
    });
  }
  document.querySelectorAll('[data-select-product]').forEach(bindSelectButton);

  // 5. Botones de prellenado para Cambio de Dirección Horizontal / Vertical (Sección 5)
  document.querySelectorAll('[data-prefill-direction]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-prefill-direction');
      const contactDirSelect = document.getElementById('contactDirection');

      if (contactDirSelect) {
        if (dir === 'horizontal') contactDirSelect.value = 'Horizontal';
        else if (dir === 'vertical') contactDirSelect.value = 'Vertical';
      }
    });
  });

  // 6. Modal de Especificaciones por Nivel de Tensión (13.8 kV, 34.5 kV, 115 kV, 230 kV)
  const specModal = document.getElementById('voltageSpecModal');
  const modalTitle = document.getElementById('modalVoltageTitle');
  const modalCategory = document.getElementById('modalVoltageCategory');
  const modalBody = document.getElementById('modalVoltageBody');
  const closeSpecModalBtn = document.getElementById('closeSpecModalBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const modalQuoteBtn = document.getElementById('modalQuoteThisVoltageBtn');
  let activeModalVoltage = '115 kV';

  function openVoltageModal(voltageKey) {
    const data = VOLTAGE_SPECIFICATIONS[voltageKey];
    if (!data || !specModal) return;
    activeModalVoltage = voltageKey;
    modalTitle.textContent = data.title;
    modalCategory.textContent = data.category;
    modalBody.innerHTML = `
      <p style="color: #e2e8f0; font-size: 0.96rem; margin-bottom: 1rem;">${data.summary}</p>
      <div class="spec-modal-grid">
        <div class="spec-modal-box">
          <h4>Conductores y Cable de Guarda (próximamente)</h4>
          <ul>${data.conductors.map((item) => `<li>• ${item}</li>`).join('')}</ul>
        </div>
        <div class="spec-modal-box">
          <h4>Estructuras, Postes y Torres</h4>
          <ul>${data.structures.map((item) => `<li>• ${item}</li>`).join('')}</ul>
        </div>
        <div class="spec-modal-box">
          <h4>Aisladores y Herrajes (Tangente y Ángulo H/V)</h4>
          <ul>${data.insulationAndHardware.map((item) => `<li>• ${item}</li>`).join('')}</ul>
        </div>
        <div class="spec-modal-box">
          <h4>Protecciones, Tierras y Accesorios</h4>
          <ul>${data.protection.map((item) => `<li>• ${item}</li>`).join('')}</ul>
        </div>
      </div>
    `;
    specModal.hidden = false;
  }

  function closeVoltageModal() {
    if (specModal) specModal.hidden = true;
  }

  document.querySelectorAll('[data-open-spec]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const kv = btn.getAttribute('data-open-spec');
      openVoltageModal(kv);
    });
  });

  if (closeSpecModalBtn) closeSpecModalBtn.addEventListener('click', closeVoltageModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeVoltageModal);
  if (modalQuoteBtn) {
    modalQuoteBtn.addEventListener('click', () => {
      const specVoltage = document.getElementById('specVoltage');
      const contactVoltage = document.getElementById('contactVoltage');
      if (specVoltage) specVoltage.value = activeModalVoltage;
      if (contactVoltage) contactVoltage.value = activeModalVoltage;
      closeVoltageModal();
      const target = document.getElementById('cotizacion');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Cerrar modales al hacer clic fuera del cuadro de diálogo
  window.addEventListener('click', (e) => {
    if (e.target === specModal) closeVoltageModal();
  });

  // 7. Gestión visual de archivos adjuntos (Dropzones en Sección 6 y Sección 10)
  function setupFileDropzone(inputId, dropzoneId, listId) {
    const fileInput = document.getElementById(inputId);
    const dropzone = document.getElementById(dropzoneId);
    const fileList = document.getElementById(listId);
    if (!fileInput || !dropzone || !fileList) return;

    function updateFilesDisplay(files) {
      fileList.innerHTML = '';
      Array.from(files).forEach((f) => {
        const li = document.createElement('li');
        const sizeKb = Math.max(1, Math.round(f.size / 1024));
        li.textContent = `📎 ${f.name} (${sizeKb} KB)`;
        fileList.appendChild(li);
      });
    }

    fileInput.addEventListener('change', () => {
      updateFilesDisplay(fileInput.files);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        updateFilesDisplay(e.dataTransfer.files);
      }
    });
  }

  setupFileDropzone('specFiles', 'specDropzone', 'specFileList');
  setupFileDropzone('contactFiles', 'contactDropzone', 'contactFileList');

  // 7b. Guardado de solicitudes en Supabase (tabla `cotizaciones` + bucket privado `adjuntos`)
  // La clave "anon" es pública por diseño: la seguridad la dan las políticas RLS (solo INSERT).
  const SUPABASE_URL = 'https://atsvcwvfapfzabrywjwx.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0c3Zjd3ZmYXBmemFicnl3and4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MTUyODEsImV4cCI6MjEwOTQ5MTI4MX0.jET54CTvKQcpAdpOrHL-n0j-eAoiwvDNlIjXO-Hmrdc';
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const MIN_SECONDS_BETWEEN_SUBMITS = 20;

  const ALLOWED_EXT = ['pdf', 'dwg', 'dxf', 'xlsx', 'xls', 'doc', 'docx', 'zip', 'jpg', 'jpeg', 'png'];
  const MAX_FILES = 6;
  const extOf = (n) => (String(n).split('.').pop() || '').toLowerCase();

  // Comprueba la firma real del archivo (no solo el nombre) para rechazar archivos disfrazados
  async function looksValid(file) {
    const ext = extOf(file.name);
    const h = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const is = (...b) => b.every((v, i) => h[i] === v);
    const text = String.fromCharCode(...h);
    if (ext === 'pdf') return text.startsWith('%PDF');
    if (ext === 'png') return is(0x89, 0x50, 0x4e, 0x47);
    if (ext === 'jpg' || ext === 'jpeg') return is(0xff, 0xd8, 0xff);
    if (['zip', 'xlsx', 'docx'].includes(ext)) return is(0x50, 0x4b);
    if (['xls', 'doc'].includes(ext)) return is(0xd0, 0xcf, 0x11, 0xe0) || is(0x50, 0x4b);
    if (ext === 'dwg') return text.startsWith('AC');
    if (ext === 'dxf') return !h.includes(0) || text.startsWith('AutoCAD');
    return false;
  }

  function safeFileName(name) {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .slice(-100);
  }

  function sbHeaders(extra) {
    return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, ...(extra || {}) };
  }

  // Devuelve { ok, skipped, uploaded, failedFiles }. Nunca lanza: el flujo de WhatsApp/correo sigue siempre disponible.
  async function saveRequest(row, fileList, honeypotId) {
    try {
      const trap = document.getElementById(honeypotId);
      if (trap && trap.value) return { ok: true, skipped: true, uploaded: 0, failedFiles: [] }; // bot

      try {
        const last = Number(localStorage.getItem('use_last_submit_ts') || 0);
        if (Date.now() - last < MIN_SECONDS_BETWEEN_SUBMITS * 1000) {
          return { ok: false, throttled: true, uploaded: 0, failedFiles: [] };
        }
        localStorage.setItem('use_last_submit_ts', String(Date.now()));
      } catch (_) {
        // localStorage no disponible: se continúa sin límite local
      }

      const id = crypto.randomUUID();
      const failedFiles = [];
      const planned = [];

      // Se valida cada archivo antes de subirlo: tipo permitido, tamaño, cantidad y firma real del contenido
      for (const file of Array.from(fileList || [])) {
        if (planned.length >= MAX_FILES) {
          failedFiles.push(`${file.name} (máximo ${MAX_FILES} archivos)`);
          continue;
        }
        if (!ALLOWED_EXT.includes(extOf(file.name))) {
          failedFiles.push(`${file.name} (tipo de archivo no permitido)`);
          continue;
        }
        if (file.size === 0 || file.size > MAX_FILE_BYTES) {
          failedFiles.push(`${file.name} (${file.size === 0 ? 'vacío' : 'supera 10 MB'})`);
          continue;
        }
        if (!(await looksValid(file))) {
          failedFiles.push(`${file.name} (el contenido no coincide con el tipo de archivo)`);
          continue;
        }
        planned.push({ file, path: `${id}/${planned.length}_${safeFileName(file.name)}`, nombre: file.name, bytes: file.size });
      }

      // Primero se registra la solicitud (la base la limita por visitante) y solo entonces se suben los archivos
      const res = await fetch(`${SUPABASE_URL}/rest/v1/cotizaciones`, {
        method: 'POST',
        headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ id, ...row, archivos: planned.map(({ path, nombre, bytes }) => ({ path, nombre, bytes })) })
      });
      if (!res.ok) {
        const info = await res.json().catch(() => ({}));
        return { ok: false, throttled: /Demasiadas/i.test(info.message || ''), uploaded: 0, failedFiles };
      }

      let uploaded = 0;
      for (const p of planned) {
        try {
          const up = await fetch(`${SUPABASE_URL}/storage/v1/object/adjuntos/${p.path}`, {
            method: 'POST',
            headers: sbHeaders({ 'Content-Type': p.file.type || 'application/octet-stream' }),
            body: p.file
          });
          if (up.ok) uploaded++;
          else failedFiles.push(p.nombre);
        } catch (_) {
          failedFiles.push(p.nombre);
        }
      }
      return { ok: true, uploaded, failedFiles };
    } catch (_) {
      return { ok: false, uploaded: 0, failedFiles: [] };
    }
  }

  function renderSaveStatus(el, result) {
    if (result.skipped) {
      el.remove();
      return;
    }
    if (result.ok) {
      let msg = '✓ Su solicitud quedó registrada en nuestro sistema.';
      if (result.uploaded) msg += ` Archivos recibidos: ${result.uploaded}.`;
      if (result.failedFiles.length) msg += ` No se pudieron subir: ${result.failedFiles.join(', ')}. Envíelos por WhatsApp o correo.`;
      el.textContent = msg;
    } else if (result.throttled) {
      el.textContent = 'Ya recibimos una solicitud hace unos segundos. Espere un momento antes de enviar otra.';
    } else {
      el.textContent =
        '⚠ No pudimos registrar la solicitud en línea. Por favor confirme el envío con los botones de WhatsApp o correo.';
    }
  }

  // 8. Envío funcional del Formulario de Especificaciones Técnicas (Sección 6)
  const technicalSpecForm = document.getElementById('technicalSpecForm');
  const specFormFeedback = document.getElementById('specFormFeedback');

  if (technicalSpecForm && specFormFeedback) {
    technicalSpecForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const voltage = document.getElementById('specVoltage').value.trim();
      const length = document.getElementById('specLength').value.trim();
      const terrain = document.getElementById('specTerrain').value.trim();
      const structures = document.getElementById('specStructuresCount').value.trim();
      const delivery = document.getElementById('specDeliveryDate').value || 'Inmediata / A convenir';
      const name = document.getElementById('specContactName').value.trim();
      const contact = document.getElementById('specContactInfo').value.trim();
      const filesInput = document.getElementById('specFiles');
      const attachedCount = filesInput && filesInput.files ? filesInput.files.length : 0;

      if (!voltage || !length || !terrain || !structures || !name || !contact) {
        specFormFeedback.hidden = false;
        specFormFeedback.className = 'form-feedback error';
        specFormFeedback.textContent =
          'Por favor complete los campos técnicos obligatorios (*) para generar su solicitud de cotización.';
        return;
      }

      const brand = getSavedBrandConfig();
      const catalogList =
        selectedProducts.size > 0 ? Array.from(selectedProducts).join(', ') : 'Suministro general por proyecto';

      const waMessage = encodeURIComponent(
        `*SOLICITUD TÉCNICA DE COTIZACIÓN — ${brand.name}*\n` +
          `• *Responsable:* ${name} (${contact})\n` +
          `• *Nivel de tensión:* ${voltage}\n` +
          `• *Longitud aprox.:* ${length}\n` +
          `• *Terreno:* ${terrain}\n` +
          `• *Cant. estructuras:* ${structures}\n` +
          `• *Entrega estimada:* ${delivery}\n` +
          `• *Partidas:* ${catalogList}\n` +
          `• *Archivos adjuntos:* ${attachedCount} archivo(s)`
      );

      specFormFeedback.hidden = false;
      specFormFeedback.className = 'form-feedback success';
      specFormFeedback.innerHTML = `
        <div>✓ <strong>Especificaciones registradas correctamente.</strong> Folio técnico generado para <strong>${escapeHtml(voltage)}</strong> (${escapeHtml(length)}).</div>
        <div style="margin-top: 0.6rem; display: flex; gap: 0.6rem; flex-wrap: wrap;">
          <a href="https://wa.me/${escapeHtml(String(brand.whatsapp).replace(/\D/g, ''))}?text=${waMessage}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-sm">
            Enviar resumen directo por WhatsApp →
          </a>
          <a href="mailto:${escapeHtml(brand.email)}?subject=${encodeURIComponent('Cotización Línea Eléctrica ' + voltage + ' - ' + name)}&body=${waMessage}" class="btn btn-electric btn-sm">
            Abrir en Correo Electrónico ✉
          </a>
        </div>
      `;

      const specStatus = document.createElement('div');
      specStatus.style.marginTop = '0.6rem';
      specStatus.textContent = 'Guardando solicitud…';
      specFormFeedback.appendChild(specStatus);
      saveRequest(
        {
          tipo: 'tecnica',
          nombre: name,
          contacto_info: contact,
          tension: voltage,
          longitud: length,
          terreno: terrain,
          cant_estructuras: structures,
          fecha_entrega: document.getElementById('specDeliveryDate').value || null,
          partidas: selectedProducts.size > 0 ? Array.from(selectedProducts).join(', ') : null
        },
        filesInput && filesInput.files,
        'specWebsite'
      ).then((r) => renderSaveStatus(specStatus, r));
    });
  }

  // 9. Envío funcional del Formulario de Contacto y Cotización (Sección 10)
  const contactQuoteForm = document.getElementById('contactQuoteForm');
  const contactFormFeedback = document.getElementById('contactFormFeedback');
  const sendContactViaWhatsAppBtn = document.getElementById('sendContactViaWhatsAppBtn');

  function buildContactSummary() {
    const name = document.getElementById('contactName').value.trim();
    const company = document.getElementById('contactCompany').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const voltage = document.getElementById('contactVoltage').value.trim();
    const reqType = document.getElementById('contactReqType').value.trim();
    const direction = document.getElementById('contactDirection').value.trim();
    const desc = document.getElementById('contactDescription').value.trim();
    const filesInput = document.getElementById('contactFiles');
    const attachedCount = filesInput && filesInput.files ? filesInput.files.length : 0;

    return {
      valid: Boolean(name && company && email && phone && voltage && reqType && direction && desc),
      name,
      company,
      email,
      phone,
      voltage,
      reqType,
      direction,
      desc,
      attachedCount
    };
  }

  if (contactQuoteForm && contactFormFeedback) {
    contactQuoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = buildContactSummary();
      if (!data.valid) {
        contactFormFeedback.hidden = false;
        contactFormFeedback.className = 'form-feedback error';
        contactFormFeedback.textContent =
          'Por favor complete todos los campos obligatorios (*) para procesar su solicitud de cotización.';
        return;
      }

      const brand = getSavedBrandConfig();
      const waText = encodeURIComponent(
        `*COTIZACIÓN DE LÍNEA ELÉCTRICA (${data.voltage})*\n` +
          `• *Nombre:* ${data.name}\n` +
          `• *Empresa:* ${data.company}\n` +
          `• *Correo:* ${data.email}\n` +
          `• *Teléfono/WhatsApp:* ${data.phone}\n` +
          `• *Nivel de tensión:* ${data.voltage}\n` +
          `• *Tipo de requerimiento:* ${data.reqType}\n` +
          `• *Cambio de dirección:* ${data.direction}\n` +
          `• *Descripción:* ${data.desc}\n` +
          `• *Archivos seleccionados:* ${data.attachedCount}`
      );

      contactFormFeedback.hidden = false;
      contactFormFeedback.className = 'form-feedback success';
      contactFormFeedback.innerHTML = `
        <div>✓ <strong>¡Solicitud lista para atención prioritaria!</strong> Hemos preparado la orden de cotización de <strong>${escapeHtml(data.company)}</strong> para línea de <strong>${escapeHtml(data.voltage)}</strong> (${escapeHtml(data.reqType)} · Cambio de dirección: ${escapeHtml(data.direction)}).</div>
        <div style="margin-top: 0.65rem; display: flex; gap: 0.6rem; flex-wrap: wrap;">
          <a href="https://wa.me/${escapeHtml(String(brand.whatsapp).replace(/\D/g, ''))}?text=${waText}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-sm">
            Confirmar envío por WhatsApp →
          </a>
          <a href="mailto:${escapeHtml(brand.email)}?subject=${encodeURIComponent('Solicitud de Cotización ' + data.voltage + ' - ' + data.company)}&body=${waText}" class="btn btn-electric btn-sm">
            Enviar por Correo Electrónico ✉
          </a>
        </div>
      `;

      const contactStatus = document.createElement('div');
      contactStatus.style.marginTop = '0.6rem';
      contactStatus.textContent = 'Guardando solicitud…';
      contactFormFeedback.appendChild(contactStatus);
      const contactFilesInput = document.getElementById('contactFiles');
      saveRequest(
        {
          tipo: 'contacto',
          nombre: data.name,
          empresa: data.company,
          correo: data.email,
          telefono: data.phone,
          tension: data.voltage,
          requerimiento: data.reqType,
          cambio_direccion: data.direction,
          descripcion: data.desc,
          partidas: selectedProducts.size > 0 ? Array.from(selectedProducts).join(', ') : null
        },
        contactFilesInput && contactFilesInput.files,
        'contactWebsite'
      ).then((r) => renderSaveStatus(contactStatus, r));
    });
  }

  if (sendContactViaWhatsAppBtn) {
    sendContactViaWhatsAppBtn.addEventListener('click', () => {
      const data = buildContactSummary();
      if (!data.valid) {
        contactFormFeedback.hidden = false;
        contactFormFeedback.className = 'form-feedback error';
        contactFormFeedback.textContent =
          'Complete primero los datos del formulario para enviar el resumen estructurado por WhatsApp.';
        return;
      }
      const brand = getSavedBrandConfig();
      const waText = encodeURIComponent(
        `*COTIZACIÓN DE LÍNEA ELÉCTRICA (${data.voltage})*\n` +
          `• *Nombre:* ${data.name}\n` +
          `• *Empresa:* ${data.company}\n` +
          `• *Correo:* ${data.email}\n` +
          `• *Teléfono:* ${data.phone}\n` +
          `• *Tensión:* ${data.voltage} | *Requerimiento:* ${data.reqType}\n` +
          `• *Cambio de dirección:* ${data.direction}\n` +
          `• *Proyecto:* ${data.desc}`
      );
      window.open(`https://wa.me/${brand.whatsapp}?text=${waText}`, '_blank', 'noopener,noreferrer');
    });
  }

  // 10. Datos de empresa: se administran desde /admin y se leen de Supabase (tabla `config_marca`)
  const BRAND_CACHE_KEY = 'use_brand_cache_v3';
  let brandConfig = { ...DEFAULT_BRAND_CONFIG };

  function sanitizeBrand(raw) {
    const out = { ...DEFAULT_BRAND_CONFIG };
    Object.keys(DEFAULT_BRAND_CONFIG).forEach((k) => {
      if (raw && typeof raw[k] === 'string' && raw[k].trim()) out[k] = raw[k].trim();
    });
    return out;
  }

  function getSavedBrandConfig() {
    return brandConfig;
  }

  // Formato visible del WhatsApp: +código número (ej. +507 69759851)
  function formatWa(raw) {
    const d = String(raw || '').replace(/\D/g, '');
    if (!d) return '';
    const code = ['593', '886', '507', '58', '57', '52', '86', '34', '55', '54', '56', '51', '91', '90', '49', '39', '82', '81', '1'].find((c) => d.startsWith(c));
    return code && d.length > code.length + 4 ? `+${code} ${d.slice(code.length)}` : `+${d}`;
  }

  function applyBrandConfig(cfg) {
    document.querySelectorAll('[data-brand-name]').forEach((el) => {
      el.textContent = cfg.name;
    });
    document.querySelectorAll('[data-brand-contact]').forEach((el) => {
      el.textContent = cfg.contact || DEFAULT_BRAND_CONFIG.contact;
    });
    document.querySelectorAll('[data-brand-phone]').forEach((el) => {
      el.textContent = cfg.phone;
    });
    document.querySelectorAll('[data-brand-phone-link]').forEach((el) => {
      const cleanTel = cfg.phone.replace(/[^\d+]/g, '');
      el.setAttribute('href', `tel:${cleanTel}`);
    });
    document.querySelectorAll('[data-brand-email]').forEach((el) => {
      el.textContent = cfg.email;
    });
    document.querySelectorAll('[data-brand-email-link]').forEach((el) => {
      el.setAttribute('href', `mailto:${cfg.email}`);
    });
    document.querySelectorAll('[data-brand-address]').forEach((el) => {
      el.textContent = cfg.address;
    });
    document.querySelectorAll('[data-brand-wa-link]').forEach((el) => {
      const cleanWa = cfg.whatsapp.replace(/\D/g, '');
      const contactPerson = cfg.contact || DEFAULT_BRAND_CONFIG.contact;
      const msg = encodeURIComponent(
        `Hola ${contactPerson} (${cfg.name}), solicito una cotización de materiales para líneas eléctricas.`
      );
      el.setAttribute('href', `https://wa.me/${cleanWa}?text=${msg}`);
    });
    // Número de WhatsApp visible (barra superior, contacto, pie de página, globo flotante)
    const waDisplay = formatWa(cfg.whatsapp);
    document.querySelectorAll('[data-brand-wa-text]').forEach((el) => {
      el.textContent = waDisplay;
    });
    document.querySelectorAll('.whatsapp-float').forEach((el) => {
      el.setAttribute('aria-label', `Contactar por WhatsApp con ${cfg.contact || DEFAULT_BRAND_CONFIG.contact} (${waDisplay})`);
    });
    document.title = `${cfg.name} | Proveedor de Materiales para Líneas Eléctricas 13.8 kV, 34.5 kV, 115 kV y 230 kV`;
  }

  // Valores por defecto al instante (o la última versión guardada en caché) y luego los datos vigentes de Supabase
  try {
    const cached = JSON.parse(localStorage.getItem(BRAND_CACHE_KEY) || 'null');
    if (cached) brandConfig = sanitizeBrand(cached);
  } catch (_) {}
  applyBrandConfig(brandConfig);

  fetch(`${SUPABASE_URL}/rest/v1/config_marca?id=eq.1&select=name,contact,phone,whatsapp,email,address`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
  })
    .then((res) => (res.ok ? res.json() : []))
    .then((rows) => {
      if (!rows || !rows[0]) return;
      brandConfig = sanitizeBrand(rows[0]);
      try {
        localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(brandConfig));
      } catch (_) {}
      applyBrandConfig(brandConfig);
    })
    .catch(() => {
      // Sin conexión con Supabase: se mantienen los valores por defecto / caché
    });

  // 11. Tienda virtual: productos publicados en Supabase (tabla `productos`, bucket público `catalogo`).
  // Se llena sola con lo que se publica desde /admin; nunca incluye costos ni proveedores.
  (function initStore() {
    const section = document.getElementById('tienda');
    const grid = document.getElementById('storeGrid');
    const filterBar = document.getElementById('storeFilters');
    if (!section || !grid || !filterBar) return;
    const BASE = `${SUPABASE_URL}/storage/v1/object/public/catalogo/`;
    const GROUPS = {
      conductores: 'Conductores y OPGW', opgw: 'Conductores y OPGW', estructuras: 'Estructuras y Cimentación', aislamiento: 'Aisladores y Herrajes',
      proteccion: 'Protección y Tendido', tendido: 'Protección y Tendido', transformadores: 'Transformadores', alumbrado: 'Alumbrado Público', otros: 'Otros'
    };
    const groupOf = (p) => GROUPS[p.categoria] || 'Otros';
    const fileUrl = (p) => (typeof p === 'string' && /^[\w\-./]+$/.test(p) && !p.includes('..') ? BASE + p.split('/').map(encodeURIComponent).join('/') : null);
    const mk = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    };
    const specsOf = (p) => (Array.isArray(p.especificaciones) ? p.especificaciones : []).filter((s) => s && typeof s.k === 'string' && typeof s.v === 'string' && s.k.trim() && s.v.trim());

    function quoteButton(p) {
      const b = mk('button', 'pc-quote-btn', selectedProducts.has(p.nombre) ? '✓ Incluido en cotización' : 'Incluir en cotización +');
      b.type = 'button';
      if (selectedProducts.has(p.nombre)) b.classList.add('added');
      b.setAttribute('data-select-product', p.nombre);
      bindSelectButton(b);
      return b;
    }

    let modal = null;
    const closeFicha = () => {
      if (modal) modal.hidden = true;
      document.body.classList.remove('no-scroll');
    };
    function openFicha(p) {
      if (!modal) {
        modal = mk('div', 'store-modal');
        modal.hidden = true;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeFicha();
        });
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && !modal.hidden) closeFicha();
        });
        document.body.appendChild(modal);
      }
      const box = mk('div', 'store-dialog');
      const close = mk('button', 'store-close', '✕');
      close.type = 'button';
      close.setAttribute('aria-label', 'Cerrar');
      close.addEventListener('click', closeFicha);
      const left = mk('div', 'store-dialog-img');
      const img = fileUrl(p.imagen_path);
      if (img) {
        const i = mk('img');
        i.src = img;
        i.alt = p.nombre;
        left.append(i);
      } else left.append(mk('span', 'store-noimg', p.nombre.slice(0, 1).toUpperCase()));
      const right = mk('div', 'store-dialog-body');
      right.append(mk('span', 'store-cat', groupOf(p)), mk('h3', 'store-title', p.nombre));
      if (p.descripcion) right.append(mk('p', 'store-desc', p.descripcion));
      const specs = specsOf(p);
      if (specs.length) {
        const t = mk('table', 'store-specs');
        specs.forEach((s) => {
          const tr = mk('tr');
          tr.append(mk('th', '', s.k), mk('td', '', s.v));
          t.append(tr);
        });
        right.append(t);
      }
      const actions = mk('div', 'store-actions');
      const pdf = fileUrl(p.ficha_path);
      if (pdf) {
        const a = mk('a', 'btn btn-amber btn-sm', 'Descargar ficha técnica (PDF)');
        a.href = pdf;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        actions.append(a);
      }
      actions.append(quoteButton(p));
      right.append(actions);
      box.append(close, left, right);
      modal.replaceChildren(box);
      modal.hidden = false;
      document.body.classList.add('no-scroll');
    }

    function card(p) {
      const art = mk('article', 'store-card');
      art.dataset.group = groupOf(p);
      const fig = mk('div', 'store-img');
      const img = fileUrl(p.imagen_path);
      if (img) {
        const i = mk('img');
        i.src = img;
        i.alt = p.nombre;
        i.loading = 'lazy';
        fig.append(i);
      } else fig.append(mk('span', 'store-noimg', p.nombre.slice(0, 1).toUpperCase()));
      fig.addEventListener('click', () => openFicha(p));
      const body = mk('div', 'store-body');
      body.append(mk('span', 'store-cat', groupOf(p)), mk('h3', 'store-title', p.nombre));
      const specs = specsOf(p).slice(0, 3);
      if (specs.length) {
        const ul = mk('ul', 'store-specs-mini');
        specs.forEach((s) => {
          const li = mk('li');
          li.append(mk('b', '', s.k + ': '), document.createTextNode(s.v));
          ul.append(li);
        });
        body.append(ul);
      } else if (p.descripcion) body.append(mk('p', 'store-desc', p.descripcion.length > 120 ? p.descripcion.slice(0, 117) + '…' : p.descripcion));
      const actions = mk('div', 'store-actions');
      const ver = mk('button', 'btn btn-outline-dark btn-sm', 'Ver ficha');
      ver.type = 'button';
      ver.addEventListener('click', () => openFicha(p));
      actions.append(ver, quoteButton(p));
      body.append(actions);
      art.append(fig, body);
      return art;
    }

    function render(items) {
      if (!Array.isArray(items) || !items.length) return; // sin productos publicados la sección sigue oculta
      section.hidden = false;
      const groups = [...new Set(items.map(groupOf))];
      const chip = (label, key) => {
        const c = mk('button', 'filter-chip' + (key === 'all' ? ' active' : ''), label);
        c.type = 'button';
        c.addEventListener('click', () => {
          filterBar.querySelectorAll('.filter-chip').forEach((x) => x.classList.remove('active'));
          c.classList.add('active');
          grid.querySelectorAll('.store-card').forEach((a) => {
            a.style.display = key === 'all' || a.dataset.group === key ? '' : 'none';
          });
        });
        return c;
      };
      filterBar.replaceChildren(chip(`Todos (${items.length})`, 'all'), ...groups.map((g) => chip(g, g)));
      filterBar.hidden = groups.length < 2;
      grid.replaceChildren(...items.map(card));
    }

    fetch(`${SUPABASE_URL}/rest/v1/productos?select=id,nombre,categoria,unidad,descripcion,imagen_path,ficha_path,ficha_nombre,especificaciones,orden&order=orden.asc,nombre.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(render)
      .catch(() => {});
  })();
});
