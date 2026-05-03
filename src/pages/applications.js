import { createApplication, fetchApplications, fetchCourses, updateApplication, exportApplicationsCSV } from '../lib/api.js';
import { openModal } from '../components/modal.js';

function userRole() {
  try { return JSON.parse(sessionStorage.getItem('rbmi_user') || '{}').role || 'admin'; } catch { return 'admin'; }
}

function badge(value) {
  const map = { submitted: 'info', review: 'warn', approved: 'ok', rejected: 'bad', pending: 'warn', verified: 'ok' };
  return `<span class="ops-badge ${map[value] || 'info'}">${String(value || 'pending').replace(/_/g, ' ')}</span>`;
}

export async function renderApplications(el) {
  const role = userRole();
  const [items, courses] = await Promise.all([fetchApplications(), fetchCourses()]);
  const total = items.length;
  const approved = items.filter(i => i.status === 'approved').length;
  const pendingDocs = items.filter(i => i.documents_status !== 'verified').length;

  el.innerHTML = `
    <div class="ops-shell">
      <div class="ops-header">
        <div><span class="eyebrow">Applications</span><h1>${role === 'student' ? 'My Applications' : 'Application Manager'}</h1><p>Track applications, documents, review status, and counselor ownership.</p></div>
        <div class="ops-actions">
          ${role !== 'student' ? '<button class="btn btn-secondary" id="export-apps-btn"><i data-lucide="download"></i> Export CSV</button>' : ''}
          ${role !== 'student' ? '<button class="btn btn-warn" id="filter-pending-docs"><i data-lucide="alert-circle"></i> Pending Docs (' + pendingDocs + ')</button>' : ''}
          <button class="btn btn-primary" id="new-application">${role === 'student' ? 'Start Application' : 'Add Application'}</button>
        </div>
      </div>
      <div class="ops-stats"><div><strong>${total}</strong><span>Total</span></div><div><strong>${approved}</strong><span>Approved</span></div><div><strong>${pendingDocs}</strong><span>Docs pending</span></div></div>
      <div class="ops-table-wrap">
        <table class="data-table"><thead><tr><th>Student</th><th>Program</th><th>Status</th><th>Documents</th><th>Counselor</th><th>Priority</th><th>Action</th></tr></thead><tbody>
          ${items.length ? items.map(item => `<tr><td><strong>${item.student_name}</strong><small>${item.email || ''}</small></td><td>${item.course_name}</td><td>${badge(item.status)}</td><td>${badge(item.documents_status)}</td><td>${item.counselor_name}</td><td>${item.priority}</td><td><button class="btn btn-secondary btn-sm app-action" data-id="${item.id}">${role === 'student' ? 'Upload Docs' : 'Review'}</button></td></tr>`).join('') : '<tr><td colspan="7" class="ops-empty">No applications yet</td></tr>'}
        </tbody></table>
      </div>
    </div>`;

  window.renderIcons();

  el.querySelector('#export-apps-btn')?.addEventListener('click', exportApplicationsCSV);

  el.querySelector('#filter-pending-docs')?.addEventListener('click', () => {
    const rows = el.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const docStatus = row.children[3].textContent.toLowerCase();
      row.style.display = docStatus.includes('verified') ? 'none' : '';
    });
  });

  el.querySelector('#new-application')?.addEventListener('click', () => {
    openModal('Start Application', `
      <div class="form-group"><label class="form-label">Program</label><select id="app-course" class="form-input">${courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
      ${role !== 'student' ? '<div class="form-group"><label class="form-label">Student name</label><input id="app-name" class="form-input" placeholder="Student name"></div><div class="form-group"><label class="form-label">Email</label><input id="app-email" class="form-input" placeholder="student@email.com"></div>' : ''}
    `, { submitLabel: 'Create', onSubmit: async (body) => {
      await createApplication({ course_id: body.querySelector('#app-course').value, student_name: body.querySelector('#app-name')?.value, email: body.querySelector('#app-email')?.value });
      window.dispatchEvent(new CustomEvent('rbmi:refresh'));
    }});
  });

  el.querySelectorAll('.app-action').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.id;
    if (role === 'student') await updateApplication(id, { documents_status: 'verified' });
    else {
      openModal('Review Application', `
        <p>Approve and verify documents for this application?</p>
      `, {
        submitLabel: 'Verify & Approve',
        onSubmit: async () => {
          await updateApplication(id, { status: 'approved', documents_status: 'verified' });
          window.dispatchEvent(new CustomEvent('rbmi:refresh'));
        }
      });
    }
  }));
}

