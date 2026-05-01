// ===== ROUTER =====
const routes = {};
let currentRoute = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigateTo(path) {
  window.location.hash = path;
}

export function getCurrentRoute() {
  return currentRoute;
}

function runLucide() {
  window.renderIcons();
}

export function initRouter() {
  function handleRoute() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    currentRoute = hash;
    const el = document.getElementById('page-content');
    if (!el) return;

    const handler = routes[hash];
    if (!handler) {
      el.innerHTML = `<div style="text-align:center;padding:4rem;"><h2>404</h2><p style="color:#64748b;margin-top:8px;">Page not found</p><button class="btn btn-primary" style="margin-top:16px;" onclick="window.location.hash='/dashboard'">Dashboard</button></div>`;
      runLucide();
      return;
    }

    el.style.opacity = '0.5';
    Promise.resolve(handler(el)).then(() => {
      el.style.opacity = '1';
      window.renderIcons(); // run immediately
      setTimeout(() => window.renderIcons(), 100); // run again after any async renders
    }).catch(err => {
      el.style.opacity = '1';
      el.innerHTML = `<div class="error-state"><h3>Error loading page</h3><p>${err.message}</p><button class="btn btn-primary" onclick="location.reload()">Reload</button></div>`;
      runLucide();
    });
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
  window.addEventListener('rbmi:refresh', () => handleRoute());
}
