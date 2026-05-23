import { createApplication, fetchApplications, fetchCourses, updateApplication, exportApplicationsCSV, uploadFile } from '../lib/api.js';
import { openModal } from '../components/modal.js';

function userRole() {
  try { return JSON.parse(sessionStorage.getItem('rbmi_user') || '{}').role || 'admin'; } catch { return 'admin'; }
}

function badge(value) {
  const map = { submitted: 'info', review: 'warn', approved: 'ok', rejected: 'bad', pending: 'warn', verified: 'ok', missing: 'warn' };
  return `<span class="ops-badge ${map[value] || 'info'}">${String(value || 'pending').replace(/_/g, ' ')}</span>`;
}

function normalizeDocs(item) {
  const fallback = ['Class 10 marksheet', 'Class 12 marksheet', 'ID proof', 'Entrance scorecard', 'Passport photo'];
  const byName = new Map((item.documents || []).map(doc => [doc.name, doc]));
  return fallback.map(name => ({ id: name, name, status: 'missing', file_name: '', file_url: '', remarks: '', uploaded_at: null, reviewed_at: null, ...(byName.get(name) || {}) }));
}

function docsSummary(docs) {
  const verified = docs.filter(doc => doc.status === 'verified').length;
  const submitted = docs.filter(doc => doc.status === 'submitted').length;
  return `${verified}/${docs.length} verified${submitted ? `, ${submitted} waiting` : ''}`;
}

async function saveDocuments(application, documents, updates = {}) {
  await updateApplication(application.id, { ...updates, documents });
  window.dispatchEvent(new CustomEvent('rbmi:refresh'));
}

export async function renderApplications(el) {
  const role = userRole();
  let items = [];
  let courses = [];
  try {
    [items, courses] = await Promise.all([fetchApplications(), fetchCourses()]);
  } catch (_) {
    items = await fetchApplications();
    try {
      courses = await fetchCourses();
    } catch {
      courses = [];
    }
  }
  const courseMap = Object.fromEntries(courses.map(course => [course.id, course.name]));
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
          ${items.length ? items.map(item => {
            const docs = normalizeDocs(item);
            return `<tr><td><strong>${item.student_name}</strong><small>${item.email || ''}</small></td><td>${item.course_name || courseMap[item.course_id] || 'Program not selected'}</td><td>${badge(item.status)}</td><td>${badge(item.documents_status)}<small>${docsSummary(docs)}</small></td><td>${item.counselor_name}</td><td>${item.priority}</td><td><button class="btn btn-secondary btn-sm app-action" data-id="${item.id}">${role === 'student' ? 'Upload Docs' : 'Review'}</button></td></tr>`;
          }).join('') : '<tr><td colspan="7" class="ops-empty">No applications yet</td></tr>'}
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
    const application = items.find(item => item.id === id);
    const docs = normalizeDocs(application);

    if (role === 'student') {
      openModal('Upload Documents', `
        <div class="doc-list">
          ${docs.map(doc => `
            <div class="doc-row">
              <div>
                <strong>${doc.name}</strong>
                <small>
                  ${doc.file_url ? `<a href="${doc.file_url}" target="_blank" style="color:var(--color-primary);text-decoration:underline;">${doc.file_name || 'Download'}</a>` : (doc.file_name || 'No file uploaded')}
                  ${doc.remarks ? ' - ' + doc.remarks : ''}
                </small>
              </div>
              ${badge(doc.status)}
            </div>
          `).join('')}
        </div>
        <div class="form-group" style="margin-top:16px;">
          <label class="form-label">Document</label>
          <select class="form-input" id="app-doc-name">
            ${docs.filter(doc => doc.status !== 'verified').map(doc => `<option value="${doc.name}">${doc.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">File</label>
          <input class="form-input" type="file" id="app-doc-file" accept=".pdf,.jpg,.jpeg,.png" />
        </div>
      `, {
        submitLabel: 'Submit Document',
        onSubmit: async (body) => {
          const fileInput = body.querySelector('#app-doc-file');
          const file = fileInput?.files?.[0];
          const name = body.querySelector('#app-doc-name').value;
          if (!file) {
            alert('Please choose a file.');
            return false;
          }
          
          // Upload the file to the server
          const submitBtn = body.parentElement.querySelector('#modal-submit-btn');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Uploading...';
          }
          
          try {
            const uploadResult = await uploadFile(file, { document_name: name, application_id: application.id });
            const nextDocs = docs.map(doc => doc.name === name ? {
              ...doc,
              status: 'submitted',
              file_name: file.name,
              file_url: uploadResult.url,
              remarks: '',
              uploaded_at: new Date().toISOString(),
              reviewed_at: null
            } : doc);
            await saveDocuments(application, nextDocs);
          } catch (err) {
            alert('Upload failed: ' + err.message);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Submit Document';
            }
            return false;
          }
        }
      });
      return;
    }

    openModal('Review Documents', `
      <div class="doc-list">
        ${docs.map(doc => `
          <div class="doc-row">
            <div>
              <strong>${doc.name}</strong>
              <small>
                ${doc.file_url ? `<a href="${doc.file_url}" target="_blank" style="color:var(--color-primary);text-decoration:underline;">${doc.file_name || 'Download'}</a>` : (doc.file_name || 'No file uploaded')}
                ${doc.remarks ? ' - ' + doc.remarks : ''}
              </small>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              ${badge(doc.status)}
              ${doc.status === 'submitted' ? `<button class="btn btn-secondary btn-sm doc-reject" data-doc="${doc.name}" type="button">Reject</button><button class="btn btn-primary btn-sm doc-verify" data-doc="${doc.name}" type="button">Verify</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="form-group" style="margin-top:16px;">
        <label class="form-label">Application status</label>
        <select id="app-review-status" class="form-input">
          <option value="submitted" ${application.status === 'submitted' ? 'selected' : ''}>Submitted</option>
          <option value="review" ${application.status === 'review' ? 'selected' : ''}>Review</option>
          <option value="approved" ${application.status === 'approved' ? 'selected' : ''}>Approved</option>
          <option value="rejected" ${application.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </div>
      `, {
        submitLabel: 'Save Review',
        width: '720px',
        onOpen: (body) => {
          body.querySelectorAll('.doc-verify').forEach(btn => {
            btn.onclick = async () => {
              const nextDocs = docs.map(doc => doc.name === btn.dataset.doc ? { ...doc, status: 'verified', remarks: '', reviewed_at: new Date().toISOString() } : doc);
              await saveDocuments(application, nextDocs, { status: body.querySelector('#app-review-status').value });
            };
          });
          body.querySelectorAll('.doc-reject').forEach(btn => {
            btn.onclick = async () => {
              const remark = prompt('Reason for rejection?', 'Please upload a clearer document.') || 'Rejected during review.';
              const nextDocs = docs.map(doc => doc.name === btn.dataset.doc ? { ...doc, status: 'rejected', remarks: remark, reviewed_at: new Date().toISOString() } : doc);
              await saveDocuments(application, nextDocs, { status: 'review' });
            };
          });
        },
        onSubmit: async (body) => {
          await saveDocuments(application, docs, { status: body.querySelector('#app-review-status').value });
        }
      });
  }));
}

