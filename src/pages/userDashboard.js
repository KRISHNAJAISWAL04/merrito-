// ===== USER DASHBOARD PAGE (Productivity Report) =====
import { fetchDashboardStats, fetchCounselors } from '../lib/api.js';
import { createBarChart, createHorizontalBarChart, createDoughnutChart } from '../components/charts.js';

const STAGE_META = [
  { id: 'enquiry', label: 'Enquiry', color: '#8b5cf6' },
  { id: 'counseling_scheduled', label: 'Counseling Scheduled', color: '#3b82f6' },
  { id: 'counseling_done', label: 'Counseling Done', color: '#06b6d4' },
  { id: 'application_submitted', label: 'Application Submitted', color: '#f59e0b' },
  { id: 'documents_verified', label: 'Documents Verified', color: '#f97316' },
  { id: 'admitted', label: 'Admitted', color: '#10b981' },
  { id: 'enrolled', label: 'Enrolled', color: '#059669' }
];

export async function renderUserDashboard(container) {
  container.innerHTML = `
    <div class="ud-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Productivity Report</h1>
          <p class="page-subtitle">Counselor performance and lead distribution overview.</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;padding:60px;"><div class="spinner"></div></div>
    </div>
  `;

  try {
    const [stats, counselors] = await Promise.all([
      fetchDashboardStats(),
      fetchCounselors()
    ]);

    const stageDistrib = stats.stageDistribution || {};
    const counselorNames = counselors.map(c => c.name.split(' ')[0]);
    const counselorLeads = counselors.map(c => c.leads_assigned || 0);
    const counselorApps = counselors.map(c => c.conversions || 0);

    container.innerHTML = `
      <div class="ud-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Productivity Report</h1>
            <p class="page-subtitle">Counselor performance and lead distribution overview.</p>
          </div>
          <div class="header-actions">
            <div class="ud-filter-group">
              <select class="form-input ud-filter-select" id="ud-leads-filter">
                <option>Leads Assigned ▼</option>
              </select>
              <select class="form-input ud-filter-select" id="ud-apps-filter">
                <option>Application Assigned ▼</option>
              </select>
              <select class="form-input ud-filter-select" id="ud-user-filter">
                <option>All Users</option>
                ${counselors.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Lead and Application Count -->
        <div class="ud-chart-card animate-fade-in">
          <div class="chart-header">
            <h3 class="chart-title">Lead and Application Count</h3>
            <div class="ud-chart-legend">
              <span class="ud-legend-item"><span class="ud-legend-dot" style="background:#3b82f6;"></span> Leads</span>
              <span class="ud-legend-item"><span class="ud-legend-dot" style="background:#f97316;"></span> Applications</span>
            </div>
          </div>
          <div class="chart-body" style="height:360px;">
            <canvas id="chart-lead-app-count"></canvas>
          </div>
        </div>

        <!-- Lead Stage Segregation -->
        <div class="ud-chart-card animate-fade-in" style="margin-top:var(--spacing-xl);">
          <div class="chart-header">
            <h3 class="chart-title">Lead Stage Segregation <i data-lucide="info" style="width:16px;height:16px;color:var(--color-text-muted);"></i></h3>
          </div>
          <div class="ud-stage-grid">
            ${STAGE_META.map(s => {
              const count = stageDistrib[s.id] || 0;
              const pct = stats.totalLeads > 0 ? ((count / stats.totalLeads) * 100).toFixed(1) : '0';
              return `
              <div class="ud-stage-row">
                <div class="ud-stage-info">
                  <span class="ud-stage-dot" style="background:${s.color};"></span>
                  <span class="ud-stage-name">${s.label}</span>
                </div>
                <div class="ud-stage-bar-wrap">
                  <div class="ud-stage-bar" style="width:${Math.max(2, pct)}%;background:${s.color};"></div>
                </div>
                <span class="ud-stage-count">${count}</span>
                <span class="ud-stage-pct">${pct}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Counselor Performance Table -->
        <div class="ud-chart-card animate-fade-in" style="margin-top:var(--spacing-xl);">
          <div class="chart-header">
            <h3 class="chart-title">Counselor Snapshot</h3>
          </div>
          <div class="counselor-table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Counselor</th><th>Leads</th><th>Conversions</th><th>Conv. Rate</th></tr>
              </thead>
              <tbody>
                ${counselors.map(c => {
                  const rate = c.leads_assigned > 0 ? ((c.conversions / c.leads_assigned) * 100).toFixed(1) : '0.0';
                  return `
                  <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.leads_assigned}</td>
                    <td>${c.conversions}</td>
                    <td>
                      <div class="rate-bar">
                        <div class="progress-bar"><div class="rate-fill" style="width:${rate}%;background:var(--color-primary);"></div></div>
                        <span>${rate}%</span>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    window.renderIcons();

    setTimeout(() => {
      // Lead and Application Count - grouped bar chart
      const ctx = document.getElementById('chart-lead-app-count');
      if (ctx) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: counselorNames,
            datasets: [
              {
                label: 'Leads',
                data: counselorLeads,
                backgroundColor: '#3b82f6',
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 48
              },
              {
                label: 'Applications',
                data: counselorApps,
                backgroundColor: '#f97316',
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 48
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#0f172a',
                titleFont: { family: 'Inter', size: 13 },
                bodyFont: { family: 'Inter', size: 12 },
                padding: 12,
                cornerRadius: 8
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { family: 'Inter', size: 12 }, color: '#64748b' }
              },
              y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
                ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }
              }
            }
          }
        });
      }
    }, 120);

  } catch (err) {
    container.innerHTML = `
      <div class="ud-page">
        <div class="page-header"><div><h1 class="page-title">Productivity Report</h1></div></div>
        <div class="error-state">
          <i data-lucide="alert-triangle" style="width:48px;height:48px;color:var(--color-danger);"></i>
          <h3>Failed to load data</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary" onclick="location.reload()" style="margin-top:1rem;">Retry</button>
        </div>
      </div>
    `;
    window.renderIcons();
  }
}
