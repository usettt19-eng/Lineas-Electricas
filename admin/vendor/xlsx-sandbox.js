/* Lee archivos Excel (xlsx/xls) dentro de un iframe aislado (sandbox sin acceso al panel ni a la sesión).
   Recibe el archivo por postMessage y devuelve solo filas de texto/números. */
addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'parse') return;
  try {
    var wb = XLSX.read(new Uint8Array(e.data.buf), { type: 'array', cellFormula: false, cellHTML: false, cellStyles: false, bookVBA: false });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
    rows = rows.slice(0, 5000).map(function (r) {
      return r.slice(0, 60).map(function (c) { return typeof c === 'number' || typeof c === 'boolean' ? c : typeof c === 'string' ? c.slice(0, 500) : ''; });
    });
    parent.postMessage({ type: 'rows', rows: rows }, '*');
  } catch (err) {
    parent.postMessage({ type: 'error' }, '*');
  }
});
parent.postMessage({ type: 'ready' }, '*');
