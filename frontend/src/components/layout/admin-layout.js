function createNav(routes) {
  return routes
    .map(
      (route) => `
        <a class="admin-nav-link" data-route-link href="#${route.path}">
          <i class="bi ${route.icon}"></i>
          <span>${route.label}</span>
        </a>
      `
    )
    .join("");
}

export function renderAdminLayout(root, { routes, user, onLogout }) {
  root.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-brand">
          <i class="bi bi-grid-1x2-fill"></i>
          <span>UcMarket Admin</span>
        </div>
        <nav class="admin-nav">${createNav(routes)}</nav>
      </aside>
      <div class="admin-main">
        <header class="admin-topbar">
          <div>
            <div class="fw-semibold">事件審核</div>
            <div class="text-secondary small">審核使用者提交的事件，確保符合上架規則</div>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div class="text-end">
              <div class="fw-semibold">${user?.username || "admin"}</div>
              <div class="small text-secondary">管理員</div>
            </div>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-logout-button>登出</button>
          </div>
        </header>
        <main class="admin-content" data-admin-content></main>
      </div>
    </div>
  `;

  const contentEl = root.querySelector("[data-admin-content]");
  const routeLinks = [...root.querySelectorAll("[data-route-link]")];
  const logoutButton = root.querySelector("[data-logout-button]");

  logoutButton.addEventListener("click", onLogout);

  return {
    contentEl,
    setActive(path) {
      routeLinks.forEach((link) => {
        const href = link.getAttribute("href")?.replace(/^#/, "");
        link.classList.toggle("active", href === path);
      });
    }
  };
}
