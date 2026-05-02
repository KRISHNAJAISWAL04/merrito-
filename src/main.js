// ===== RBMI CRM =====
import './styles/index.css';
import './styles/sidebar.css';
import './styles/components.css';
import './styles/dashboard.css';
import './styles/leads.css';
import './styles/pipeline.css';
import './styles/counselors.css';
import './styles/courses.css';
import './styles/reports.css';

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
import { getCurrentUser } from './lib/auth.js';
import { createIcons } from './lib/icons.js';

// Setup global icon renderer
window.renderIcons = () => createIcons(document);

// Routes
const ph = (t) => (el) => { el.innerHTML = `<div class="page-header"><div><h1 class="page-title">${t}</h1><p class="page-subtitle">Coming soon.</p></div></div><div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:60px;text-align:center;"><div style="font-size:40px;margin-bottom:12px">🚧</div><h3>${t} — Coming Soon</h3></div>`; };

registerRoute('/dashboard', renderDashboard);
registerRoute('/leads', renderLeads);
registerRoute('/pipeline', renderPipeline);
registerRoute('/counselors', renderCounselors);
registerRoute('/courses', renderCourses);
registerRoute('/reports', renderReports);
registerRoute('/settings', renderSettings);
registerRoute('/portal', renderStudentPortal);
registerRoute('/formdesk', ph('FormDesk'));
registerRoute('/calendar', ph('Calendar Pro'));
registerRoute('/applications', renderApplications);
registerRoute('/marketing', ph('Marketing'));
registerRoute('/campaigns', ph('Campaign Manager'));
registerRoute('/queries', renderQueries);
registerRoute('/payments', renderPayments);
registerRoute('/templates', ph('Template Manager'));
registerRoute('/access-control', ph('User Access Control'));
registerRoute('/download', ph('Download App'));

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
  // Run lucide after sidebar+header render
  window.renderIcons();
  initRouter();
}

function showLogin() {
  const root = document.getElementById('login-root');
  root.classList.add('show');
  root.innerHTML = `
  <div class="lp">
    <div class="lp-left">
      <div class="lp-brand">
        <div class="lp-logo">R</div>
        <div><div class="lp-brand-name">RBMI Admission Hub</div><div class="lp-brand-sub">Admissions, applications and student journeys</div></div>
      </div>
      <div class="lp-hero">
        <h1>Admissions<br/>That Move</h1>
        <p>Run leads, applications, fee checkpoints and student communication from one focused enrollment workspace.</p>
        <div class="lp-stats">
          <div class="lp-stat"><span class="ls-n">2</span><span class="ls-l">Campuses</span></div>
          <div class="lp-stat"><span class="ls-n">500+</span><span class="ls-l">Leads/Year</span></div>
          <div class="lp-stat"><span class="ls-n">95%</span><span class="ls-l">Follow-up Rate</span></div>
        </div>
      </div>
      <div class="lp-branches">
        <div class="lp-branch"><span>📍</span><div><strong>Bareilly Campus</strong><small>Pilibhit Bypass Road, Bareilly, UP</small></div></div>
        <div class="lp-branch"><span>📍</span><div><strong>Greater Noida Campus</strong><small>Knowledge Park, Greater Noida, UP</small></div></div>
      </div>
    </div>
    <div class="lp-right">
      <div class="lp-card">
        <div class="lp-card-logo">
          <div class="lp-card-icon">R</div>
          <div><div style="font-weight:700;font-size:17px">RBMI Admission Hub</div><div style="font-size:12px;color:#64748b">Admin, counselor and student panels</div></div>
        </div>
        <h2 class="lp-title">Sign in to your account</h2>
        <div id="lerr" class="lp-err"></div>
        <form id="lform" class="lp-form">
          <div class="lp-group">
            <label>Campus</label>
            <select id="lbranch" class="lp-input">
              <option value="bareilly">📍 Bareilly Campus</option>
              <option value="greater_noida">📍 Greater Noida Campus</option>
            </select>
          </div>
          <div class="lp-group">
            <label>Email</label>
            <input type="email" id="lemail" class="lp-input" placeholder="admin@rbmi.edu.in" required/>
          </div>
          <div class="lp-group">
            <label>Password</label>
            <input type="password" id="lpass" class="lp-input" placeholder="Enter password" required/>
          </div>
          <button type="submit" class="lp-btn" id="lbtn">Sign In</button>
        </form>
        <div class="lp-div"><span>Demo Accounts</span></div>
        <div class="lp-demos">
          <button class="lp-demo" data-e="admin@rbmi.edu.in" data-p="admin123"><span class="lp-badge admin">Admin</span><div><div class="lp-demo-name">Admin RBMI</div><div class="lp-demo-email">admin@rbmi.edu.in</div></div></button>
          <button class="lp-demo" data-e="priya@rbmi.edu.in" data-p="counselor123"><span class="lp-badge counselor">Counselor</span><div><div class="lp-demo-name">Priya Sharma</div><div class="lp-demo-email">priya@rbmi.edu.in</div></div></button>
          <button class="lp-demo" data-e="rajesh@rbmi.edu.in" data-p="counselor123"><span class="lp-badge counselor">Counselor</span><div><div class="lp-demo-name">Rajesh Kumar</div><div class="lp-demo-email">rajesh@rbmi.edu.in</div></div></button>
          <button class="lp-demo" data-e="student@demo.in" data-p="student123"><span class="lp-badge student">Student</span><div><div class="lp-demo-name">Aarav Mehta</div><div class="lp-demo-email">student@demo.in</div></div></button>
        </div>
      </div>
    </div>
  </div>`;

  root.querySelectorAll('.lp-demo').forEach(b => {
    b.addEventListener('click', () => {
      document.getElementById('lemail').value = b.dataset.e;
      document.getElementById('lpass').value = b.dataset.p;
    });
  });

  document.getElementById('lform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('lemail').value.trim();
    const pass = document.getElementById('lpass').value;
    const branch = document.getElementById('lbranch').value;
    const err = document.getElementById('lerr');
    const btn = document.getElementById('lbtn');
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Signing in...';
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
      sessionStorage.setItem('rbmi_v', '5');
      sessionStorage.setItem('rbmi_user', JSON.stringify({ ...data.user, branch: data.user.branch || branch }));
      sessionStorage.setItem('rbmi_token', data.token);
      root.classList.remove('show');
      root.innerHTML = '';
      startApp({ ...data.user, branch: data.user.branch || branch });
    } catch (ex) {
      err.textContent = '⚠ ' + ex.message;
      err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });
}

// Wait for 3s boot, then show login or app
setTimeout(() => {
  hideBoot(() => {
    const user = getCurrentUser();
    if (user) startApp(user);
    else showLogin();
  });
}, 3000);



