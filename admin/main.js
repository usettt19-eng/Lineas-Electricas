/* Arranque del panel: inicio de sesión, menú y navegación. */
(() => {
  'use strict';
  const { el, $ } = App;
  const ORDER = ['solicitudes', 'clientes', 'productos', 'proveedores', 'transportistas', 'finanzas', 'empresa'];
  let current = 'solicitudes';

  App.showLogin = (err) => {
    $('app').hidden = true; $('login').hidden = false;
    $('loginErr').hidden = !err; $('loginErr').textContent = err || '';
    App.closeDialog(); App.closeDialog(true); $('drawer').hidden = true;
  };

  function go(id) {
    current = id;
    [...$('nav').children].forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    App.views[id].render($('main'));
  }
  // Al cerrar el panel lateral se actualiza la vista actual para reflejar los cambios
  App.onDrawerClose = () => { if (!$('app').hidden) go(current); };

  async function showApp() {
    let ok = false;
    try { ok = (await App.api('/rest/v1/rpc/is_admin', { method: 'POST', body: '{}' })) === true; }
    catch (e) { if (e.code === 'SESION') { App.clearSession(); return App.showLogin('La sesión expiró. Entra de nuevo.'); } }
    if (!ok) { App.clearSession(); return App.showLogin('Esta cuenta no está autorizada para ver el panel.'); }
    $('login').hidden = true; $('app').hidden = false; $('who').textContent = App.session.user.email;
    $('nav').replaceChildren(...ORDER.map((id) => el('button', { type: 'button', 'data-id': id, text: App.views[id].label, onclick: () => go(id) })));
    App.loadBrand(); go(current);
  }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await App.login($('email').value.trim(), $('password').value); $('password').value = ''; await showApp(); }
    catch (err) { App.showLogin(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : err.message); }
  });
  $('logout').addEventListener('click', async () => {
    try { await App.api('/auth/v1/logout', { method: 'POST', body: '{}' }); } catch (_) {}
    App.clearSession(); App.cache = {}; App.showLogin();
  });
  $('reload').addEventListener('click', () => { App.cache = {}; go(current); });
  $('drawer').addEventListener('click', (e) => { if (e.target === $('drawer')) App.closeDrawer(); });
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) App.closeDialog(); });
  $('modal2').addEventListener('click', (e) => { if (e.target === $('modal2')) App.closeDialog(true); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('modal2').hidden) App.closeDialog(true); else if (!$('modal').hidden) App.closeDialog(); else if (!$('drawer').hidden) App.closeDrawer(); } });

  App.loadSession() ? showApp() : App.showLogin();
})();
