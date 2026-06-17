export function createHashRouter({ routes, fallbackPath, beforeEach, onRouteChange }) {
  const routeMap = new Map(routes.map((route) => [route.path, route]));

  async function resolveCurrentRoute() {
    const rawHash = window.location.hash.replace(/^#/, "") || fallbackPath;
    const path = rawHash.startsWith("/") ? rawHash : `/${rawHash}`;
    const route = routeMap.get(path) || routeMap.get(fallbackPath);

    if (!route) {
      return;
    }

    const canEnter = beforeEach ? await beforeEach(route) : true;
    if (!canEnter) {
      window.location.href = "../userpage/index.html";
      return;
    }

    await onRouteChange(route);
  }

  return {
    start() {
      window.addEventListener("hashchange", resolveCurrentRoute);
      resolveCurrentRoute();
    }
  };
}
