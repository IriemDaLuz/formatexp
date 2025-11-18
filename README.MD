# FormatExp — Landing + Panel MVP (HTML/CSS/JS)

Proyecto estático para la validación inicial de **FormatExp**, un SaaS de IA para profesores y academias.

## Estructura

- `index.html` — Landing principal con:
  - Propuesta de valor.
  - Planes y precios.
  - FAQ.
  - Formulario **definitivo** de lista de espera / alta.
- `login.html` — Pantalla de acceso al panel:
  - Login simulado sin contraseña (email + localStorage).
- `app.html` — Panel del profesor:
  - Navegación lateral.
  - Sección “Nuevo material”.
  - Historial de materiales (simulado).
  - Vista de créditos IA.
  - Vista “Cuenta”.
- `styles.css` — Estilos globales para landing, login y panel.
- `script.js` — Lógica de:
  - Formulario de landing (validación + almacenamiento).
  - Login simulado.
  - Panel (materiales, créditos, navegación).
- `robots.txt` — Básico para crawlers.
- `sitemap.xml` — Sitemap mínima (`/` y `/login.html`).

## Cómo ejecutar en local

```bash
# Opción rápida
npx serve .

# O con Python
python -m http.server 4173
