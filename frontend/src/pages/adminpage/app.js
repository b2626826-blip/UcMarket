import { renderAdminLayout } from "../../components/layout/admin-layout.js";
import { createHashRouter } from "../../router/router.js";
import { adminRoutes } from "../../router/admin-routes.js";
import { authStore } from "../../store/auth-store.js";

export async function initAdminApp() {
  const app = document.querySelector("#app");
  if (!app) return;

  const user = await authStore.refreshSession();
  const canAccess = authStore.isAuthenticated() && authStore.isAdmin();

  if (!canAccess) {
    app.innerHTML = `<div class="container py-5"><div class="alert alert-warning">沒有管理員權限，將導向前台頁面。</div></div>`;
    setTimeout(() => {
      window.location.href = "../userpage/index.html";
    }, 800);
    return;
  }

  const layout = renderAdminLayout(app, {
    routes: adminRoutes,
    user,
    onLogout: async () => {
      await authStore.logout();
      window.location.href = "../userpage/index.html";
    }
  });

  const router = createHashRouter({
    routes: adminRoutes,
    fallbackPath: "/admin/dashboard",
    beforeEach: async (route) => {
      if (!route.meta?.requiresAdmin) return true;
      const hasAccess = authStore.isAuthenticated() && authStore.isAdmin();
      return hasAccess;
    },
    onRouteChange: async (route) => {
      layout.setActive(route.path);
      await route.view(layout.contentEl);
    }
  });

  router.start();
}
