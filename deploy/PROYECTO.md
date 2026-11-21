# Use Union de Servicios Especializados — Sitio web y sistema de administración

Documento de referencia del proyecto. Vive en `deploy/`, que Nginx **bloquea** al público
(no se sirve en la web). No contiene claves ni contraseñas.

- Sitio público: https://energia.useservices.company
- Administración: https://energia.useservices.company/admin
- Repositorio: `usettt19-eng/Lineas-Electricas` (rama de trabajo `claude/charming-fermi-5n6s4m`)
- Facebook: https://www.facebook.com/profile.php?id=61596929634193
- WhatsApp: +507 6975 9851 (`https://wa.me/50769759851`)

## 1. Negocio

Panamá. Suministro de materiales y equipos para líneas eléctricas de 13.8, 34.5, 115 y 230 kV,
transformadores y alumbrado público. **Todas las ventas son de exportación (principalmente a
Venezuela)**: ITBMS 0 %, la nacionalización se hace en el país destino. No se atienden clientes
en Panamá. Las compras pueden ser EXW, FOB o CIF.

## 2. Arquitectura

| Capa | Detalle |
|---|---|
| Sitio público | HTML/CSS/JS estático (`index.html`, `styles.css`, `app.js`) servido por Nginx en un VPS Linux |
| Administración | SPA en JS puro sin compilación (`admin/*.js`, global `App`); DOM con `App.el` (sin `innerHTML` con datos) |
| Base de datos | Supabase: Postgres con RLS, Storage (bucket `adjuntos` y bucket de productos) y Auth con correo/contraseña |
| Librerías locales | `admin/vendor/`: pdf.js 4.10.38 y SheetJS 0.18.5 (este último se ejecuta dentro de un iframe aislado) |
| Despliegue | `git pull` en el servidor; sin pasos de compilación |

La clave pública (anon) de Supabase va en el sitio por diseño; la seguridad la dan las políticas RLS,
la lista de administradores (`is_admin()`) y los permisos por columna.

## 3. Sitio público

- Categorías: Transformadores, Alumbrado público, estructuras, aisladores y herrajes, protecciones.
- **Conductores y cables: “próximamente”.** No hay postes ni crucetas de madera.
- Formulario de cotización → tabla de solicitudes en Supabase; adjuntos (Excel/PDF/DWG, etc.)
  con validación de extensión, tamaño, cantidad y firma real del archivo.
- Plantilla descargable de lista de materiales: `plantilla-materiales.xlsx`.
- Barra “Incluir en cotización”, enlaces de WhatsApp enlazados al número configurado en Admin.
- Tienda virtual (`#tienda`): oculta hasta que haya productos publicados; muestra imagen, ficha y PDF.
- **Nunca se publican costos ni proveedores.**
- Pie: ícono de Facebook conectado; JSON-LD con `sameAs` de Facebook.

## 4. Administración (`/admin`)

Login con Supabase Auth. Módulos:

- **Solicitudes**: pipeline por etapas, detalle por pestañas, documentos del cliente (planos,
  especificaciones, cómputos métricos), solicitudes creadas manualmente.
- **Clientes**, **Productos** (catálogo interno, también a mano; ficha técnica, imagen, PDF),
  **Proveedores** (por especialidad), **Transportistas**.
- **Cotizaciones a proveedores y transportistas** (RFQ) y comparativo.
- **Proformas** con costeo y utilidad.
- **Finanzas**: cobros, pagos, movimientos, expediente y asientos.
- **Empresa**: datos de la empresa, marca, número de WhatsApp (se refleja en todo el sitio).
- **Importadores**: pegar desde la web o Excel (productos, proveedores, tablas de cliente).
  Parser de embalaje: “PESO NETO / PESO BRUTO / # DE CAJAS / DIMENSIONES 51x43x32” llena los campos solo.
- **Tienda**: ficha de producto, sugerencias de portada/especificaciones desde PDF, generador de tarjeta.

### Costeo

Matriz de Incoterms de compra y venta (EXW, FOB, CIF…): fletes FOB/CIF, factor de costo puesto
(landed cost), tipo de cambio, crédito ITBMS en compras, utilidad sobre costo. Venta siempre
exportación (ITBMS 0 %). Verificado con pruebas automáticas.

## 5. Seguridad

- RLS en todas las tablas; `anon` solo puede insertar solicitudes y subir adjuntos limitados;
  columnas con permisos explícitos; función `is_admin()` como lista permitida.
- Subida de archivos: lista de extensiones, tamaño máximo, firma (magic bytes), límite por IP
  en la base de datos. El servidor no ejecuta lo subido.
- Nginx (`deploy/nginx-energia-seguridad.conf`, incluido como
  `include snippets/energia-seguridad.conf;`): CSP, HSTS, `nosniff`, solo GET/HEAD,
  bloqueo de dotfiles y de `/deploy/`; zona de límite de peticiones disponible (comentada).
- **Pendiente en Supabase Auth (lado del usuario):** desactivar registros públicos, activar MFA,
  activar protección de contraseñas filtradas.

## 6. SEO

`robots.txt`, `sitemap.xml` (en Search Console se envía **solo** `sitemap.xml`), canonical,
Open Graph/Twitter con `assets/og-image.jpg` (1200×630), JSON-LD `IndustrialBusiness`.
Falta, del lado del usuario: “Solicitar indexación” en Search Console.

## 7. Facebook (carpeta `deploy/facebook/`)

Imágenes y textos listos:

| Archivo | Uso |
|---|---|
| `perfil-use.jpg` (1080×1080) | Foto de perfil genérica “USE” (la página usa el logo real “USE División Energía”) |
| `cover-use.jpg` (1640×624) | Portada; el texto va solo en la franja superior porque el logo tapa el centro/izquierda inferior |
| `post1-presentacion.jpg` … `post4-cotiza.jpg` (1080×1080) | Cuatro publicaciones |
| `publicaciones-facebook.txt` | Textos de las 4 publicaciones con enlaces y hashtags |
| `mk_fb.py`, `mk_perfil.py` | Generadores (Pillow + fuente Inter). `python3 mk_fb.py <carpeta>`; `mk_perfil.py` reutiliza `mk_fb.py` |

Orden sugerido: una publicación por día, entre semana por la mañana; fijar la n.º 4.
No publicar precios, costos, datos de clientes/proveedores ni conductores.

Pendiente: completar “Información” de la página (web, WhatsApp, correo) y, si se crea un nombre de
usuario de página, actualizar el enlace del pie y `sameAs` en `index.html`.

## 8. Operación

- Actualizar el servidor: `git pull origin <rama>` en la carpeta del sitio.
- Comprobar Facebook en producción:
  `curl -s https://energia.useservices.company/ | grep -o 'facebook.com/profile.php?id=[0-9]*'` (debe salir 2 veces).
- Antes de operar de verdad: borrar datos de prueba (primero movimientos y proformas).

## 9. Pendientes

1. Supabase Auth: sin registros públicos, MFA, contraseñas filtradas.
2. Revisión funcional del sitio y de `/admin` con la CSP activa.
3. Borrar datos de prueba.
4. Search Console: solicitar indexación.
5. Facebook: subir perfil/portada, publicar, completar “Información”.
6. Decidir si se crea un pull request (no se ha creado ninguno).
