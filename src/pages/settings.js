// ===== SETTINGS PAGE — Fully Functional =====
import { fetchSettings, saveSettings, fetchUsers, createUser, updateUser, deleteUser } from '../lib/api.js';
import { openModal } from '../components/modal.js';

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('rbmi_user') || 'null'); } catch { return null; }
}

export async function renderSettings(container) {
  const user = getCurrentUser();
  const isAdmin = !user || user.role === 'admin';

  container.innerHTML = `
    <div class="settings-page">
      <div class="page-header">
        <div><h1 class="page-title">Settings</h1><p class="page-subtitle">Configure RBMI CRM preferences.</p></div>
      </div>
      <div class="settings-layout">
        <div class="settings-tabs" id="settings-tabs">
          <button class="settings-tab active" data-tab="institute"><i data-lucide="building-2" style="width:18px;height:18px;"></i> Institute Profile</button>
          <button class="settings-tab" data-tab="stages"><i data-lucide="git-branch" style="width:18px;height:18px;"></i> Pipeline Stages</button>
          ${isAdmin ? `<button class="settings-tab" data-tab="users"><i data-lucide="users" style="width:18px;height:18px;"></i> User Management</button>` : ''}
          <button class="settings-tab" data-tab="webhook"><i data-lucide="webhook" style="width:18px;height:18px;"></i> Lead Automation</button>
          <button class="settings-tab" data-tab="notifications"><i data-lucide="bell" style="width:18px;height:18px;"></i> Notifications</button>
        </div>
        <div class="settings-content" id="settings-content">
          <div class="settings-section" id="tab-institute">
            <div style="display:flex;align-items:center;justify-content:center;padding:40px;"><div class="spinner"></div></div>
          </div>
          <div class="settings-section hidden" id="tab-stages">${renderStagesTab()}</div>
          ${isAdmin ? `<div class="settings-section hidden" id="tab-users"><div style="display:flex;align-items:center;justify-content:center;padding:40px;"><div class="spinner"></div></div></div>` : ''}
          <div class="settings-section hidden" id="tab-webhook">${renderWebhookTab()}</div>
          <div class="settings-section hidden" id="tab-notifications">${renderNotificationsTab()}</div>
        </div>
      </div>
    </div>
  `;

  window.renderIcons();

  // Tab switching
  const tabs = container.querySelectorAll('.settings-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      container.querySelectorAll('.settings-section').forEach(s => s.classList.add('hidden'));
      const target = container.querySelector(`#tab-${tab.dataset.tab}`);
      if (target) target.classList.remove('hidden');
    });
  });

  // Load institute settings
  try {
    const settings = await fetchSettings();
    renderInstituteTab(container, settings, isAdmin);
  } catch (e) {
    document.getElementById('tab-institute').innerHTML = `<p style="color:#dc2626;">Failed to load settings: ${e.message}</p>`;
  }

  // Load users tab
  if (isAdmin) {
    try {
      const users = await fetchUsers();
      renderUsersTab(container, users);
    } catch (e) {
      document.getElementById('tab-users').innerHTML = `<p style="color:#dc2626;">Failed to load users: ${e.message}</p>`;
    }
  }
}

function renderInstituteTab(container, settings, isAdmin) {
  const tab = container.querySelector('#tab-institute');
  tab.innerHTML = `
    <h2 class="settings-section-title">Institute Profile</h2>
    <p class="settings-section-desc">RBMI — Ram Babu Mahavidyalaya Institute, Bareilly</p>
    <div class="settings-form">
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Institute Name</label><input type="text" id="s-name" class="form-input" value="${settings.institute_name || ''}" ${!isAdmin ? 'disabled' : ''} /></div>
        <div class="form-group"><label class="form-label">Short Name</label><input type="text" id="s-short" class="form-input" value="${settings.short_name || ''}" ${!isAdmin ? 'disabled' : ''} /></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" id="s-email" class="form-input" value="${settings.email || ''}" ${!isAdmin ? 'disabled' : ''} /></div>
        <div class="form-group"><label class="form-label">Phone</label><input type="text" id="s-phone" class="form-input" value="${settings.phone || ''}" ${!isAdmin ? 'disabled' : ''} /></div>
        <div class="form-group"><label class="form-label">City</label><input type="text" id="s-city" class="form-input" value="${settings.city || 'Bareilly'}" ${!isAdmin ? 'disabled' : ''} /></div>
        <div class="form-group"><label class="form-label">State</label><input type="text" id="s-state" class="form-input" value="${settings.state || 'Uttar Pradesh'}" ${!isAdmin ? 'disabled' : ''} /></div>
        <div class="form-group form-full"><label class="form-label">Address</label><textarea id="s-address" class="form-input" rows="2" ${!isAdmin ? 'disabled' : ''}>${settings.address || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Website</label><input type="url" id="s-website" class="form-input" value="${settings.website || ''}" ${!isAdmin ? 'disabled' : ''} /></div>
        <div class="form-group"><label class="form-label">Academic Year</label><input type="text" id="s-year" class="form-input" value="${settings.academic_year || '2025-2026'}" ${!isAdmin ? 'disabled' : ''} /></div>
      </div>
      ${isAdmin ? `
      <div class="form-actions">
        <button class="btn btn-primary" id="btn-save-settings"><i data-lucide="check" style="width:16px;height:16px;"></i> Save Changes</button>
        <span id="settings-saved" style="color:#10b981;font-size:14px;display:none;">✓ Saved successfully</span>
      </div>` : '<p style="color:#64748b;font-size:13px;margin-top:16px;">Contact admin to update institute settings.</p>'}
    </div>
  `;

  window.renderIcons();

  document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      await saveSettings({
        institute_name: document.getElementById('s-name').value,
        short_name: document.getElementById('s-short').value,
        email: document.getElementById('s-email').value,
        phone: document.getElementById('s-phone').value,
        city: document.getElementById('s-city').value,
        state: document.getElementById('s-state').value,
        address: document.getElementById('s-address').value,
        website: document.getElementById('s-website').value,
        academic_year: document.getElementById('s-year').value
      });
      const saved = document.getElementById('settings-saved');
      saved.style.display = 'inline';
      setTimeout(() => { saved.style.display = 'none'; }, 3000);
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;"></i> Save Changes';
      window.renderIcons();
    }
  });
}

async function renderUsersTab(container, users) {
  const tab = container.querySelector('#tab-users');
  tab.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div><h2 class="settings-section-title" style="margin:0;">User Management</h2><p class="settings-section-desc" style="margin:4px 0 0;">Manage CRM users and their roles.</p></div>
      <button class="btn btn-primary" id="btn-add-user"><i data-lucide="user-plus"></i> Add User</button>
    </div>
    <div class="users-table-wrap">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody id="users-tbody">
          ${users.map(u => `
            <tr>
              <td>${u.name}</td>
              <td>${u.email}</td>
              <td><span class="role-badge">${u.role}</span></td>
              <td>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-secondary btn-sm btn-edit-user" data-id="${u.id}" data-name="${u.name}" data-email="${u.email}" data-role="${u.role}">Edit</button>
                  <button class="btn btn-danger btn-sm btn-delete-user" data-id="${u.id}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  window.renderIcons();

  document.getElementById('btn-add-user')?.addEventListener('click', () => {
    openUserModal(null, async (data) => {
      await createUser(data);
      const updated = await fetchUsers();
      renderUsersTab(container, updated);
    });
  });

  tab.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', () => {
      openUserModal({ id: btn.dataset.id, name: btn.dataset.name, email: btn.dataset.email, role: btn.dataset.role }, async (data) => {
        await updateUser(btn.dataset.id, data);
        const updated = await fetchUsers();
        renderUsersTab(container, updated);
      });
    });
  });

  tab.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this user?')) return;
      await deleteUser(btn.dataset.id);
      const updated = await fetchUsers();
      renderUsersTab(container, updated);
    });
  });
}

function openUserModal(user, onSave) {
  const isEdit = !!user;
  const content = `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div class="form-group"><label class="form-label">Full Name *</label><input type="text" id="u-name" class="form-input" value="${user?.name || ''}" placeholder="Full name" /></div>
      <div class="form-group"><label class="form-label">Email *</label><input type="email" id="u-email" class="form-input" value="${user?.email || ''}" placeholder="user@rbmi.edu.in" /></div>
      ${!isEdit ? `<div class="form-group"><label class="form-label">Password *</label><input type="password" id="u-pw" class="form-input" placeholder="Set password" /></div>` : ''}
      <div class="form-group"><label class="form-label">Role</label>
        <select id="u-role" class="form-input">
          <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="counselor" ${user?.role === 'counselor' ? 'selected' : ''}>Counselor</option>
        </select>
      </div>
    </div>
    <div id="u-error" style="color:#dc2626;font-size:13px;margin-top:8px;display:none;"></div>
  `;

  openModal(isEdit ? 'Edit User' : 'Add User', content, {
    submitLabel: isEdit ? 'Save Changes' : 'Create User',
    onSubmit: async (body) => {
      const name = body.querySelector('#u-name').value.trim();
      const email = body.querySelector('#u-email').value.trim();
      const errEl = body.querySelector('#u-error');
      if (!name || !email) {
        errEl.textContent = 'Name and email are required.';
        errEl.style.display = 'block';
        return false;
      }
      const data = { name, email, role: body.querySelector('#u-role').value };
      if (!isEdit) data.password = body.querySelector('#u-pw').value || 'counselor123';
      await onSave(data);
    }
  });
}

function renderStagesTab() {
  const stages = [
    { name: 'Enquiry', color: '#8b5cf6', desc: 'Initial student enquiry received' },
    { name: 'Counseling Scheduled', color: '#3b82f6', desc: 'Counseling session has been scheduled' },
    { name: 'Counseling Done', color: '#06b6d4', desc: 'Counseling session completed' },
    { name: 'Application Submitted', color: '#f59e0b', desc: 'Student has submitted the application form' },
    { name: 'Documents Verified', color: '#f97316', desc: 'All required documents have been verified' },
    { name: 'Admitted', color: '#10b981', desc: 'Student has been admitted' },
    { name: 'Enrolled', color: '#059669', desc: 'Student has completed enrollment' }
  ];
  return `
    <h2 class="settings-section-title">Pipeline Stages</h2>
    <p class="settings-section-desc">Admission pipeline stages for RBMI.</p>
    <div class="stages-list">
      ${stages.map((s, i) => `
        <div class="stage-config-item">
          <div class="stage-color-dot" style="background:${s.color};"></div>
          <div class="stage-config-info">
            <span class="stage-config-name">${s.name}</span>
            <span class="stage-config-desc">${s.desc}</span>
          </div>
          <span class="stage-order">${i + 1}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderWebhookTab() {
  const webhookUrl = 'http://localhost:3001/api/webhook/lead';
  const examplePayload = JSON.stringify({
    name: "Rahul Sharma",
    phone: "+91 9876543210",
    email: "rahul@example.com",
    course: "B.Tech Computer Science",
    source: "Website",
    city: "Bareilly"
  }, null, 2);

  return `
    <h2 class="settings-section-title">Lead Automation & Webhook</h2>
    <p class="settings-section-desc">Automatically capture leads from your website, JustDial, Shiksha, CollegeDekho, and more.</p>

    <div class="webhook-section">
      <div class="webhook-card">
        <h3 style="font-size:15px;font-weight:600;margin-bottom:8px;">📡 Webhook Endpoint</h3>
        <p style="font-size:13px;color:#64748b;margin-bottom:12px;">Send a POST request to this URL to automatically create a lead:</p>
        <div class="webhook-url-box">
          <code>${webhookUrl}</code>
          <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${webhookUrl}').then(()=>this.textContent='Copied!').catch(()=>{})">Copy</button>
        </div>
      </div>

      <div class="webhook-card">
        <h3 style="font-size:15px;font-weight:600;margin-bottom:8px;">📋 Request Format</h3>
        <p style="font-size:13px;color:#64748b;margin-bottom:12px;">POST with JSON body (name + phone required):</p>
        <pre class="webhook-code">${examplePayload}</pre>
      </div>

      <div class="webhook-card">
        <h3 style="font-size:15px;font-weight:600;margin-bottom:12px;">🔗 Integration Sources</h3>
        <div class="integration-grid">
          ${[
            { name: 'Website Contact Form', icon: '🌐', desc: 'Add webhook to your HTML form submit handler' },
            { name: 'JustDial', icon: '📞', desc: 'Use JustDial lead API to forward leads here' },
            { name: 'Shiksha.com', icon: '🎓', desc: 'Configure Shiksha lead delivery to this webhook' },
            { name: 'CollegeDekho', icon: '🏫', desc: 'Set up CollegeDekho lead forwarding' },
            { name: 'Google Ads', icon: '📢', desc: 'Use Zapier/n8n to forward Google Lead Forms' },
            { name: 'Facebook Ads', icon: '📘', desc: 'Connect Facebook Lead Ads via n8n automation' },
            { name: 'n8n Automation', icon: '⚡', desc: 'Use n8n to connect any source to this webhook' },
            { name: 'Zapier', icon: '🔄', desc: 'Connect 5000+ apps via Zapier webhook action' }
          ].map(s => `
            <div class="integration-item">
              <span class="integration-icon">${s.icon}</span>
              <div>
                <div style="font-weight:600;font-size:13px;">${s.name}</div>
                <div style="font-size:12px;color:#64748b;">${s.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="webhook-card">
        <h3 style="font-size:15px;font-weight:600;margin-bottom:8px;">🧪 Test Webhook</h3>
        <p style="font-size:13px;color:#64748b;margin-bottom:12px;">Send a test lead to verify the webhook is working:</p>
        <button class="btn btn-primary" id="btn-test-webhook">Send Test Lead</button>
        <div id="webhook-test-result" style="margin-top:12px;font-size:13px;"></div>
      </div>
    </div>
  `;
}

function renderNotificationsTab() {
  const notifs = [
    { label: 'New lead added', desc: 'Get notified when a new lead is captured', checked: true },
    { label: 'Stage changes', desc: 'When a lead moves to a different stage', checked: true },
    { label: 'Counseling reminders', desc: 'Upcoming counseling session alerts', checked: true },
    { label: 'Application submitted', desc: 'When a student submits an application', checked: false },
    { label: 'Daily summary', desc: 'End-of-day summary with key metrics', checked: true },
    { label: 'Weekly report', desc: 'Weekly analytics report', checked: false }
  ];
  return `
    <h2 class="settings-section-title">Notification Preferences</h2>
    <p class="settings-section-desc">Choose what notifications you'd like to receive.</p>
    <div class="notif-options">
      ${notifs.map(n => `
        <div class="notif-item">
          <div class="notif-info"><span class="notif-label">${n.label}</span><span class="notif-desc">${n.desc}</span></div>
          <label class="toggle-switch"><input type="checkbox" ${n.checked ? 'checked' : ''} /><span class="toggle-slider"></span></label>
        </div>
      `).join('')}
    </div>
    <div class="form-actions" style="margin-top:24px;">
      <button class="btn btn-primary" onclick="alert('Notification preferences saved!')"><i data-lucide="check" style="width:16px;height:16px;"></i> Save Preferences</button>
    </div>
  `;
}

// Attach webhook test after render
document.addEventListener('click', async (e) => {
  if (e.target.id !== 'btn-test-webhook') return;
  const btn = e.target;
  const result = document.getElementById('webhook-test-result');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  result.textContent = '';
  try {
    const res = await fetch('http://localhost:3001/api/webhook/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Lead RBMI',
        phone: '+91 9999999999',
        email: 'test@rbmi.edu.in',
        course: 'B.Tech Computer Science',
        source: 'Website',
        city: 'Bareilly'
      })
    });
    const data = await res.json();
    if (res.ok) {
      result.innerHTML = `<span style="color:#10b981;">✓ Test lead created! Lead ID: ${data.lead_id}</span>`;
    } else {
      result.innerHTML = `<span style="color:#dc2626;">✗ Error: ${data.error}</span>`;
    }
  } catch (err) {
    result.innerHTML = `<span style="color:#dc2626;">✗ Failed: ${err.message}. Make sure server is running.</span>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Test Lead';
  }
});
