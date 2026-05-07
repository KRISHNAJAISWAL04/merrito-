import { fetchActivities } from '../lib/api.js';

export async function renderAuditLog(el) {
  el.innerHTML = '<div class="ops-shell"><div class="ops-header"><div><span class="eyebrow">Admin Center</span><h1>Audit Log</h1><p>Track all system activities, user actions, and stage changes.</p></div></div></div>';

  try {
    const logs = await fetchActivities(100);

    el.innerHTML = `
      <div class="ops-shell">
        <div class="ops-header">
          <div><span class="eyebrow">Admin Center</span><h1>Audit Log</h1><p>Track all system activities, user actions, and stage changes.</p></div>
        </div>
        <div class="ops-table-wrap">
          <table class="data-table">
            <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Type</th></tr></thead>
            <tbody>
              ${logs.length ? logs.map((l) => {
                const date = new Date(l.created_at).toLocaleString('en-IN');
                const icon = l.type.includes('lead') ? '[Lead]' : l.type.includes('stage') ? '[Stage]' : l.type.includes('payment') ? '[Payment]' : '[Note]';
                const isStudentPortalAction = l.type === 'student_portal';
                const displayUser = isStudentPortalAction && (!l.user_name || l.user_name === 'System')
                  ? 'Student'
                  : (l.user_name || 'System');
                const displayRole = isStudentPortalAction && (!l.user_role || l.user_role === 'system')
                  ? 'student'
                  : (l.user_role || 'system');

                return `<tr>
                  <td>${date}</td>
                  <td><strong>${displayUser}</strong></td>
                  <td><span class="ops-badge info">${displayRole}</span></td>
                  <td>${icon} ${l.message}</td>
                  <td><code>${l.type}</code></td>
                </tr>`;
              }).join('') : '<tr><td colspan="5" class="ops-empty">No logs found</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    window.renderIcons();
  } catch (err) {
    el.innerHTML += `<p style="color:red">Failed to load logs: ${err.message}</p>`;
  }
}
