// ===== CHART.JS WRAPPER HELPERS =====

const chartInstances = {};

function cssVar(name, fallback = '#94a3b8') {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function chartColors() {
  return {
    grid: cssVar('--color-border-light', '#f1f5f9'),
    tick: cssVar('--color-text-muted', '#94a3b8'),
    tickSecondary: cssVar('--color-text-secondary', '#64748b'),
    tooltipBg: '#0f172a',
    legendColor: cssVar('--color-text-muted', '#64748b'),
    pointBg: cssVar('--color-surface', '#fff')
  };
}

function buildTools() {
  const c = chartColors();
  return {
    tooltip: {
      backgroundColor: '#0f172a',
      titleFont: { family: 'Inter', size: 13 },
      bodyFont: { family: 'Inter', size: 12 },
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 4
    }
  };
}

function buildScales() {
  const c = chartColors();
  return {
    x: {
      grid: { display: false },
      ticks: { font: { family: 'Inter', size: 11 }, color: c.tick }
    },
    y: {
      beginAtZero: true,
      grid: { color: c.grid },
      ticks: { font: { family: 'Inter', size: 11 }, color: c.tick }
    }
  };
}

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

export function createLineChart(canvasId, labels, datasets, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const colors = chartColors();
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map(ds => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color,
        backgroundColor: ds.bgColor || `${ds.color}15`,
        borderWidth: 2.5,
        fill: ds.fill !== undefined ? ds.fill : true,
        tension: 0.4,
        pointBackgroundColor: colors.pointBg,
        pointBorderColor: ds.color,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        ...ds
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: datasets.length > 1,
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: { family: 'Inter', size: 12 },
            color: colors.tick
          }
        },
        ...buildTools()
      },
      scales: buildScales(),
      ...options
    }
  });

  chartInstances[canvasId] = chart;
  return chart;
}

export function createBarChart(canvasId, labels, data, colors, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 48
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        ...buildTools()
      },
      scales: buildScales(),
      ...options
    }
  });

  chartInstances[canvasId] = chart;
  return chart;
}

export function createDoughnutChart(canvasId, labels, data, colorPalette, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const c = chartColors();
  const bgColors = colorPalette || ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { family: 'Inter', size: 11 },
            color: c.legendColor
          }
        },
        ...buildTools()
      },
      ...options
    }
  });

  chartInstances[canvasId] = chart;
  return chart;
}

export function createHorizontalBarChart(canvasId, labels, data, colors, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const c = chartColors();
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderRadius: 4,
        borderSkipped: false,
        maxBarThickness: 28
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        ...buildTools()
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: c.grid },
          ticks: { font: { family: 'Inter', size: 11 }, color: c.tick }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: c.tickSecondary }
        }
      },
      ...options
    }
  });

  chartInstances[canvasId] = chart;
  return chart;
}
