// ===== RBMI Admission Hub =====
import './styles/index.css';
import './styles/sidebar.css';
import './styles/components.css';
import './styles/dashboard.css';
import './styles/leads.css';
import './styles/pipeline.css';
import './styles/counselors.css';
import './styles/courses.css';
import './styles/reports.css';
import './styles/login.css';

import { registerRoute, initRouter } from './router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderLeads } from './pages/leads.js';
import { renderPipeline } from './pages/pipeline.js';
import { renderCounselors } from './pages/counselors.js';
import { renderCourses } from './pages/courses.js';
import { renderReports } from './pages/reports.js';
import { renderSettings } from './pages/settings.js';
import { renderApplications } from './pages/applications.js';
import { renderQueries } from './pages/queries.js';
import { renderPayments } from './pages/payments.js';
import { renderStudentPortal } from './pages/studentPortal.js';
import { renderAccessControl, renderAiAssistant, renderCalendar, renderCampaigns, renderFormDesk, renderIntegrations, renderMarketing, renderMobileApp, renderTemplates } from './pages/platformSections.js';
import { renderAuditLog } from './pages/auditLog.js';
import { getCurrentUser, getToken, logout } from './lib/auth.js';
import { API_BASE } from './lib/api.js';
import { showLogin, showSignup } from './pages/login.js';
import { createIcons } from './lib/icons.js';
import { getSupabase } from './lib/supabase.js';

window.renderIcons = () => createIcons(document);

const routes = [
  ['/dashboard', renderDashboard],
  ['/leads', renderLeads],
  ['/pipeline', renderPipeline],
  ['/counselors', renderCounselors],
  ['/courses', renderCourses],
  ['/reports', renderReports],
  ['/settings', renderSettings],
  ['/portal', renderStudentPortal],
  ['/formdesk', renderFormDesk],
  ['/calendar', renderCalendar],
  ['/applications', renderApplications],
  ['/marketing', renderMarketing],
  ['/campaigns', renderCampaigns],
  ['/queries', renderQueries],
  ['/payments', renderPayments],
  ['/templates', renderTemplates],
  ['/access-control', renderAccessControl],
  ['/download', renderMobileApp],
  ['/ai-assistant', renderAiAssistant],
  ['/integrations', renderIntegrations],
  ['/audit-log', renderAuditLog]
];
routes.forEach(([path, fn]) => registerRoute(path, fn));

function hideBoot(cb) {
  const el = document.getElementById('boot');
  if (!el) { cb(); return; }
  el.style.opacity = '0';
  setTimeout(() => { el.remove(); cb(); }, 400);
}

function startApp(user) {
  if (user?.role === 'student' && (!window.location.hash || window.location.hash === '#/dashboard')) window.location.hash = '/portal';
  document.getElementById('app').classList.add('show');
  renderSidebar(user);
  renderHeader(user);
  window.renderIcons();
  initRouter();
}

function saveSession(payload, branch) {
  sessionStorage.setItem('rbmi_v', '5');
  sessionStorage.setItem('rbmi_user', JSON.stringify({ ...payload.user, branch: payload.user.branch || branch }));
  sessionStorage.setItem('rbmi_token', payload.token);
}

function clearAuth() {
  sessionStorage.removeItem('rbmi_v');
  sessionStorage.removeItem('rbmi_user');
  sessionStorage.removeItem('rbmi_token');
}

// Handle Google OAuth callback
async function handleAuthCallback() {
  const hash = window.location.hash.slice(1);
  if (!hash) return false;
  
  try {
    const supabase = getSupabase();
    
    if (supabase) {
      const { data, error } = await supabase.auth.getSessionFromUrl();
      if (error) throw error;
      
      if (data?.session?.access_token) {
        const urlParams = new URLSearchParams(window.location.search);
        const branch = urlParams.get('branch') || 'bareilly';
        
        // Exchange the Supabase token with our backend
        const res = await fetch(`${API_BASE}/auth/supabase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: data.session.access_token })
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Authentication failed');
        
        saveSession(payload, branch);
        window.location.hash = payload.user.role === 'student' ? '/portal' : '/dashboard';
        window.history.replaceState({}, document.title, window.location.pathname);
        startApp({ ...payload.user, branch: payload.user.branch || branch });
        return true;
      }
    }
  } catch (err) {
    console.error('Auth callback error:', err);
  }
  return false;
}

function handleLoginSuccess(payload, branch) {
  saveSession(payload, branch);
  startApp({ ...payload.user, branch: payload.user.branch || branch });
}

function showSignupPage() {
  showSignup({ onSuccess: handleLoginSuccess, onLoginClick: showLoginPage });
}

function showLoginPage() {
  showLogin({ onSuccess: handleLoginSuccess, onSignupClick: showSignupPage });
}

setTimeout(() => {
  hideBoot(async () => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    
    if (params.get('access_token')) {
      handleAuthCallback();
      return;
    }
    
    const user = getCurrentUser();
    if (user) {
      startApp(user);
    } else if (window.location.hash === '#/signup') {
      showSignupPage();
    } else {
      showLoginPage();
    }
  });
}, 3000);
