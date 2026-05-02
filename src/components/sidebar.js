// ===== SIDEBAR COMPONENT - RBMI Admission Hub =====
import { navigateTo } from '../router.js';
import { logout } from '../lib/auth.js';

const adminNavItems = [
  { route: '/dashboard', icon: 'grid', label: 'Command Center' },
  { route: '/leads', icon: 'users', label: 'Leads Manager' },
  { route: '/pipeline', icon: 'flow', label: 'Admission Pipeline' },
  { route: '/counselors', icon: 'headset', label: 'Counselors' },
  { route: '/courses', icon: 'book', label: 'Programs' },
  { route: '/reports', icon: 'chart', label: 'Reports' },
  { route: '/applications', icon: 'file', label: 'Applications' },
  { route: '/queries', icon: 'help', label: 'Queries' },
  { route: '/payments', icon: 'rupee', label: 'Payments' },
  { route: '/settings', icon: 'gear', label: 'Settings' }
];

const counselorNavItems = [
  { route: '/dashboard', icon: 'grid', label: 'My Desk' },
  { route: '/leads', icon: 'users', label: 'My Leads' },
  { route: '/pipeline', icon: 'flow', label: 'Pipeline' },
  { route: '/courses', icon: 'book', label: 'Programs' },
  { route: '/calendar', icon: 'cal', label: 'Calendar' },
  { route: '/queries', icon: 'help', label: 'Queries' }
];

const studentNavItems = [
  { route: '/portal', icon: 'home', label: 'My Application' },
  { route: '/courses', icon: 'book', label: 'Explore Programs' },
  { route: '/queries', icon: 'help', label: 'Help Desk' },
  { route: '/payments', icon: 'rupee', label: 'Fee Desk' },
  { route: '/download', icon: 'phone', label: 'Mobile App' }
];

const iconMap = {
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  users: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20c.8-3.2 3.4-5 8-5s7.2 1.8 8 5',
  flow: 'M5 6h5v5H5V6Zm9 7h5v5h-5v-5ZM10 8h4a3 3 0 0 1 3 3v2',
  headset: 'M5 12a7 7 0 0 1 14 0v5a2 2 0 0 1-2 2h-2v-6h4M5 17a2 2 0 0 0 2 2h2v-6H5v4Z',
  book: 'M5 4h10a4 4 0 0 1 4 4v12H8a3 3 0 0 1-3-3V4Zm3 13h11',
  chart: 'M5 19V5m0 14h14M9 16v-5m4 5V8m4 8v-3',
  file: 'M7 3h7l5 5v13H7V3Zm7 0v6h5',
  help: 'M12 18h.01M9.2 9a3 3 0 1 1 4.6 2.5c-1 .6-1.8 1.3-1.8 2.5',
  rupee: 'M7 5h10M7 9h10M8 5c6 0 6 8 0 8l7 6',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3M4.9 4.9 7 7m10 10 2.1 2.1M3 12h3m12 0h3M4.9 19.1 7 17m10-10 2.1-2.1',
  home: 'M4 11 12 4l8 7v9H6v-9',
  cal: 'M7 3v4m10-4v4M5 8h14v12H5V8Z',
  phone: 'M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 15h2'
};

function icon(name) {
  return `<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${iconMap[name] || iconMap.grid}"/></svg>`;
}

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
  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD';
  const branchLabel = user?.branch === 'greater_noida' ? 'Greater Noida' : 'Bareilly';

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon"><span>M</span></div>
      <div class="logo-text">
        <span class="logo-name">RBMI Hub</span>
        <span class="logo-sub">${branchLabel} - ${roleLabel(role)}</span>
      </div>
    </div>

    <div class="sidebar-search">
      <div class="sidebar-search-box">
        <span>Search</span>
        <input type="text" id="sidebar-search-input" placeholder="Menu" />
      </div>
    </div>

    <nav class="sidebar-nav" id="sidebar-nav">
      ${navItems.map(item => `
        <a class="nav-item" data-route="${item.route}" href="#${item.route}">
          ${icon(item.icon)}
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
        <button class="user-menu-btn" id="logout-btn" title="Logout">⏻</button>
      </div>
    </div>
  `;

  function setActive() {
    const hash = window.location.hash.slice(1) || (role === 'student' ? '/portal' : '/dashboard');
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === hash);
    });
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
}
