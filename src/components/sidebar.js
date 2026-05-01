// ===== SIDEBAR COMPONENT — RBMI CRM =====
import { navigateTo } from '../router.js';
import { logout } from '../lib/auth.js';

const adminNavItems = [
  { route: '/dashboard', emoji: '⊞', label: 'Dashboard' },
  { route: '/leads', emoji: '👥', label: 'Leads Manager' },
  { route: '/pipeline', emoji: '⟶', label: 'Pipeline' },
  { route: '/counselors', emoji: '🎧', label: 'Counselors' },
  { route: '/courses', emoji: '🎓', label: 'Courses' },
  { route: '/reports', emoji: '📊', label: 'Reports & Analytics' },
  { route: '/formdesk', emoji: '📋', label: 'FormDesk' },
  { route: '/calendar', emoji: '📅', label: 'Calendar Pro' },
  { route: '/applications', emoji: '📄', label: 'Applications' },
  { route: '/marketing', emoji: '📣', label: 'Marketing' },
  { route: '/campaigns', emoji: '📈', label: 'Campaigns' },
  { route: '/queries', emoji: '❓', label: 'Query Manager' },
  { route: '/payments', emoji: '₹', label: 'Payments' },
  { route: '/templates', emoji: '🗂', label: 'Templates' },
  { route: '/settings', emoji: '⚙', label: 'Settings' },
];

const counselorNavItems = [
  { route: '/dashboard', emoji: '⊞', label: 'Dashboard' },
  { route: '/leads', emoji: '👥', label: 'My Leads' },
  { route: '/pipeline', emoji: '⟶', label: 'Pipeline' },
  { route: '/courses', emoji: '🎓', label: 'Courses' },
  { route: '/calendar', emoji: '📅', label: 'Calendar' },
  { route: '/queries', emoji: '❓', label: 'Queries' },
];

export function renderSidebar(user = null) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const isAdmin = !user || user.role === 'admin';
  const navItems = isAdmin ? adminNavItems : counselorNavItems;
  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD';

  const branchLabel = user?.branch === 'greater_noida' ? 'Greater Noida' : 'Bareilly';

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#6366f1"/>
          <text x="24" y="33" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="24" fill="white">R</text>
        </svg>
      </div>
      <div class="logo-text">
        <span class="logo-name">RBMI CRM</span>
        <span class="logo-sub">📍 ${branchLabel} · ${isAdmin ? 'Admin' : 'Counselor'}</span>
      </div>
    </div>

    <div class="sidebar-search" style="padding: 0 16px 16px;">
      <div style="position: relative; display: flex; align-items: center;">
        <span style="position: absolute; left: 10px; color: #94a3b8; font-size:14px;">🔍</span>
        <input type="text" id="sidebar-search-input" placeholder="Search menu..." style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 8px 10px 8px 34px; border-radius: 6px; color: white; width: 100%; font-family: inherit; font-size: 13px; outline: none;" />
      </div>
    </div>
      </div>
    </div>

    <nav class="sidebar-nav" id="sidebar-nav">
      ${navItems.map(item => `
        <a class="nav-item" data-route="${item.route}" href="#${item.route}">
          <span class="nav-emoji">${item.emoji}</span>
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="user-avatar-sm" style="background: linear-gradient(135deg,#6366f1,#8b5cf6);">${initials}</div>
        <div class="user-info">
          <span class="user-name">${user ? user.name : 'Admin'}</span>
          <span class="user-role">${user ? (user.role === 'admin' ? 'Administrator' : 'Counselor') : 'Admin'}</span>
        </div>
        <button class="user-menu-btn" id="logout-btn" title="Logout" style="font-size:16px;">⏻</button>
      </div>
    </div>
  `;

  // Active route highlighting
  function setActive() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === hash);
    });
  }
  setActive();
  window.addEventListener('hashchange', setActive);

  // Click handlers
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.route);
    });
  });

  // Search filter
  document.getElementById('sidebar-search-input')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      const label = item.querySelector('span')?.textContent.toLowerCase() || '';
      item.style.display = label.includes(q) ? '' : 'none';
    });
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Sign out of RBMI CRM?')) logout();
  });

  // Render icons in sidebar
  window.renderIcons();
}
