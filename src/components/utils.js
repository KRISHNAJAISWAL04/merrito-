// ===== UTILITY FUNCTIONS =====

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function getStageInfo(stageId) {
  const stageMap = {
    'enquiry': { label: 'Enquiry', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    'counseling_scheduled': { label: 'Counseling Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    'counseling_done': { label: 'Counseling Done', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    'application_submitted': { label: 'Application Submitted', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    'documents_verified': { label: 'Documents Verified', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
    'admitted': { label: 'Admitted', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    'enrolled': { label: 'Enrolled', color: '#059669', bg: 'rgba(5,150,105,0.1)' }
  };
  return stageMap[stageId] || { label: stageId, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
}

export function getPriorityInfo(priority) {
  const map = {
    'high': { label: 'High', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    'medium': { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    'low': { label: 'Low', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
  };
  return map[priority] || map['medium'];
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'className') el.className = val;
    else if (key === 'innerHTML') el.innerHTML = val;
    else if (key === 'textContent') el.textContent = val;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (key === 'style' && typeof val === 'object') Object.assign(el.style, val);
    else if (key === 'dataset' && typeof val === 'object') Object.entries(val).forEach(([k,v]) => el.dataset[k] = v);
    else el.setAttribute(key, val);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

// Simple avatar color generator
const avatarColors = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #3b82f6, #06b6d4)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
  'linear-gradient(135deg, #ef4444, #ec4899)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)'
];

export function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
