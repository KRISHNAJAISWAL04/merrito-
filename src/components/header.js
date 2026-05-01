// ===== HEADER COMPONENT — RBMI CRM =====
import { openModal } from './modal.js';
import { createLead, fetchCounselors, fetchCourses } from '../lib/api.js';

export function renderHeader(user = null) {
  const header = document.getElementById('top-header');
  if (!header) return;

  const isAdmin = !user || user.role === 'admin';

  header.innerHTML = `
    <div class="header-left">
      <button class="header-menu-toggle" id="menu-toggle" title="Toggle sidebar" style="font-size:18px;padding:8px;">☰</button>
      <div class="header-breadcrumb" id="header-breadcrumb">
        <span>RBMI</span>
        <span style="opacity:0.4;margin:0 4px;">›</span>
        <span id="breadcrumb-page">Dashboard</span>
      </div>
    </div>
    <div class="header-right">
      <button class="header-btn" id="btn-notifications" title="Notifications" style="font-size:18px;">🔔</button>
      <div class="header-divider"></div>
      ${isAdmin ? `
      <button class="btn btn-primary header-add-btn" id="btn-add-lead">
        <span style="font-size:16px;margin-right:4px;">+</span> Add Lead
      </button>
      ` : `
      <button class="btn btn-primary header-add-btn" id="btn-add-lead">
        <span style="font-size:16px;margin-right:4px;">+</span> New Lead
      </button>
      `}
      <div class="header-user-chip">
        <div class="header-avatar">${user ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'AD'}</div>
        <span class="header-username">${user ? user.name.split(' ')[0] : 'Admin'}</span>
        <span class="header-role-badge ${user?.role === 'admin' ? 'admin' : 'counselor'}">${user?.role === 'admin' ? 'Admin' : 'Counselor'}</span>
      </div>
    </div>
  `;

  // Update breadcrumb on route change
  const breadcrumbMap = {
    '/dashboard': 'Dashboard', '/leads': 'Leads Manager', '/pipeline': 'Pipeline',
    '/counselors': 'Counselors', '/courses': 'Courses', '/reports': 'Reports',
    '/settings': 'Settings', '/formdesk': 'FormDesk', '/calendar': 'Calendar',
    '/applications': 'Applications', '/marketing': 'Marketing', '/campaigns': 'Campaigns',
    '/queries': 'Queries', '/payments': 'Payments', '/templates': 'Templates'
  };
  function updateBreadcrumb() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    const el = document.getElementById('breadcrumb-page');
    if (el) el.textContent = breadcrumbMap[hash] || hash.slice(1);
  }
  updateBreadcrumb();
  window.addEventListener('hashchange', updateBreadcrumb);

  // Menu toggle
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    document.getElementById('main-wrapper')?.classList.toggle('sidebar-collapsed');
  });

  // Notifications
  document.getElementById('btn-notifications')?.addEventListener('click', () => {
    openModal('Notifications', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="notif-item-row"><span class="notif-dot new"></span><div><strong>New lead captured</strong><br/><small style="color:#64748b;">Just now via webhook</small></div></div>
        <div class="notif-item-row"><span class="notif-dot"></span><div><strong>Stage update</strong><br/><small style="color:#64748b;">Rahul Sharma moved to Admitted</small></div></div>
        <div class="notif-item-row"><span class="notif-dot"></span><div><strong>Counseling scheduled</strong><br/><small style="color:#64748b;">Priya has 3 sessions today</small></div></div>
      </div>
    `, { submitLabel: 'Mark All Read', width: '420px' });
  });

  // Add Lead button
  document.getElementById('btn-add-lead')?.addEventListener('click', async () => {
    let counselors = [], courses = [];
    try {
      [counselors, courses] = await Promise.all([fetchCounselors(), fetchCourses()]);
    } catch (e) { /* ignore */ }

    const SOURCES = ['Website', 'Walk-in', 'Referral', 'Social Media', 'Education Fair', 'Google Ads', 'Phone Inquiry', 'JustDial', 'Shiksha', 'CollegeDekho'];

    const content = `
      <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group">
          <label class="form-label">First Name *</label>
          <input type="text" id="nl-fname" class="form-input" placeholder="First name" required />
        </div>
        <div class="form-group">
          <label class="form-label">Last Name</label>
          <input type="text" id="nl-lname" class="form-input" placeholder="Last name" />
        </div>
        <div class="form-group">
          <label class="form-label">Phone *</label>
          <input type="tel" id="nl-phone" class="form-input" placeholder="+91 XXXXX XXXXX" required />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="nl-email" class="form-input" placeholder="email@example.com" />
        </div>
        <div class="form-group">
          <label class="form-label">City</label>
          <input type="text" id="nl-city" class="form-input" placeholder="Bareilly, Lucknow..." />
        </div>
        <div class="form-group">
          <label class="form-label">Source</label>
          <select id="nl-source" class="form-input">
            ${SOURCES.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Course of Interest</label>
          <select id="nl-course" class="form-input">
            <option value="">-- Select Course --</option>
            ${courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Assign Counselor</label>
          <select id="nl-counselor" class="form-input">
            <option value="">-- Unassigned --</option>
            ${counselors.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select id="nl-priority" class="form-input">
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Notes</label>
          <textarea id="nl-notes" class="form-input" rows="2" placeholder="Any additional notes..."></textarea>
        </div>
      </div>
      <div id="nl-error" style="color:#dc2626;font-size:13px;margin-top:8px;display:none;"></div>
    `;

    openModal('Add New Lead', content, {
      submitLabel: 'Create Lead',
      width: '640px',
      onSubmit: async (body) => {
        const fname = body.querySelector('#nl-fname').value.trim();
        const phone = body.querySelector('#nl-phone').value.trim();
        const errEl = body.querySelector('#nl-error');

        if (!fname || !phone) {
          errEl.textContent = 'First name and phone are required.';
          errEl.style.display = 'block';
          return false; // prevent close
        }

        try {
          await createLead({
            first_name: fname,
            last_name: body.querySelector('#nl-lname').value.trim(),
            phone,
            email: body.querySelector('#nl-email').value.trim(),
            city: body.querySelector('#nl-city').value.trim(),
            source: body.querySelector('#nl-source').value,
            course_id: body.querySelector('#nl-course').value || null,
            counselor_id: body.querySelector('#nl-counselor').value || null,
            priority: body.querySelector('#nl-priority').value,
            notes: body.querySelector('#nl-notes').value.trim()
          });

          // Refresh current page
          const hash = window.location.hash.slice(1) || '/dashboard';
          window.dispatchEvent(new CustomEvent('rbmi:refresh', { detail: hash }));
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
          return false;
        }
      }
    });
  });

  // Render icons in header
  window.renderIcons();
}
