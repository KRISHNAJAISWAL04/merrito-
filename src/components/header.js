// ===== HEADER COMPONENT - RBMI Admission Hub =====
import { openModal } from './modal.js';
import { createLead, fetchCounselors, fetchCourses } from '../lib/api.js';

function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'student') return 'Student';
  return 'Counselor';
}

export function renderHeader(user = null) {
  const header = document.getElementById('top-header');
  if (!header) return;

  const role = user?.role || 'admin';
  const canCreateLead = role !== 'student';

  header.innerHTML = `
    <div class="header-left">
      <button class="header-menu-toggle" id="menu-toggle" title="Toggle sidebar">?</button>
      <div class="header-breadcrumb" id="header-breadcrumb">
        <span>RBMI Hub</span>
        <span style="opacity:0.4;margin:0 4px;">/</span>
        <span id="breadcrumb-page">${role === 'student' ? 'My Application' : 'Dashboard'}</span>
      </div>
    </div>
    <div class="header-right">
      <button class="header-btn" id="btn-notifications" title="Notifications">Bell</button>
      <div class="header-divider"></div>
      ${canCreateLead ? `
      <button class="btn btn-primary header-add-btn" id="btn-add-lead">
        <span style="font-size:16px;margin-right:4px;">+</span> ${role === 'admin' ? 'Add Lead' : 'New Lead'}
      </button>
      ` : `
      <button class="btn btn-primary header-add-btn" id="btn-portal-action">
        Request callback
      </button>
      `}
      <div class="header-user-chip">
        <div class="header-avatar">${user ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'AD'}</div>
        <span class="header-username">${user ? user.name.split(' ')[0] : 'Admin'}</span>
        <span class="header-role-badge ${role}">${roleLabel(role)}</span>
      </div>
    </div>
  `;

  const breadcrumbMap = {
    '/dashboard': 'Command Center', '/leads': 'Leads Manager', '/pipeline': 'Admission Pipeline',
    '/counselors': 'Counselors', '/courses': 'Programs', '/reports': 'Reports', '/settings': 'Settings',
    '/formdesk': 'FormDesk', '/calendar': 'Calendar', '/applications': 'Applications', '/marketing': 'Marketing',
    '/campaigns': 'Campaigns', '/queries': 'Help Desk', '/payments': 'Fee Desk', '/templates': 'Templates',
    '/portal': 'My Application', '/download': 'Mobile App'
  };

  function updateBreadcrumb() {
    const hash = window.location.hash.slice(1) || (role === 'student' ? '/portal' : '/dashboard');
    const el = document.getElementById('breadcrumb-page');
    if (el) el.textContent = breadcrumbMap[hash] || hash.slice(1);
  }

  updateBreadcrumb();
  window.addEventListener('hashchange', updateBreadcrumb);

  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    document.getElementById('main-wrapper')?.classList.toggle('sidebar-collapsed');
  });

  document.getElementById('btn-notifications')?.addEventListener('click', () => {
    const studentContent = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="notif-item-row"><span class="notif-dot new"></span><div><strong>Document review pending</strong><br/><small style="color:#64748b;">Upload your Class 12 marksheet</small></div></div>
        <div class="notif-item-row"><span class="notif-dot"></span><div><strong>Callback slot reserved</strong><br/><small style="color:#64748b;">Admissions team will contact you today</small></div></div>
        <div class="notif-item-row"><span class="notif-dot"></span><div><strong>Fee slip available</strong><br/><small style="color:#64748b;">Open Fee Desk for payment details</small></div></div>
      </div>
    `;
    const crmContent = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="notif-item-row"><span class="notif-dot new"></span><div><strong>New lead captured</strong><br/><small style="color:#64748b;">Just now via website form</small></div></div>
        <div class="notif-item-row"><span class="notif-dot"></span><div><strong>Stage update</strong><br/><small style="color:#64748b;">Applicant moved to Admitted</small></div></div>
        <div class="notif-item-row"><span class="notif-dot"></span><div><strong>Counseling scheduled</strong><br/><small style="color:#64748b;">3 sessions today</small></div></div>
      </div>
    `;
    openModal('Notifications', role === 'student' ? studentContent : crmContent, { submitLabel: 'Mark All Read', width: '420px' });
  });

  document.getElementById('btn-portal-action')?.addEventListener('click', () => {
    window.location.hash = '/portal';
    window.dispatchEvent(new CustomEvent('rbmi:refresh'));
  });

  document.getElementById('btn-add-lead')?.addEventListener('click', async () => {
    let counselors = [], courses = [];
    try {
      [counselors, courses] = await Promise.all([fetchCounselors(), fetchCourses()]);
    } catch (e) { /* keep modal usable even if lookups fail */ }

    const sources = ['Website', 'Walk-in', 'Referral', 'Social Media', 'Education Fair', 'Google Ads', 'Phone Inquiry', 'JustDial', 'Shiksha', 'CollegeDekho'];
    const content = `
      <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group"><label class="form-label">First Name *</label><input type="text" id="nl-fname" class="form-input" placeholder="First name" required /></div>
        <div class="form-group"><label class="form-label">Last Name</label><input type="text" id="nl-lname" class="form-input" placeholder="Last name" /></div>
        <div class="form-group"><label class="form-label">Phone *</label><input type="tel" id="nl-phone" class="form-input" placeholder="+91 XXXXX XXXXX" required /></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" id="nl-email" class="form-input" placeholder="email@example.com" /></div>
        <div class="form-group"><label class="form-label">City</label><input type="text" id="nl-city" class="form-input" placeholder="Bareilly, Lucknow..." /></div>
        <div class="form-group"><label class="form-label">Source</label><select id="nl-source" class="form-input">${sources.map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Course of Interest</label><select id="nl-course" class="form-input"><option value="">-- Select Course --</option>${courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Assign Counselor</label><select id="nl-counselor" class="form-input"><option value="">-- Unassigned --</option>${counselors.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Priority</label><select id="nl-priority" class="form-input"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Notes</label><textarea id="nl-notes" class="form-input" rows="2" placeholder="Any additional notes..."></textarea></div>
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
          return false;
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
          window.dispatchEvent(new CustomEvent('rbmi:refresh'));
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
          return false;
        }
      }
    });
  });
}

