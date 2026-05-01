// ===== COUNSELORS PAGE — Full CRUD =====
import { fetchCounselors, createCounselor, updateCounselor, deleteCounselor } from '../lib/api.js';
import { getAvatarColor } from '../components/utils.js';
import { openModal } from '../components/modal.js';

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('rbmi_user') || 'null'); } catch { return null; }
}

export async function renderCounselors(container) {
  container.innerHTML = `<div class="counselors-page"><div class="page-header"><div><h1 class="page-title">Counselors</h1><p class="page-subtitle">Loading...</p></div></div></div>`;

  try {
    await loadCounselors(container);
  } catch (err) {
    container.innerHTML = `<div class="counselors-page"><div class="error-state"><p>Failed to load: ${err.message}</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div></div>`;
  }
}

async function loadCounselors(container) {
  const counselors = await fetchCounselors();
  const user = getCurrentUser();
  const isAdmin = !user || user.role === 'admin';

  const totalCounselors = counselors.length;
  const avgConversion = counselors.length > 0
    ? (counselors.reduce((a, c) => a + (c.leads_assigned > 0 ? (c.conversions / c.leads_assigned) : 0), 0) / totalCounselors * 100).toFixed(1)
    : '0';
  const totalConversions = counselors.reduce((a, c) => a + c.conversions, 0);
  const avgRating = counselors.length > 0
    ? (counselors.reduce((a, c) => a + c.rating, 0) / totalCounselors).toFixed(1)
    : '0';

  container.innerHTML = `
    <div class="counselors-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Counselors</h1>
          <p class="page-subtitle">Manage your counseling team and track performance.</p>
        </div>
        ${isAdmin ? `
        <div class="header-actions">
          <button class="btn btn-primary" id="btn-add-counselor">
            <i data-lucide="user-plus"></i> Add Counselor
          </button>
        </div>` : ''}
      </div>

      <div class="grid-4 counselor-summary animate-fade-in">
        <div class="summary-card">
          <div class="summary-icon" style="background:var(--color-primary-light);color:var(--color-primary);"><i data-lucide="users"></i></div>
          <div class="summary-data"><span class="summary-value">${totalCounselors}</span><span class="summary-label">Total Counselors</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-icon" style="background:var(--color-success-light);color:var(--color-success);"><i data-lucide="trending-up"></i></div>
          <div class="summary-data"><span class="summary-value">${avgConversion}%</span><span class="summary-label">Avg. Conversion</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-icon" style="background:var(--color-info-light);color:var(--color-info);"><i data-lucide="user-check"></i></div>
          <div class="summary-data"><span class="summary-value">${totalConversions}</span><span class="summary-label">Total Conversions</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-icon" style="background:var(--color-warning-light);color:var(--color-warning);"><i data-lucide="star"></i></div>
          <div class="summary-data"><span class="summary-value">${avgRating}</span><span class="summary-label">Avg. Rating</span></div>
        </div>
      </div>

      <div class="counselor-grid animate-fade-in" id="counselor-grid">
        ${counselors.map((c, i) => renderCounselorCard(c, i, isAdmin)).join('')}
      </div>

      <div class="chart-card animate-fade-in" style="margin-top:var(--spacing-xl);">
        <div class="chart-header"><h3 class="chart-title">Performance Comparison</h3><span class="chart-subtitle">Leads assigned vs converted</span></div>
        <div class="chart-body" style="height:300px;"><canvas id="chart-counselor-perf"></canvas></div>
      </div>
    </div>
  `;

  window.renderIcons();

  // Add counselor
  document.getElementById('btn-add-counselor')?.addEventListener('click', () => {
    openCounselorModal(null, async (data) => {
      await createCounselor(data);
      await loadCounselors(container);
    });
  });

  // Edit/Delete buttons
  container.querySelectorAll('.btn-edit-counselor').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const c = counselors.find(x => x.id === id);
      if (!c) return;
      openCounselorModal(c, async (data) => {
        await updateCounselor(id, data);
        await loadCounselors(container);
      });
    });
  });

  container.querySelectorAll('.btn-delete-counselor').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const c = counselors.find(x => x.id === id);
      if (!c) return;
      if (!confirm(`Delete counselor "${c.name}"? This cannot be undone.`)) return;
      await deleteCounselor(id);
      await loadCounselors(container);
    });
  });

  // Chart
  setTimeout(() => {
    const ctx = document.getElementById('chart-counselor-perf');
    if (!ctx || typeof Chart === 'undefined') return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: counselors.map(c => c.name.split(' ')[0]),
        datasets: [
          { label: 'Leads Assigned', data: counselors.map(c => c.leads_assigned), backgroundColor: '#6366f1', borderRadius: 6, borderSkipped: false },
          { label: 'Conversions', data: counselors.map(c => c.conversions), backgroundColor: '#10b981', borderRadius: 6, borderSkipped: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { family: 'Inter', size: 12 } } } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' } } }
      }
    });
  }, 100);
}

function renderCounselorCard(c, i, isAdmin) {
  const convRate = c.leads_assigned > 0 ? ((c.conversions / c.leads_assigned) * 100).toFixed(1) : '0.0';
  const initials = c.name.split(' ').map(n => n[0]).join('');
  return `
    <div class="counselor-card stagger-${Math.min(i + 1, 6)}">
      <div class="counselor-card-top">
        <div class="counselor-avatar" style="background:${getAvatarColor(c.name)}">${initials}</div>
        <h3 class="counselor-name">${c.name}</h3>
        <p class="counselor-role">${c.role}</p>
        <span class="counselor-dept">${c.department}</span>
      </div>
      <div class="counselor-card-stats">
        <div class="counselor-stat"><span class="stat-num">${c.leads_assigned}</span><span class="stat-lbl">Leads</span></div>
        <div class="counselor-stat-divider"></div>
        <div class="counselor-stat"><span class="stat-num">${c.conversions}</span><span class="stat-lbl">Converted</span></div>
        <div class="counselor-stat-divider"></div>
        <div class="counselor-stat"><span class="stat-num">${convRate}%</span><span class="stat-lbl">Rate</span></div>
      </div>
      <div class="counselor-card-footer">
        <div class="counselor-rating">
          ${[1,2,3,4,5].map(s => `<i data-lucide="star" style="width:14px;height:14px;${s <= Math.round(c.rating) ? 'fill:#f59e0b;color:#f59e0b;' : 'color:#e2e8f0;'}"></i>`).join('')}
          <span>${c.rating}</span>
        </div>
        <div class="counselor-contact">
          <a href="mailto:${c.email}" class="contact-btn" title="Email">??</a>
          <a href="mailto:${c.email}" class="contact-btn" title="Email" style="font-size:13px;text-decoration:none;">Mail</a>
          <a href="tel:${c.phone}" class="contact-btn" title="Call" style="font-size:13px;text-decoration:none;">Call</a>
          ${isAdmin ? `
          <button class="contact-btn btn-edit-counselor" data-id="${c.id}" title="Edit" style="font-size:11px;font-weight:600;background:#ede9fe;color:#7c3aed;border:1px solid #ddd6fe;">Edit</button>
          <button class="contact-btn btn-delete-counselor" data-id="${c.id}" title="Delete" style="font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">Del</button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function openCounselorModal(counselor, onSave) {
  const isEdit = !!counselor;
  const DEPARTMENTS = ['Engineering', 'Management', 'Sciences', 'Arts & Humanities', 'Commerce', 'Pharmacy', 'Law', 'General'];
  const ROLES = ['Junior Counselor', 'Counselor', 'Senior Counselor', 'Lead Counselor', 'Manager'];

  const content = `
    <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="form-group" style="grid-column:1/-1;">
        <label class="form-label">Full Name *</label>
        <input type="text" id="c-name" class="form-input" value="${counselor?.name || ''}" placeholder="e.g. Priya Sharma" required />
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="c-email" class="form-input" value="${counselor?.email || ''}" placeholder="priya@rbmi.edu.in" />
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input type="tel" id="c-phone" class="form-input" value="${counselor?.phone || ''}" placeholder="+91 XXXXX XXXXX" />
      </div>
      <div class="form-group">
        <label class="form-label">Role</label>
        <select id="c-role" class="form-input">
          ${ROLES.map(r => `<option value="${r}" ${counselor?.role === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Department</label>
        <select id="c-dept" class="form-input">
          ${DEPARTMENTS.map(d => `<option value="${d}" ${counselor?.department === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Rating (1-5)</label>
        <input type="number" id="c-rating" class="form-input" value="${counselor?.rating || 4.0}" min="1" max="5" step="0.1" />
      </div>
    </div>
    <div id="c-error" style="color:#dc2626;font-size:13px;margin-top:8px;display:none;"></div>
  `;

  openModal(isEdit ? 'Edit Counselor' : 'Add Counselor', content, {
    submitLabel: isEdit ? 'Save Changes' : 'Add Counselor',
    width: '560px',
    onSubmit: async (body) => {
      const name = body.querySelector('#c-name').value.trim();
      const errEl = body.querySelector('#c-error');
      if (!name) {
        errEl.textContent = 'Name is required.';
        errEl.style.display = 'block';
        return false;
      }
      await onSave({
        name,
        email: body.querySelector('#c-email').value.trim(),
        phone: body.querySelector('#c-phone').value.trim(),
        role: body.querySelector('#c-role').value,
        department: body.querySelector('#c-dept').value,
        rating: parseFloat(body.querySelector('#c-rating').value) || 4.0
      });
    }
  });
}
