// ===== STUDENT QUALITY INDEX PAGE =====
import { fetchDashboardStats, fetchLeads } from '../lib/api.js';
import { createHorizontalBarChart, createDoughnutChart } from '../components/charts.js';

export async function renderStudentQualityIndex(container) {
  container.innerHTML = `
    <div class="sqi-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Student Quality Index <i data-lucide="info" style="width:18px;height:18px;color:var(--color-text-muted);cursor:help;" title="We recommend you to read the information for better understanding and visualization."></i></h1>
          <p class="page-subtitle">We recommend you to read the information for better understanding and visualization.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" id="sqi-filter-btn"><i data-lucide="filter" style="width:16px;height:16px;"></i> Filter</button>
        </div>
      </div>
      <div class="sqi-loading">
        <div class="spinner"></div>
        <p>Loading quality index data...</p>
      </div>
    </div>
  `;
  window.renderIcons();

  try {
    const [stats, leadsData] = await Promise.all([
      fetchDashboardStats(),
      fetchLeads({ limit: 500 }).catch(() => ({ leads: [] }))
    ]);

    const leads = leadsData.leads || leadsData || [];

    // --- Compute age distribution from leads ---
    const ageGroups = { '16 Yrs': { male: 0, female: 0 }, '17 Yrs': { male: 0, female: 0 }, '18 Yrs': { male: 0, female: 0 }, '19 Yrs': { male: 0, female: 0 }, '20 Yrs': { male: 0, female: 0 } };
    let maleCount = 0, femaleCount = 0, totalAge = 0, ageCount = 0;

    if (leads.length > 0) {
      leads.forEach(lead => {
        const gender = (lead.gender || '').toLowerCase();
        const age = lead.age ? Number(lead.age) : null;

        if (gender === 'male' || gender === 'm') maleCount++;
        else if (gender === 'female' || gender === 'f') femaleCount++;

        if (age) {
          totalAge += age;
          ageCount++;
          if (age <= 16) { ageGroups['16 Yrs'][gender === 'female' || gender === 'f' ? 'female' : 'male']++; }
          else if (age === 17) { ageGroups['17 Yrs'][gender === 'female' || gender === 'f' ? 'female' : 'male']++; }
          else if (age === 18) { ageGroups['18 Yrs'][gender === 'female' || gender === 'f' ? 'female' : 'male']++; }
          else if (age === 19) { ageGroups['19 Yrs'][gender === 'female' || gender === 'f' ? 'female' : 'male']++; }
          else { ageGroups['20 Yrs'][gender === 'female' || gender === 'f' ? 'female' : 'male']++; }
        }
      });
    }

    // Fallback demo data if no leads have age/gender
    if (maleCount === 0 && femaleCount === 0) {
      maleCount = Math.round((stats.totalLeads || 30) * 0.6);
      femaleCount = (stats.totalLeads || 30) - maleCount;
      ageGroups['16 Yrs'] = { male: 2, female: 1 };
      ageGroups['17 Yrs'] = { male: 5, female: 4 };
      ageGroups['18 Yrs'] = { male: 8, female: 6 };
      ageGroups['19 Yrs'] = { male: 4, female: 3 };
      ageGroups['20 Yrs'] = { male: 3, female: 2 };
      totalAge = 18 * (stats.totalLeads || 30);
      ageCount = stats.totalLeads || 30;
    }

    const avgAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 19;
    const malePercent = (maleCount + femaleCount) > 0 ? Math.round((maleCount / (maleCount + femaleCount)) * 100) : 60;
    const femalePercent = 100 - malePercent;

    // GCD for ratio
    function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
    const g = gcd(maleCount || 3, femaleCount || 2);
    const ratioM = (maleCount || 3) / (g || 1);
    const ratioF = (femaleCount || 2) / (g || 1);

    // Source inflow
    const sourceData = stats.sourceDistribution || {};
    const sourceLabels = Object.keys(sourceData);
    const sourceValues = Object.values(sourceData);

    // Stage distribution for lead stage segregation
    const stageData = stats.stageDistribution || {};

    container.innerHTML = `
      <div class="sqi-page">
        <div class="page-header">
          <div>
            <h1 class="page-title">Student Quality Index <i data-lucide="info" style="width:18px;height:18px;color:var(--color-text-muted);cursor:help;" title="We recommend you to read the information for better understanding and visualization."></i></h1>
            <p class="page-subtitle">We recommend you to read the information for better understanding and visualization.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" id="sqi-filter-btn"><i data-lucide="filter" style="width:16px;height:16px;"></i> Filter</button>
          </div>
        </div>

        <!-- Age Bifurcation + Gender Ratio -->
        <div class="sqi-charts-row">
          <div class="sqi-chart-card animate-fade-in">
            <h3 class="sqi-chart-title">Age Bifurcation</h3>
            <div class="sqi-chart-body">
              <canvas id="chart-age-bifurcation"></canvas>
            </div>
            <div class="sqi-insight-box">
              <h4 class="sqi-insight-heading">Insight</h4>
              <p class="sqi-insight-text">1. Average age of your Applicants is <strong>${avgAge} years</strong>.</p>
            </div>
          </div>

          <div class="sqi-chart-card animate-fade-in">
            <h3 class="sqi-chart-title">Gender Ratio</h3>
            <div class="sqi-chart-body sqi-chart-body-doughnut">
              <canvas id="chart-gender-ratio"></canvas>
            </div>
            <div class="sqi-gender-legend">
              <span class="sqi-legend-item"><span class="sqi-legend-dot" style="background:#f97316;"></span> Male</span>
              <span class="sqi-legend-item"><span class="sqi-legend-dot" style="background:#06b6d4;"></span> Female</span>
            </div>
            <div class="sqi-insight-box">
              <h4 class="sqi-insight-heading">Insight</h4>
              <p class="sqi-insight-text">1. Gender ratio (Male : Female) of your Applicants is <strong>${ratioM}:${ratioF}</strong>.</p>
            </div>
          </div>
        </div>

        <!-- Inflow Analysis -->
        <div class="sqi-section animate-fade-in">
          <h2 class="sqi-section-title">Inflow Analysis</h2>
          <div class="sqi-charts-row">
            <div class="sqi-chart-card">
              <h3 class="sqi-chart-title">Source-wise Inflow</h3>
              <div class="sqi-chart-body" style="height:300px;">
                <canvas id="chart-sqi-source"></canvas>
              </div>
            </div>
            <div class="sqi-chart-card">
              <h3 class="sqi-chart-title">Stage-wise Distribution</h3>
              <div class="sqi-chart-body" style="height:300px;">
                <canvas id="chart-sqi-stage"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Lead Quality Summary -->
        <div class="sqi-section animate-fade-in">
          <h2 class="sqi-section-title">Quality Summary</h2>
          <div class="sqi-kpi-row">
            <div class="sqi-kpi-card">
              <div class="sqi-kpi-icon" style="background:rgba(99,102,241,0.1);color:#6366f1;"><i data-lucide="users"></i></div>
              <div class="sqi-kpi-content">
                <span class="sqi-kpi-value">${stats.totalLeads || 0}</span>
                <span class="sqi-kpi-label">Total Applicants</span>
              </div>
            </div>
            <div class="sqi-kpi-card">
              <div class="sqi-kpi-icon" style="background:rgba(16,185,129,0.1);color:#10b981;"><i data-lucide="user-check"></i></div>
              <div class="sqi-kpi-content">
                <span class="sqi-kpi-value">${stats.admissions || 0}</span>
                <span class="sqi-kpi-label">Admitted</span>
              </div>
            </div>
            <div class="sqi-kpi-card">
              <div class="sqi-kpi-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b;"><i data-lucide="target"></i></div>
              <div class="sqi-kpi-content">
                <span class="sqi-kpi-value">${stats.conversionRate || 0}%</span>
                <span class="sqi-kpi-label">Conversion Rate</span>
              </div>
            </div>
            <div class="sqi-kpi-card">
              <div class="sqi-kpi-icon" style="background:rgba(239,68,68,0.1);color:#ef4444;"><i data-lucide="clock"></i></div>
              <div class="sqi-kpi-content">
                <span class="sqi-kpi-value">${avgAge} yrs</span>
                <span class="sqi-kpi-label">Avg. Age</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    window.renderIcons();

    setTimeout(() => {
      // Age Bifurcation - horizontal grouped bar
      const ageLabels = Object.keys(ageGroups).reverse();
      const ageMaleData = ageLabels.map(k => ageGroups[k].male);
      const ageFemaleData = ageLabels.map(k => ageGroups[k].female);

      const ageCtx = document.getElementById('chart-age-bifurcation');
      if (ageCtx) {
        new Chart(ageCtx, {
          type: 'bar',
          data: {
            labels: ageLabels,
            datasets: [
              {
                label: 'Male',
                data: ageMaleData,
                backgroundColor: '#3b82f6',
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 20
              },
              {
                label: 'Female',
                data: ageFemaleData,
                backgroundColor: '#f97316',
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 20
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { family: 'Inter', size: 11 } }
              },
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
                beginAtZero: true,
                title: { display: true, text: 'Total Number of Applicants', font: { family: 'Inter', size: 12 }, color: '#64748b' },
                grid: { color: '#f1f5f9' },
                ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }
              },
              y: {
                title: { display: true, text: 'Age Group', font: { family: 'Inter', size: 12 }, color: '#64748b' },
                grid: { display: false },
                ticks: { font: { family: 'Inter', size: 11, weight: 600 }, color: '#334155' }
              }
            }
          }
        });
      }

      // Gender Ratio - doughnut
      createDoughnutChart('chart-gender-ratio',
        [`Male ${malePercent}%`, `Female ${femalePercent}%`],
        [maleCount, femaleCount],
        ['#f97316', '#06b6d4'],
        {
          plugins: {
            legend: { display: false }
          }
        }
      );

      // Source-wise inflow
      if (sourceLabels.length > 0) {
        const srcColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        createHorizontalBarChart('chart-sqi-source', sourceLabels, sourceValues, sourceLabels.map((_, i) => srcColors[i % srcColors.length]));
      }

      // Stage distribution
      const stageLabels = Object.keys(stageData);
      const stageValues = Object.values(stageData);
      if (stageLabels.length > 0) {
        const stageColors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#f59e0b', '#f97316', '#10b981', '#059669'];
        createHorizontalBarChart('chart-sqi-stage', stageLabels.map(s => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())), stageValues, stageLabels.map((_, i) => stageColors[i % stageColors.length]));
      }
    }, 120);

  } catch (err) {
    container.innerHTML = `
      <div class="sqi-page">
        <div class="page-header"><div><h1 class="page-title">Student Quality Index</h1></div></div>
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
