(() => {
  "use strict";

  const script = document.currentScript;
  const root = script?.dataset.root || ".";
  const home = `${root}/index.html`;
  const currentPath = location.pathname.replace(/\\/g, "/");
  const isProfile = currentPath.includes("/sobre-mi/");
  const isLegal = currentPath.includes("/legal/");
  const isSecurity = currentPath.includes("/security");
  const isApp = currentPath.includes("/apps/");
  const isHome = !isProfile && !isLegal && !isSecurity && !isApp;

  const logo = `
    <span class="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <path d="M32 4 54 12v17c0 14.6-8.9 25.6-22 31C18.9 54.6 10 43.6 10 29V12L32 4Z"/>
        <path d="M23 33.5 29.2 40 43 24"/>
        <path d="M22 18h20M18 26h28"/>
      </svg>
    </span>
    <span class="brand-copy">
      <span class="brand-name">OpenTrust Group</span>
      <span class="brand-tagline">Confianza digital</span>
    </span>`;

  const navItems = [
    { label: "Inicio", href: home, current: isHome },
    { label: "Propósito", href: `${home}#sobre-nosotros` },
    { label: "Ecosistema", href: `${home}#ecosistema` },
    { label: "Trayectoria", href: `${root}/sobre-mi/index.html`, current: isProfile },
    { label: "Contacto", href: `${home}#contacto` },
    { label: "Legal", href: `${root}/legal/index.html`, current: isLegal }
  ];

  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="site-header__inner">
        <a class="brand" href="${home}" aria-label="OpenTrust Group, volver al inicio">
          ${logo}
        </a>
        <button class="menu-toggle" id="menu-toggle" type="button"
          aria-label="Abrir menú" aria-expanded="false" aria-controls="main-nav">
          <span></span><span></span><span></span>
        </button>
        <nav class="main-nav" id="main-nav" aria-label="Navegación principal">
          ${navItems.map(item => `
            <a href="${item.href}"${item.current ? ' aria-current="page"' : ""}>${item.label}</a>
          `).join("")}
        </nav>
      </div>`;
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    const year = new Date().getFullYear();
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="site-footer__inner">
        <div class="site-footer__grid">
          <div>
            <div class="site-footer__brand">OpenTrust Group</div>
            <p class="site-footer__intro">
              Ecosistema independiente de conocimiento y aplicaciones para arquitectura,
              ciberseguridad, gobierno, riesgo, cumplimiento, privacidad e inteligencia artificial segura.
            </p>
          </div>
          <div>
            <h3>Ecosistema</h3>
            <a href="${home}#ecosistema">Portales de conocimiento</a>
            <a href="${home}#ecosistema">Aplicaciones</a>
            <a href="${root}/apps/arq-studio.html">Arq Studio</a>
            <a href="${root}/apps/audithub.html">AuditHub</a>
          </div>
          <div>
            <h3>OpenTrust</h3>
            <a href="${home}#sobre-nosotros">Propósito</a>
            <a href="${root}/sobre-mi/index.html">Vida profesional</a>
            <a href="${home}#contacto">Contacto</a>
            <a href="${root}/legal/index.html">Legal</a>
            <a href="${root}/security">Seguridad</a>
          </div>
          <div>
            <h3>Aplicaciones</h3>
            <a href="${root}/apps/privacy-studio.html">Privacy Studio</a>
            <a href="https://link-studio.opentrust.group">Link Studio</a>
            <a href="https://metadata-studio.opentrust.group">Metadata Studio</a>
          </div>
        </div>
        <div class="site-footer__bottom">
          <span>© ${year} OpenTrust Group · Todos los derechos reservados</span>
          <span>Confianza digital · Conocimiento abierto · Tecnología responsable</span>
        </div>
      </div>`;
  }

  if (isApp) {
    const main = document.querySelector("main");
    if (main && !main.querySelector(".app-back-nav")) {
      const backNav = document.createElement("nav");
      backNav.className = "app-back-nav";
      backNav.setAttribute("aria-label", "Navegación de retorno");
      backNav.innerHTML = `
        <a class="app-back-link" href="${home}#ecosistema">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M15 18 9 12l6-6"/>
          </svg>
          <span>Volver al ecosistema</span>
        </a>`;

      const textHost =
        main.querySelector(".hero-copy, .link-hero__copy, .app-hero__copy, .product-hero__copy");

      if (textHost) {
        textHost.prepend(backNav);
      } else {
        main.prepend(backNav);
      }
    }
  }

  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("active");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    });

    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("active");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.querySelectorAll("a[href]").forEach(link => {
    const raw = link.getAttribute("href");
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") ||
        raw.startsWith("tel:") || raw.startsWith("javascript:")) return;

    try {
      const url = new URL(raw, location.href);
      const external = /^https?:$/.test(url.protocol) && url.origin !== location.origin;

      if (external) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else {
        link.removeAttribute("target");
        const rel = (link.getAttribute("rel") || "")
          .split(/\s+/)
          .filter(Boolean)
          .filter(value => !["noopener", "noreferrer"].includes(value));
        if (rel.length) link.setAttribute("rel", rel.join(" "));
        else link.removeAttribute("rel");
      }
    } catch (_) {}
  });
})();