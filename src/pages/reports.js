// ===== REPORTS & ANALYTICS PAGE — API-connected =====
import { fetchDashboardStats, fetchCounselors } from '../lib/api.js';
import { exportLeadsCSV } from '../lib/api.js';
import { createLineChart, createBarChart, createDoughnutChart, createHorizontalBarChart } from '../components/charts.js';

const STAGE_META = [
  { id: 'enquiry', label: 'Enquiry', color: '#8b5cf6' },
  { id: 'counseling_scheduled', label: 'Counseling Scheduled', color: '#3b82f6' },
  { id: 'counseling_done', label: 'Counseling Done', color: '#06b6d4' },
  { id: 'application_submitted', label: 'Application Submitted', color: '#f59e0b' },
  { id: 'documents_verified', label: 'Documents Verified', color: '#f97316' },
  { id: 'admitted', label: 'Admitted', color: '#10b981' },
  { id: 'enrolled', label: 'Enrolled', color: '#059669' }
];

export async function renderReports(container) {
  container.innerHTML = `<div class="reports-page"><div class="page-header"><div><h1 class="page-title">Reports & Analytics</h1><p class="page-subtitle">Loading reports...</p></div></div></div>`;

  try {
    const [stats, counselors] = await Promise.all([fetchDashboardStats(), fetchCounselors()]);

    const stageCounts = stats.stageDistribution;
    const maxStage = Math.max(...STAGE_META.map(s => stageCounts[s.id] || 0), 1);

    // Priority counts from real data
    const priorityCounts = stats.priorityDistribution || { high: 0, medium: 0, low: 0 };

    container.innerHTML = `
      <div class="reports-page">
        <div class="page-header">
          <div><h1 class="page-title">Reports & Analytics</h1><p class="page-subtitle">Deep dive into your admissions data and performance metrics.</p></div>
          <div class="header-actions">
            <button class="btn btn-secondary" id="export-btn"><i data-lucide="download" style="width:16px;height:16px;"></i> Export Report</button>
          </div>
        </div>

        <!-- Conversion Funnel -->
        <div class="chart-card animate-fade-in">
          <div class="chart-header"><h3 class="chart-title">Conversion Funnel</h3><span class="chart-subtitle">Lead progression through admission stages</span></div>
          <div class="funnel-container">
            ${STAGE_META.map((s, i) => {
              const count = stageCounts[s.id] || 0;
              const width = Math.max(25, (count / maxStage) * 100);
              const prevCount = i > 0 ? (stageCounts[STAGE_META[i-1].id] || 0) : 0;
              const dropoff = i > 0 && prevCount > 0 ? ((prevCount - count) / prevCount * 100).toFixed(1) : null;
              return `
              <div class="funnel-row">
                <div class="funnel-label"><span class="funnel-stage-name">${s.label}</span><span class="funnel-stage-count">${count} leads</span></div>
                <div class="funnel-bar-wrap"><div class="funnel-bar" style="width:${width}%;background:${s.color};"><span class="funnel-bar-text">${count}</span></div></div>
                ${dropoff !== null ? `<span class="funnel-dropoff">↓ ${dropoff}%</span>` : '<span class="funnel-dropoff"></span>'}
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-row">
          <div class="chart-card animate-fade-in">
            <div class="chart-header"><h3 class="chart-title">Monthly Admission Trends</h3><span class="chart-subtitle">Enquiries vs Admissions vs Enrollments</span></div>
            <div class="chart-body" style="height:280px;"><canvas id="chart-monthly-trends"></canvas></div>
          </div>
          <div class="chart-card animate-fade-in">
            <div class="chart-header"><h3 class="chart-title">Source-wise Lead Distribution</h3><span class="chart-subtitle">Where leads are coming from</span></div>
            <div class="chart-body" style="height:280px;"><canvas id="chart-source-bars"></canvas></div>
          </div>
        </div>

        <div class="charts-row">
          <div class="chart-card animate-fade-in">
            <div class="chart-header"><h3 class="chart-title">Counselor Performance</h3><span class="chart-subtitle">Conversion rate by counselor</span></div>
            <div class="chart-body" style="height:280px;"><canvas id="chart-counselor-conv"></canvas></div>
          </div>
          <div class="chart-card animate-fade-in">
            <div class="chart-header"><h3 class="chart-title">Lead Priority Distribution</h3><span class="chart-subtitle">High / Medium / Low</span></div>
            <div class="chart-body chart-body-doughnut" style="height:280px;"><canvas id="chart-priority-dist"></canvas></div>
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="chart-card animate-fade-in">
          <div class="chart-header"><h3 class="chart-title">Key Performance Metrics</h3><span class="chart-subtitle">Summary statistics</span></div>
          <div class="metrics-grid">
            ${[
              { label: 'Total Enquiries', value: stats.totalLeads, icon: 'inbox', color: 'var(--color-primary)' },
              { label: 'Active Applications', value: stats.activeApplications, icon: 'file-text', color: '#f59e0b' },
              { label: 'Admissions', value: stats.admissions, icon: 'user-check', color: 'var(--color-success)' },
              { label: 'Conversion Rate', value: stats.conversionRate + '%', icon: 'target', color: '#8b5cf6' },
              { label: 'Counselors Active', value: counselors.length, icon: 'headset', color: 'var(--color-info)' },
              { label: 'Avg. Response Time', value: '2.4 hrs', icon: 'clock', color: '#f97316' }
            ].map(m => `
              <div class="metric-card">
                <div class="metric-icon" style="color:${m.color};background:${m.color}15;"><i data-lucide="${m.icon}"></i></div>
                <div><div class="metric-value">${m.value}</div><div class="metric-label">${m.label}</div></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    window.renderIcons();

    document.getElementById('export-btn')?.addEventListener('click', () => exportLeadsCSV());

    setTimeout(() => {
      createLineChart('chart-monthly-trends', stats.monthly.labels, [
        { label: 'Enquiries', data: stats.monthly.enquiries, color: '#6366f1', fill: false },
        { label: 'Admissions', data: stats.monthly.admissions, color: '#10b981', fill: false },
        { label: 'Enrollments', data: stats.monthly.enrollments, color: '#f59e0b', fill: false }
      ]);

      const srcLabels = Object.keys(stats.sourceDistribution);
      const srcValues = Object.values(stats.sourceDistribution);
      const srcColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
      createBarChart('chart-source-bars', srcLabels, srcValues, srcColors);

      createHorizontalBarChart(
        'chart-counselor-conv',
        counselors.map(c => c.name.split(' ')[0]),
        counselors.map(c => c.leads_assigned > 0 ? ((c.conversions / c.leads_assigned) * 100).toFixed(1) : 0),
        counselors.map((_, i) => ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 6])
      );

      createDoughnutChart('chart-priority-dist', ['High', 'Medium', 'Low'],
        [priorityCounts.high, priorityCounts.medium, priorityCounts.low],
        ['#ef4444', '#f59e0b', '#10b981']
      );
    }, 100);

  } catch (err) {
    container.innerHTML = `<div class="reports-page"><div class="error-state"><p>Failed to load reports: ${err.message}</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div></div>`;
  }
}
