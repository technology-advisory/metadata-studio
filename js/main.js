document.addEventListener('DOMContentLoaded', () => {
  initYear();
  loadEcosystem();
});

function renderHeader() {
  const headerContainer = document.getElementById('site-header');
  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <a href="/" class="brand" aria-label="OpenTrust Group, inicio">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" role="img">
          <path d="M32 4 54 12v17c0 14.6-8.9 25.6-22 31C18.9 54.6 10 43.6 10 29V12L32 4Z"/>
          <path d="M23 33.5 29.2 40 43 24"/>
          <path d="M22 18h20M18 26h28"/>
        </svg>
      </span>
      <span class="brand-text">OpenTrust<br><strong>Group</strong></span>
    </a>
    <button class="menu-toggle" id="menu-toggle" aria-label="Abrir menú de navegación" aria-expanded="false" aria-controls="main-nav">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>
    <nav class="main-nav" id="main-nav" aria-label="Navegación principal">
      <a href="#sobre-nosotros">Propósito</a>
      <a href="#ecosistema">Ecosistema</a>
      <a href="sobre-mi/index.html" rel="nofollow">Trayectoria</a>
      <a href="#contacto">Contacto</a>
    </nav>
  `;
}

function initMenuToggle() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('active');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  });
}

function initYear() {
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

function initMenuLinks() {
  const nav = document.getElementById('main-nav');
  const toggle = document.getElementById('menu-toggle');
  if (!nav || !toggle) return;
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú de navegación');
  }));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function renderProjectCard(item, iconMap) {
  const svgContent = iconMap[item.icon] || iconMap.shield;
  const badgeIconMap = {
    bulb: `<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.9 10.56c.76.66 1.4 1.73 1.65 2.94h4.5c.25-1.21.89-2.28 1.65-2.94A6 6 0 0 0 12 3Z"/>`,
    star: `<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>`,
    lock: `<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>`,
    shield: `<path d="M12 3 20 6v6c0 5-3 8.5-8 10-5-1.5-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>`,
    sparkles: `<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/>`,
    eye: `<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>`,
    rocket: `<path d="M14 4c3-1 5-1 6-1 0 1 0 3-1 6l-6 6-4-4 5-7Z"/><path d="m9 11-4 1-2 2 5 1"/><path d="m13 15-1 4-2 2-1-5"/>`,
    flask: `<path d="M9 3h6"/><path d="M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3"/><path d="M7.5 15h9"/>`
  };

  const badgeIconName = item.badgeIcon || (item.bulb ? 'bulb' : null);
  const badgeSvg = badgeIconName ? badgeIconMap[badgeIconName] : '';
  const badgeHtml = badgeSvg ? `<span class="project-badge-icon project-badge-icon--${escapeHtml(badgeIconName)}" title="${escapeHtml(badgeIconName)}"><svg viewBox="0 0 24 24" aria-hidden="true">${badgeSvg}</svg></span>` : '';
  const isComingSoon = item.status === 'coming-soon';
  const isPreview = item.status === 'prev';
  const actionHtml = isComingSoon ? '<span class="project-status">Próximamente</span>' : `<span class="visit">${isPreview ? 'Previsualización del proyecto' : 'Visitar iniciativa'} →</span>`;

  const card = `<article class="project-card${isComingSoon ? ' project-card--coming-soon' : ''}">
    <div class="project-head"><div class="project-icon" aria-hidden="true"><svg viewBox="0 0 64 64">${svgContent}</svg></div><h3>${escapeHtml(item.name)}</h3>${badgeHtml}</div>
    <p class="tagline"><strong>${escapeHtml(item.tagline)}</strong></p>
    <p>${escapeHtml(item.description)}</p>${actionHtml}
  </article>`;

  if (isComingSoon) return `<div class="ecosystem-card-link ecosystem-card-link--disabled" aria-label="${escapeHtml(item.name)}, próximamente">${card}</div>`;
  const resolved = new URL(item.url, window.location.origin);
  const external = resolved.origin !== window.location.origin;
  const targetAttrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${escapeHtml(item.url)}" class="ecosystem-card-link"${targetAttrs}>${card}</a>`;
}

async function loadEcosystem() {
  const container = document.getElementById('ecosystem-grid');
  if (!container) return;
  const iconMap = {
    shield: `<path d="M32 8 52 16v15c0 13-8 22-20 27-12-5-20-14-20-27V16l20-8Z"/><path d="M24 33l6 6 12-15"/>`,
    alert: `<circle cx="32" cy="32" r="20"/><path d="M32 19v16"/><circle cx="32" cy="45" r="2"/>`,
    radar: `<circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="5"/><path d="M32 12v20l14 7"/>`,
    network: `<circle cx="32" cy="32" r="20"/><path d="M12 32h40M32 12c7 7 10 14 10 20s-3 13-10 20M32 12c-7 7-10 14-10 20s3 13 10 20"/>`,
    ai: `<path d="M20 18h24a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6Z"/><path d="M25 38V27l7-4 7 4v11l-7 4-7-4Z"/><path d="M32 23v19M25 27l14 11M39 27 25 38"/>`,
    diagram: `<rect x="12" y="12" width="12" height="12" rx="2"/><rect x="40" y="12" width="12" height="12" rx="2"/><rect x="26" y="40" width="12" height="12" rx="2"/><path d="M24 18h16M46 24v8M32 24v16"/>`,
    clipboard: `<path d="M24 10h16v8H24z"/><path d="M20 14h24a4 4 0 0 1 4 4v30a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z"/><path d="M24 30h16M24 38h12"/>`,
    link: `<path d="M26 38 20 44a10 10 0 0 1-14-14l8-8a10 10 0 0 1 14 0"/><path d="m38 26 6-6a10 10 0 0 1 14 14l-8 8a10 10 0 0 1-14 0"/><path d="M22 42 42 22"/>`,
    metadata: `<path d="M18 10h20l8 8v34H18z"/><path d="M38 10v10h8"/><path d="M24 30h16M24 38h10"/><circle cx="42" cy="44" r="6"/><path d="m46 48 5 5"/>`
  };

  try {
    const response = await fetch('data/ecosistema.json?v=20260824-1');
    if (!response.ok) throw new Error('No se pudo recuperar el ecosistema');
    const data = await response.json();
    const docs = data.filter(item => item.category === 'docs');
    const apps = data.filter(item => item.category === 'apps');
    container.innerHTML = `<div class="ecosystem-group"><h3 class="ecosystem-group-title">Portales de conocimiento</h3><div class="ecosystem-grid-list ecosystem-grid-list--docs">${docs.map(item => renderProjectCard(item, iconMap)).join('')}</div></div><div class="ecosystem-group"><h3 class="ecosystem-group-title">Aplicaciones</h3><div class="ecosystem-grid-list ecosystem-grid-list--apps">${apps.map(item => renderProjectCard(item, iconMap)).join('')}</div></div>`;
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="error-msg">No ha sido posible cargar el ecosistema en este momento.</p>';
  }
}
