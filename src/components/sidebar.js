// ===== SIDEBAR COMPONENT - RBMI Admission Hub =====
import { navigateTo } from '../router.js';
import { logout } from '../lib/auth.js';

const adminNavItems = [
  { route: '/dashboard', icon: 'layout-dashboard', label: 'Command Center' },
  { route: '/leads', icon: 'users', label: 'Leads Manager' },
  { route: '/pipeline', icon: 'git-branch', label: 'Admission Pipeline' },
  { route: '/counselors', icon: 'headphones', label: 'Counselors' },
  { route: '/courses', icon: 'book-open', label: 'Programs' },
  { route: '/reports', icon: 'bar-chart-3', label: 'Reports' },
  { route: '/formdesk', icon: 'file-text', label: 'FormDesk' },
  { route: '/calendar', icon: 'calendar', label: 'Calendar Pro' },
  { route: '/applications', icon: 'file-input', label: 'Applications' },
  { route: '/payments', icon: 'indian-rupee', label: 'Payments' },
  { route: '/queries', icon: 'help-circle', label: 'Queries' },
  { route: '/marketing', icon: 'megaphone', label: 'Marketing' },
  { route: '/campaigns', icon: 'target', label: 'Campaigns' },
  { route: '/templates', icon: 'layout-template', label: 'Templates' },
  { route: '/ai-assistant', icon: 'sparkles', label: 'Asha AI' },
  { route: '/integrations', icon: 'puzzle', label: 'Integrations' },
  { route: '/access-control', icon: 'shield-check', label: 'Access Control' },
  { route: '/audit-log', icon: 'scroll-text', label: 'Audit Log' },
  { route: '/download', icon: 'smartphone', label: 'Download App' },
  { route: '/settings', icon: 'settings', label: 'Settings' }
];

const counselorNavItems = [
  { route: '/dashboard', icon: 'layout-dashboard', label: 'My Desk' },
  { route: '/leads', icon: 'users', label: 'My Leads' },
  { route: '/pipeline', icon: 'git-branch', label: 'Pipeline' },
  { route: '/applications', icon: 'file-input', label: 'Applications' },
  { route: '/courses', icon: 'book-open', label: 'Programs' },
  { route: '/calendar', icon: 'calendar', label: 'Calendar' },
  { route: '/queries', icon: 'help-circle', label: 'Queries' },
  { route: '/marketing', icon: 'megaphone', label: 'Engagement' },
  { route: '/ai-assistant', icon: 'sparkles', label: 'Asha AI' },
  { route: '/download', icon: 'smartphone', label: 'Mobile App' }
];

const studentNavItems = [
  { route: '/portal', icon: 'home', label: 'My Application' },
  { route: '/applications', icon: 'file-input', label: 'Applications' },
  { route: '/courses', icon: 'book-open', label: 'Explore Programs' },
  { route: '/queries', icon: 'help-circle', label: 'Help Desk' },
  { route: '/payments', icon: 'indian-rupee', label: 'Fee Desk' },
  { route: '/ai-assistant', icon: 'sparkles', label: 'Asha AI' },
  { route: '/download', icon: 'smartphone', label: 'Mobile App' }
];

function roleLabel(role) {
  if (role === 'admin') return 'Administrator';
  if (role === 'student') return 'Student Portal';
  return 'Counselor';
}

export function renderSidebar(user = null) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const role = user?.role || 'admin';
  const navItems = role === 'student' ? studentNavItems : role === 'admin' ? adminNavItems : counselorNavItems;

  let initials = 'AD';
  if (user && user.name) {
    initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  const branchLabel = user?.branch === 'greater_noida' ? 'Greater Noida' : 'Bareilly';

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">
        <img src="/logo.png" alt="RBMI Logo" style="width:64px;height:64px;object-fit:contain;border-radius:50%;background:transparent;transform:scale(1.06);" onerror="this.onerror=null;this.style.display='none';this.parentNode.innerHTML='<div style=\'width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#14b8a6,#2563eb);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:18px;\'>RBMI</div>';" />
      </div>
      <div class="logo-text">
        <span class="logo-name">RBMI Hub</span>
        <span class="logo-sub">${branchLabel} - ${roleLabel(role)}</span>
      </div>
    </div>

    <div class="sidebar-search">
      <div class="sidebar-search-box">
        <i data-lucide="search" style="width:16px;height:16px;color:#94a3b8;flex-shrink:0;"></i>
        <input type="text" id="sidebar-search-input" placeholder="Search menu..." />
      </div>
    </div>

    <nav class="sidebar-nav" id="sidebar-nav">
      ${navItems.map(item => `
        <a class="nav-item" data-route="${item.route}" href="#${item.route}">
          <i data-lucide="${item.icon}" style="width:20px;height:20px;flex-shrink:0;"></i>
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="user-avatar-sm">${initials}</div>
        <div class="user-info">
          <span class="user-name">${user ? user.name : 'Admin'}</span>
          <span class="user-role">${roleLabel(role)}</span>
        </div>
        <button class="user-menu-btn" id="logout-btn" title="Logout"><i data-lucide="log-out" style="width:18px;height:18px;"></i></button>
      </div>
    </div>
  `;

  function setActive() {
    const hash = window.location.hash.slice(1) || (role === 'student' ? '/portal' : '/dashboard');
    sidebar.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const match = sidebar.querySelector(`.nav-item[data-route="${hash}"]`);
    if (match) match.classList.add('active');
  }

  setActive();
  window.addEventListener('hashchange', setActive);

  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTo(item.dataset.route);
    });
  });

  document.getElementById('sidebar-search-input')?.addEventListener('input', (event) => {
    const q = event.target.value.toLowerCase();
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      const label = item.textContent.toLowerCase();
      item.style.display = label.includes(q) ? '' : 'none';
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Sign out of RBMI Admission Hub?')) logout();
  });

  if (window.renderIcons) {
    window.renderIcons();
  }
}
