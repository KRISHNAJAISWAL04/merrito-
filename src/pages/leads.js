// ===== LEADS MANAGEMENT PAGE — API-connected =====
import { fetchLeads, createLead, updateLead, deleteLead, bulkDeleteLeads, fetchCounselors, fetchCourses, exportLeadsCSV } from '../lib/api.js';
import { getStageInfo, getPriorityInfo, formatDate, getAvatarColor, debounce } from '../components/utils.js';
import { openModal } from '../components/modal.js';

const STAGES = [
  { id: 'enquiry', label: 'Enquiry' }, { id: 'counseling_scheduled', label: 'Counseling Scheduled' },
  { id: 'counseling_done', label: 'Counseling Done' }, { id: 'application_submitted', label: 'Application Submitted' },
  { id: 'documents_verified', label: 'Documents Verified' }, { id: 'admitted', label: 'Admitted' }, { id: 'enrolled', label: 'Enrolled' }
];
const SOURCES = ['Website', 'Walk-in', 'Referral', 'Social Media', 'Education Fair', 'Google Ads', 'Phone Inquiry', 'JustDial', 'Shiksha', 'CollegeDekho'];

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('rbmi_user') || 'null'); } catch { return null; }
}

let counselorsCache = [];
let coursesCache = [];
let currentFilters = { stage: '', source: '', counselor_id: '', search: '' };
let currentSort = { field: 'created_at', order: 'desc' };
let currentPage = 1;

async function loadLeads(container) {
  const tableWrap = container.querySelector('#leads-table-wrap');
  if (!tableWrap) return;

  tableWrap.innerHTML = '<div class="table-loading"><div class="spinner"></div> Loading leads...</div>';

  try {
    const result = await fetchLeads({
      stage: currentFilters.stage,
      source: currentFilters.source,
      counselor_id: currentFilters.counselor_id,
      search: currentFilters.search,
      sort: currentSort.field,
      order: currentSort.order,
      page: currentPage,
      limit: 12
    });

    renderLeadsTable(tableWrap, result, container);
  } catch (err) {
    tableWrap.innerHTML = `<div class="table-loading error-state"><p>Failed to load leads: ${err.message}</p><p style="color:var(--color-text-muted);">Make sure API server is running: <code>npm run server</code></p></div>`;
  }
}

function updateBulkBar(tableWrap, container) {
  const checked = [...tableWrap.querySelectorAll('.lead-check:checked')];
  let bar = container.querySelector('#bulk-action-bar');
  if (checked.length === 0) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'bulk-action-bar';
    bar.style.cssText = 'position:sticky;top:0;z-index:10;background:#1e1b4b;color:white;padding:10px 16px;display:flex;align-items:center;gap:12px;border-radius:8px;margin-bottom:8px;';
    container.querySelector('#leads-table-wrap').before(bar);
  }
  bar.innerHTML = `
    <span style="font-weight:600;">${checked.length} selected</span>
    <button id="bulk-delete-btn" style="background:#ef4444;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Delete Selected</button>
    <button id="bulk-stage-btn" style="background:#6366f1;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Change Stage</button>
    <button id="bulk-counselor-btn" style="background:#10b981;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Change Counselor</button>
    <button id="bulk-cancel-btn" style="background:rgba(255,255,255,0.15);color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;">Cancel</button>
  `;
  bar.querySelector('#bulk-cancel-btn').addEventListener('click', () => {
    tableWrap.querySelectorAll('.lead-check').forEach(cb => cb.checked = false);
    tableWrap.querySelector('#select-all').checked = false;
    bar.remove();
  });
  bar.querySelector('#bulk-delete-btn').addEventListener('click', async () => {
    const ids = checked.map(cb => cb.dataset.id);
    if (!confirm(`Delete ${ids.length} leads? This cannot be undone.`)) return;
    try {
      await bulkDeleteLeads(ids);
      bar.remove();
      loadLeads(container);
    } catch (err) { alert('Failed: ' + err.message); }
  });
  bar.querySelector('#bulk-stage-btn').addEventListener('click', () => {
    const ids = checked.map(cb => cb.dataset.id);
    openModal('Change Stage for ' + ids.length + ' leads', `
      <div class="form-group">
        <label class="form-label">New Stage</label>
        <select class="form-select" id="bulk-stage-select">
          ${STAGES.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
        </select>
      </div>
    `, {
      submitLabel: 'Update All',
      onSubmit: async (body) => {
        const stage = body.querySelector('#bulk-stage-select').value;
        await Promise.all(ids.map(id => updateLead(id, { stage })));
        bar.remove();
        loadLeads(container);
      }
    });
  });
  bar.querySelector('#bulk-counselor-btn').addEventListener('click', async () => {
    const ids = checked.map(cb => cb.dataset.id);
    if (counselorsCache.length === 0) counselorsCache = await fetchCounselors();
    openModal('Assign Counselor to ' + ids.length + ' leads', `
      <div class="form-group">
        <label class="form-label">New Counselor</label>
        <select class="form-select" id="bulk-counselor-select">
          ${counselorsCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
    `, {
      submitLabel: 'Reassign All',
      onSubmit: async (body) => {
        const cid = body.querySelector('#bulk-counselor-select').value;
        await Promise.all(ids.map(id => updateLead(id, { counselor_id: cid })));
        bar.remove();
        loadLeads(container);
      }
    });
  });
}

function renderLeadsTable(tableWrap, result, container) {
  const { data: leads, total, page, totalPages } = result;

  tableWrap.innerHTML = `
    <table class="data-table leads-table" id="leads-data-table">
      <thead>
        <tr>
          <th class="th-check"><input type="checkbox" id="select-all" /></th>
          <th class="sortable" data-sort="last_name">Student <i data-lucide="arrow-up-down" style="width:12px;height:12px;"></i></th>
          <th>Course</th>
          <th>Source</th>
          <th class="sortable" data-sort="stage">Stage <i data-lucide="arrow-up-down" style="width:12px;height:12px;"></i></th>
          <th>Counselor</th>
          <th class="sortable" data-sort="lead_score">Score <i data-lucide="arrow-up-down" style="width:12px;height:12px;"></i></th>
          <th class="sortable" data-sort="created_at">Date <i data-lucide="arrow-up-down" style="width:12px;height:12px;"></i></th>
          <th>Priority</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${leads.length === 0 ? '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--color-text-muted);">No leads found</td></tr>' : ''}
        ${leads.map(l => {
          const stage = getStageInfo(l.stage);
          const priority = getPriorityInfo(l.priority);
          const initials = l.name.split(' ').map(n => n[0]).join('');
          const scoreColor = (l.lead_score || 0) > 60 ? 'var(--color-success)' : (l.lead_score || 0) > 40 ? 'var(--color-warning)' : 'var(--color-text-muted)';
          return `
          <tr class="lead-row" data-id="${l.id}">
            <td><input type="checkbox" class="lead-check" data-id="${l.id}" /></td>
            <td>
              <div class="table-user">
                <div class="avatar-sm" style="background:${getAvatarColor(l.name)}">${initials}</div>
                <div><div class="table-user-name">${l.name}</div><div class="table-user-sub">${l.email || l.phone}</div></div>
              </div>
            </td>
            <td><span class="course-tag">${l.course_name}</span></td>
            <td><span class="source-label">${l.source}</span></td>
            <td><span class="stage-badge" style="background:${stage.bg};color:${stage.color};">${stage.label}</span></td>
            <td><span class="counselor-name">${l.counselor_name}</span></td>
            <td><span class="score-cell" style="color:${scoreColor};font-weight:700;">${l.lead_score || 10}</span></td>
            <td><span class="date-cell">${formatDate(l.created_at)}</span></td>
            <td><span class="priority-dot" style="background:${priority.color};" title="${priority.label}"></span></td>
            <td>
              <div class="action-btns">
                <button class="action-btn btn-view-lead" title="View" data-action="view" data-id="${l.id}" style="padding:4px 8px;font-size:11px;font-weight:600;background:#f1f5f9;border-radius:4px;border:1px solid #e2e8f0;">View</button>
                <button class="action-btn btn-stage-lead" title="Change stage" data-action="stage" data-id="${l.id}" style="padding:4px 8px;font-size:11px;font-weight:600;background:#ede9fe;color:#7c3aed;border-radius:4px;border:1px solid #ddd6fe;">Stage</button>
                <button class="action-btn btn-del-lead" title="Delete" data-action="delete" data-id="${l.id}" style="padding:4px 8px;font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border-radius:4px;border:1px solid #fecaca;">Del</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div class="table-footer">
      <div class="table-info">Showing ${(page-1)*12+1}–${Math.min(page*12, total)} of ${total} leads</div>
      <div class="pagination">
        <button class="page-btn" id="prev-page" ${page===1?'disabled':''}>�</button>
        ${Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
          let p;
          if (totalPages <= 7) p = i+1;
          else if (page <= 4) p = i+1;
          else if (page >= totalPages-3) p = totalPages-6+i;
          else p = page-3+i;
          return `<button class="page-btn ${p===page?'active':''}" data-page="${p}">${p}</button>`;
        }).join('')}
        <button class="page-btn" id="next-page" ${page===totalPages?'disabled':''}>�</button>
      </div>
    </div>
  `;

  window.renderIcons();

  // Bulk select
  tableWrap.querySelector('#select-all')?.addEventListener('change', (e) => {
    tableWrap.querySelectorAll('.lead-check').forEach(cb => cb.checked = e.target.checked);
    updateBulkBar(tableWrap, container);
  });
  tableWrap.querySelectorAll('.lead-check').forEach(cb => {
    cb.addEventListener('change', () => updateBulkBar(tableWrap, container));
  });

  // Sort
  tableWrap.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const f = th.dataset.sort;
      if (currentSort.field === f) currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      else { currentSort.field = f; currentSort.order = 'asc'; }
      currentPage = 1;
      loadLeads(container);
    });
  });

  // Pagination
  tableWrap.querySelector('#prev-page')?.addEventListener('click', () => { if (page > 1) { currentPage--; loadLeads(container); } });
  tableWrap.querySelector('#next-page')?.addEventListener('click', () => { if (page < totalPages) { currentPage++; loadLeads(container); } });
  tableWrap.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); loadLeads(container); });
  });

  // View details
  tableWrap.querySelectorAll('[data-action="view"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lead = leads.find(l => l.id === btn.dataset.id);
      if (lead) showLeadDetails(lead);
    });
  });

  // Stage change
  tableWrap.querySelectorAll('[data-action="stage"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lead = leads.find(l => l.id === btn.dataset.id);
      if (lead) showStageChangeModal(lead, container);
    });
  });

  // Delete
  tableWrap.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lead = leads.find(l => l.id === btn.dataset.id);
      if (!lead) return;
      if (!confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
      try {
        await deleteLead(lead.id);
        loadLeads(container);
      } catch (err) {
        alert('Failed to delete: ' + err.message);
      }
    });
  });
}
function showLeadDetails(lead) {
  const stage = getStageInfo(lead.stage);
  const stageOrder = ['enquiry','counseling_scheduled','counseling_done','application_submitted','documents_verified','admitted','enrolled'];
  const stageIdx = stageOrder.indexOf(lead.stage);
  
  const timelineHtml = stageOrder.map((s, i) => {
    const info = getStageInfo(s);
    const done = i <= stageIdx;
    return `
      <div class="profile-timeline-item ${done ? 'done' : ''}">
        <div class="timeline-dot" style="background:${done ? info.color : '#e2e8f0'}"></div>
        <div class="timeline-content">
          <div class="timeline-label">${info.label}</div>
          <div class="timeline-time">${done ? 'Completed' : 'Pending'}</div>
        </div>
      </div>
    `;
  }).join('');

  const commsHtml = [
    { type: 'call', date: '2026-05-01 10:30', msg: 'Callback done. Interested in MBA Finance.' },
    { type: 'whatsapp', date: '2026-05-02 14:15', msg: 'Shared course brochure and fee structure.' },
    { type: 'email', date: '2026-05-03 09:00', msg: 'Sent application link and instructions.' }
  ].map(c => `
    <div class="comm-log-item">
      <div class="comm-icon ${c.type}"><i data-lucide="${c.type === 'call' ? 'phone' : c.type === 'whatsapp' ? 'message-square' : 'mail'}"></i></div>
      <div class="comm-body">
        <div class="comm-msg">${c.msg}</div>
        <div class="comm-meta">${c.date}</div>
      </div>
    </div>
  `).join('');

  const docsHtml = [
    { name: 'Class 10 Marksheet', status: 'verified' },
    { name: 'Class 12 Marksheet', status: 'pending' },
    { name: 'ID Proof (Aadhar)', status: 'verified' }
  ].map(d => `
    <div class="doc-row-mini">
      <span>${d.name}</span>
      <span class="doc-status ${d.status}">${d.status}</span>
    </div>
  `).join('');

  openModal(`Student 360 — ${lead.name}`, `
    <div class="s360-container">
      <div class="s360-sidebar">
        <div class="s360-user-card">
          <div class="avatar-lg" style="background:${getAvatarColor(lead.name)}">${lead.name.split(' ').map(n => n[0]).join('')}</div>
          <h3>${lead.name}</h3>
          <div class="stage-badge" style="background:${stage.bg};color:${stage.color}">${stage.label}</div>
          <div class="score-meter" style="--score:${lead.lead_score || 15}%">
            <span>Intent Score</span>
            <strong>${lead.lead_score || 15}</strong>
          </div>
        </div>
        <div class="s360-info-list">
          <div class="info-item"><label>Phone</label><span>${lead.phone}</span></div>
          <div class="info-item"><label>Email</label><span>${lead.email || '—'}</span></div>
          <div class="info-item"><label>Source</label><span>${lead.source}</span></div>
          <div class="info-item"><label>Course</label><span>${lead.course_name}</span></div>
          <div class="info-item"><label>Counselor</label><span>${lead.counselor_name}</span></div>
        </div>
        <div class="s360-actions">
          <button class="btn btn-primary btn-full">📞 Start Call</button>
          <button class="btn btn-secondary btn-full">💬 WhatsApp</button>
        </div>
      </div>
      <div class="s360-main">
        <div class="s360-tabs">
          <button class="tab-btn active" data-tab="timeline">Journey</button>
          <button class="tab-btn" data-tab="comm">Communication</button>
          <button class="tab-btn" data-tab="docs">Documents</button>
        </div>
        <div class="tab-pane active" id="pane-timeline">
          <div class="profile-timeline">${timelineHtml}</div>
        </div>
        <div class="tab-pane" id="pane-comm">
          <div class="comm-logs">${commsHtml}</div>
        </div>
        <div class="tab-pane" id="pane-docs">
          <div class="docs-list-mini">${docsHtml}</div>
        </div>
      </div>
    </div>
  `, { 
    width: '900px', 
    showFooter: false,
    onOpen: (body) => {
      window.renderIcons();
      body.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
          body.querySelectorAll('.tab-btn, .tab-pane').forEach(el => el.classList.remove('active'));
          btn.classList.add('active');
          body.querySelector('#pane-' + btn.dataset.tab).classList.add('active');
        };
      });
    }
  });
}

function showStageChangeModal(lead, container) {
  const currentStage = getStageInfo(lead.stage);
  openModal(`Change Stage — ${lead.name}`, `
    <div class="form-group">
      <label class="form-label">Current Stage</label>
      <div class="stage-badge" style="background:${currentStage.bg};color:${currentStage.color};display:inline-flex">${currentStage.label}</div>
    </div>
    <div class="form-group" style="margin-top:1rem;">
      <label class="form-label">New Stage</label>
      <select class="form-select" id="new-stage-select">
        ${STAGES.map(s => `<option value="${s.id}" ${s.id===lead.stage?'selected':''}>${s.label}</option>`).join('')}
      </select>
    </div>
  `, {
    submitLabel: 'Update Stage',
    onSubmit: async (body) => {
      const newStage = body.querySelector('#new-stage-select').value;
      await updateLead(lead.id, { stage: newStage });
      loadLeads(container);
    }
  });
}

async function showAddLeadModal(container) {
  // Load counselors and courses
  if (counselorsCache.length === 0) counselorsCache = await fetchCounselors();
  if (coursesCache.length === 0) coursesCache = await fetchCourses();

  openModal('Add New Lead', `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">First Name *</label>
        <input type="text" class="form-input" id="lead-fname" placeholder="Enter first name" />
      </div>
      <div class="form-group">
        <label class="form-label">Last Name *</label>
        <input type="text" class="form-input" id="lead-lname" placeholder="Enter last name" />
      </div>
      <div class="form-group">
        <label class="form-label">Email *</label>
        <input type="email" class="form-input" id="lead-email" placeholder="email@example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input type="text" class="form-input" id="lead-phone" placeholder="+91 XXXXX XXXXX" />
      </div>
      <div class="form-group">
        <label class="form-label">Course Interest</label>
        <select class="form-select" id="lead-course">
          ${coursesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Source</label>
        <select class="form-select" id="lead-source">
          ${SOURCES.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Assign Counselor</label>
        <select class="form-select" id="lead-counselor">
          ${counselorsCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="lead-priority">
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div class="form-group form-full">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="lead-notes" rows="3" placeholder="Add any notes..."></textarea>
      </div>
    </div>
  `, {
    width: '680px',
    submitLabel: 'Add Lead',
    onSubmit: async (body) => {
      const fname = body.querySelector('#lead-fname').value;
      const lname = body.querySelector('#lead-lname').value;
      if (!fname || !lname) return;

      // Duplicate check by phone
      const phone = body.querySelector('#lead-phone').value.trim();
      if (phone) {
        try {
          const existing = await fetchLeads({ search: phone, limit: 1 });
          if (existing.total > 0) {
            const dup = existing.data[0];
            if (!confirm(`⚠ A lead with this phone already exists: "${dup.name}" (${dup.stage}). Add anyway?`)) return false;
          }
        } catch (e) { /* ignore duplicate check errors */ }
      }

      await createLead({
        first_name: fname,
        last_name: lname,
        email: body.querySelector('#lead-email').value,
        phone,
        course_id: body.querySelector('#lead-course').value,
        source: body.querySelector('#lead-source').value,
        counselor_id: body.querySelector('#lead-counselor').value,
        priority: body.querySelector('#lead-priority').value,
        notes: body.querySelector('#lead-notes').value
      });

      currentPage = 1;
      loadLeads(container);
    }
  });
}

export async function renderLeads(container) {
  currentFilters = { stage: '', source: '', counselor_id: '', search: '' };
  currentSort = { field: 'created_at', order: 'desc' };
  currentPage = 1;

  // Load counselors for filter dropdown
  if (counselorsCache.length === 0) {
    try { counselorsCache = await fetchCounselors(); } catch(e) { counselorsCache = []; }
  }

  container.innerHTML = `
    <div class="leads-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Leads</h1>
          <p class="page-subtitle">Manage and track student enquiries.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" id="export-leads-btn" style="display:flex;align-items:center;gap:6px;">
            ⬇ Export CSV
          </button>
          <button class="btn btn-primary" id="add-lead-btn" style="display:flex;align-items:center;gap:6px;">
            + Add New Lead
          </button>
        </div>
      </div>

      <div class="filters-bar animate-fade-in">
        <div class="filter-group">
          <div class="search-filter">
            <input type="text" placeholder="Search by name, email, phone..." class="filter-search" id="filter-search" style="padding-left:12px;" />
          </div>
        </div>
        <div class="filter-group">
          <select class="filter-select" id="filter-stage">
            <option value="">All Stages</option>
            ${STAGES.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
          </select>
          <select class="filter-select" id="filter-source">
            <option value="">All Sources</option>
            ${SOURCES.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <select class="filter-select" id="filter-counselor">
            <option value="">All Counselors</option>
            ${counselorsCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="table-card animate-fade-in" id="leads-table-wrap"></div>
    </div>
  `;

  window.renderIcons();

  loadLeads(container);

  // Filters
  container.querySelector('#filter-search')?.addEventListener('input', debounce((e) => {
    currentFilters.search = e.target.value;
    currentPage = 1;
    loadLeads(container);
  }, 300));

  container.querySelector('#filter-stage')?.addEventListener('change', (e) => {
    currentFilters.stage = e.target.value;
    currentPage = 1;
    loadLeads(container);
  });

  container.querySelector('#filter-source')?.addEventListener('change', (e) => {
    currentFilters.source = e.target.value;
    currentPage = 1;
    loadLeads(container);
  });

  container.querySelector('#filter-counselor')?.addEventListener('change', (e) => {
    currentFilters.counselor_id = e.target.value;
    currentPage = 1;
    loadLeads(container);
  });

  container.querySelector('#add-lead-btn')?.addEventListener('click', () => showAddLeadModal(container));
  container.querySelector('#export-leads-btn')?.addEventListener('click', () => exportLeadsCSV());
}
