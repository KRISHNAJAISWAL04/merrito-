// ===== DASHBOARD PAGE — API-connected =====
import { fetchDashboardStats, fetchActivities } from '../lib/api.js';
import { createLineChart, createDoughnutChart, createBarChart } from '../components/charts.js';
import { getAvatarColor } from '../components/utils.js';

const STAGE_META = [
  { id: 'enquiry', label: 'Enquiry', color: '#8b5cf6' },
  { id: 'counseling_scheduled', label: 'Counseling Scheduled', color: '#3b82f6' },
  { id: 'counseling_done', label: 'Counseling Done', color: '#06b6d4' },
  { id: 'application_submitted', label: 'Application Submitted', color: '#f59e0b' },
  { id: 'documents_verified', label: 'Documents Verified', color: '#f97316' },
  { id: 'admitted', label: 'Admitted', color: '#10b981' },
  { id: 'enrolled', label: 'Enrolled', color: '#059669' }
];

function renderSkeleton() {
  return `
    <div class="dashboard-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Loading your admissions overview...</p>
        </div>
      </div>
      <div class="kpi-grid">
        ${Array(4).fill('<div class="kpi-card skeleton-card"><div class="skeleton-block"></div></div>').join('')}
      </div>
      <div class="charts-row">
        <div class="chart-card chart-card-wide skeleton-card"><div class="skeleton-block" style="height:260px;"></div></div>
        <div class="chart-card skeleton-card"><div class="skeleton-block" style="height:260px;"></div></div>
      </div>
    </div>
  `;
}

export async function renderDashboard(container) {
  container.innerHTML = renderSkeleton();

  try {
    const [stats, activities] = await Promise.all([
      fetchDashboardStats(),
      fetchActivities(7)
    ]);

    const activityIcons = {
      lead_added: 'user-plus', stage_change: 'arrow-right-circle', counseling: 'message-circle',
      application: 'file-text', enrollment: 'check-circle', document: 'file-check', note: 'edit-3'
    };

    container.innerHTML = `
      <div class="dashboard-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">Welcome back! Here's your admissions overview.</p>
          </div>
          <div class="header-actions">
            <div class="date-badge">
              <i data-lucide="calendar"></i>
              <span>${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card animate-fade-in stagger-1" id="kpi-total-leads">
            <div class="kpi-icon" style="background: var(--color-primary-light); color: var(--color-primary);">
              <i data-lucide="users"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-value">${stats.totalLeads}</span>
              <span class="kpi-label">Total Leads</span>
            </div>
            <div class="kpi-trend trend-up"><i data-lucide="trending-up"></i><span>+12.5%</span></div>
          </div>
          <div class="kpi-card animate-fade-in stagger-2" id="kpi-active-apps">
            <div class="kpi-icon" style="background: var(--color-info-light); color: var(--color-info);">
              <i data-lucide="file-text"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-value">${stats.activeApplications}</span>
              <span class="kpi-label">Active Applications</span>
            </div>
            <div class="kpi-trend trend-up"><i data-lucide="trending-up"></i><span>+8.3%</span></div>
          </div>
          <div class="kpi-card animate-fade-in stagger-3" id="kpi-admissions">
            <div class="kpi-icon" style="background: var(--color-success-light); color: var(--color-success);">
              <i data-lucide="user-check"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-value">${stats.admissions}</span>
              <span class="kpi-label">Admissions</span>
            </div>
            <div class="kpi-trend trend-up"><i data-lucide="trending-up"></i><span>+18.2%</span></div>
          </div>
          <div class="kpi-card animate-fade-in stagger-4" id="kpi-conversion">
            <div class="kpi-icon" style="background: var(--color-warning-light); color: var(--color-warning);">
              <i data-lucide="target"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-value">${stats.conversionRate}%</span>
              <span class="kpi-label">Conversion Rate</span>
            </div>
            <div class="kpi-trend trend-up"><i data-lucide="trending-up"></i><span>+4.1%</span></div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="charts-row">
          <div class="chart-card chart-card-wide animate-fade-in stagger-3">
            <div class="chart-header">
              <h3 class="chart-title">Lead Trends</h3>
              <span class="chart-subtitle">Last 6 months</span>
            </div>
            <div class="chart-body"><canvas id="chart-lead-trends"></canvas></div>
          </div>
          <div class="chart-card animate-fade-in stagger-4">
            <div class="chart-header">
              <h3 class="chart-title">Lead Sources</h3>
              <span class="chart-subtitle">Distribution by channel</span>
            </div>
            <div class="chart-body chart-body-doughnut"><canvas id="chart-sources"></canvas></div>
          </div>
        </div>

        <!-- Pipeline + Activity -->
        <div class="charts-row">
          <div class="chart-card chart-card-wide animate-fade-in stagger-5">
            <div class="chart-header">
              <h3 class="chart-title">Pipeline Overview</h3>
              <span class="chart-subtitle">Stage-wise distribution</span>
            </div>
            <div class="chart-body"><canvas id="chart-pipeline"></canvas></div>
          </div>
          <div class="chart-card animate-fade-in stagger-6">
            <div class="chart-header">
              <h3 class="chart-title">Recent Activity</h3>
              <span class="chart-subtitle">Latest updates</span>
            </div>
            <div class="activity-feed">
              ${activities.map(a => {
                const icon = activityIcons[a.type] || 'activity';
                const timeAgo = getTimeAgo(a.created_at);
                return `
                <div class="activity-item">
                  <div class="activity-icon-wrap"><i data-lucide="${icon}"></i></div>
                  <div class="activity-content">
                    <p class="activity-msg">${a.message}</p>
                    <span class="activity-time">${timeAgo}</span>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Top Counselors -->
        <div class="chart-card animate-fade-in">
          <div class="chart-header">
            <h3 class="chart-title">Top Performing Counselors</h3>
            <span class="chart-subtitle">By conversion rate</span>
          </div>
          <div class="counselor-table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Counselor</th><th>Department</th><th>Leads Assigned</th><th>Conversions</th><th>Conv. Rate</th><th>Rating</th></tr>
              </thead>
              <tbody>
                ${stats.counselorStats.sort((a, b) => {
                  const rateA = a.leads_assigned > 0 ? a.conversions / a.leads_assigned : 0;
                  const rateB = b.leads_assigned > 0 ? b.conversions / b.leads_assigned : 0;
                  return rateB - rateA;
                }).map(c => {
                  const rate = c.leads_assigned > 0 ? ((c.conversions / c.leads_assigned) * 100).toFixed(1) : '0.0';
                  const initials = c.name.split(' ').map(n => n[0]).join('');
                  return `
                  <tr>
                    <td>
                      <div class="table-user">
                        <div class="avatar-sm" style="background:${getAvatarColor(c.name)}">${initials}</div>
                        <div><div class="table-user-name">${c.name}</div><div class="table-user-sub">${c.role}</div></div>
                      </div>
                    </td>
                    <td>${c.department}</td>
                    <td><span class="number-cell">${c.leads_assigned}</span></td>
                    <td><span class="number-cell">${c.conversions}</span></td>
                    <td>
                      <div class="rate-bar">
                        <div class="progress-bar"><div class="rate-fill" style="width:${rate}%;background:var(--color-primary);"></div></div>
                        <span>${rate}%</span>
                      </div>
                    </td>
                    <td><div class="rating-badge"><i data-lucide="star" style="width:14px;height:14px;fill:#f59e0b;color:#f59e0b;"></i> ${c.rating}</div></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    window.renderIcons();

    // Render charts
    setTimeout(() => {
      createLineChart('chart-lead-trends', stats.monthly.labels, [
        { label: 'Enquiries', data: stats.monthly.enquiries, color: '#6366f1', bgColor: 'rgba(99,102,241,0.08)', fill: true },
        { label: 'Admissions', data: stats.monthly.admissions, color: '#10b981', bgColor: 'rgba(16,185,129,0.08)', fill: true },
        { label: 'Enrollments', data: stats.monthly.enrollments, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.08)', fill: true }
      ]);

      const srcLabels = Object.keys(stats.sourceDistribution);
      const srcValues = Object.values(stats.sourceDistribution);
      const srcColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
      createDoughnutChart('chart-sources', srcLabels, srcValues, srcColors);

      const stageLabels = STAGE_META.map(s => s.label);
      const stageValues = STAGE_META.map(s => stats.stageDistribution[s.id] || 0);
      const stageColors = STAGE_META.map(s => s.color);
      createBarChart('chart-pipeline', stageLabels, stageValues, stageColors);
    }, 100);

  } catch (err) {
    container.innerHTML = `
      <div class="dashboard-page">
        <div class="page-header"><div><h1 class="page-title">Dashboard</h1></div></div>
        <div class="error-state">
          <i data-lucide="alert-triangle" style="width:48px;height:48px;color:var(--color-danger);"></i>
          <h3>Failed to load dashboard</h3>
          <p>${err.message}</p>
          <p style="color:var(--color-text-muted);margin-top:0.5rem;">Make sure the API server is running: <code>npm run server</code></p>
          <button class="btn btn-primary" onclick="location.reload()" style="margin-top:1rem;">Retry</button>
        </div>
      </div>
    `;
    window.renderIcons();
  }
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
