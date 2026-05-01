// ===== AUTH HELPERS — no circular imports =====
const V = '5';

export function getCurrentUser() {
  try {
    if (sessionStorage.getItem('rbmi_v') !== V) {
      sessionStorage.clear();
      sessionStorage.setItem('rbmi_v', V);
      return null;
    }
    return JSON.parse(sessionStorage.getItem('rbmi_user') || 'null');
  } catch { return null; }
}

export function getToken() {
  return sessionStorage.getItem('rbmi_token') || '';
}

export function logout() {
  sessionStorage.clear();
  window.location.reload();
}
