/* Vista: Datos de empresa (alimenta la página pública). */
(() => {
  'use strict';
  const { el, $ } = App;

  App.register('empresa', 'Datos de empresa', {
    async render(main) {
      const f = {};
      const field = (k, label, props = {}, hint) => {
        f[k] = el('input', { required: true, ...props });
        return el('div', { class: 'field' }, el('label', { text: label }), f[k], hint ? el('div', { class: 'hint', text: hint }) : null);
      };
      const err = el('div', { class: 'msg-err', hidden: true });
      const form = el('form', { class: 'box', style: 'max-width:640px' },
        el('h2', { text: 'Datos de la empresa' }),
        el('p', { class: 'sub', text: 'Se muestran en la página pública (teléfono, correo, dirección y botones de WhatsApp) y en las proformas. Los cambios se ven al recargar la página.' }),
        field('name', 'Nombre de la empresa', { maxlength: 160 }), field('contact', 'Persona de contacto', { maxlength: 120 }),
        field('phone', 'Teléfono visible', { maxlength: 40 }),
        field('whatsapp', 'Número de WhatsApp', { inputmode: 'numeric', maxlength: 20 }, 'Solo dígitos con código de país, por ejemplo 5074320507.'),
        field('email', 'Correo de cotizaciones', { type: 'email', maxlength: 160 }), field('address', 'Dirección física', { maxlength: 300 }),
        el('button', { class: 'btn', type: 'submit', text: 'Guardar cambios' }), err);
      main.replaceChildren(form);
      await App.guard(async () => {
        const c = await App.loadBrand(); if (!c) return;
        ['name', 'contact', 'phone', 'whatsapp', 'email', 'address'].forEach((k) => (f[k].value = c[k]));
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const wa = App.digits(f.whatsapp.value);
        if (!/^[0-9]{8,15}$/.test(wa)) { err.textContent = 'El WhatsApp debe tener entre 8 y 15 dígitos (con código de país).'; err.hidden = false; return; }
        const body = { name: f.name.value.trim(), contact: f.contact.value.trim(), phone: f.phone.value.trim(), whatsapp: wa, email: f.email.value.trim(), address: f.address.value.trim() };
        err.hidden = true;
        App.guard(async () => { await App.patch('config_marca', 1, body); f.whatsapp.value = wa; App.brand = { ...App.brand, ...body }; App.toast('Datos guardados. Ya se ven en la página pública.'); });
      });
    }
  });
})();
