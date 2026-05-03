// ===== SIDEBAR COMPONENT - RBMI Admission Hub =====
import { navigateTo } from '../router.js';
import { logout } from '../lib/auth.js';

const adminNavItems = [
  { route: '/dashboard', icon: 'layout-dashboard', label: 'Command Center' },
  { route: '/leads', icon: 'users', label: 'Leads Manager', children: [
    { route: '/leads/list', label: 'All Leads' },
    { route: '/leads/followups', label: 'Follow-ups' },
    { route: '/leads/import', label: 'Import / Export' }
  ] },
  { route: '/pipeline', icon: 'git-branch', label: 'Admission Pipeline', children: [
    { route: '/pipeline/kanban', label: 'Kanban' },
    { route: '/pipeline/stages', label: 'Stages' }
  ] },
  { route: '/counselors', icon: 'headphones', label: 'Counselors', children: [
    { route: '/counselors/list', label: 'Team' },
    { route: '/counselors/schedule', label: 'Schedules' }
  ] },
  { route: '/courses', icon: 'book-open', label: 'Programs', children: [
    { route: '/courses/list', label: 'Programs List' },
    { route: '/courses/categories', label: 'Categories' }
  ] },
  { route: '/formdesk', icon: 'file-text', label: 'FormDesk', children: [
    { route: '/formdesk/forms', label: 'Forms Library' },
    { route: '/formdesk/submissions', label: 'Submissions' },
    { route: '/formdesk/create', label: 'Create Form' }
  ] },
  { route: '/applications', icon: 'file-input', label: 'Application Manager', children: [
    { route: '/applications/list', label: 'All Applications' },
    { route: '/applications/new', label: 'New Application' },
    { route: '/applications/drafts', label: 'Drafts' }
  ] },
  { route: '/payments', icon: 'indian-rupee', label: 'Payment Manager', children: [
    { route: '/payments/transactions', label: 'Transactions' },
    { route: '/payments/plans', label: 'Fee Plans' },
    { route: '/payments/refunds', label: 'Refunds' }
  ] },
  { route: '/queries', icon: 'help-circle', label: 'Query Manager', children: [
    { route: '/queries/inbox', label: 'Inbox' },
    { route: '/queries/tickets', label: 'Tickets' }
  ] },
  { route: '/calendar', icon: 'calendar', label: 'Calendar Pro', children: [
    { route: '/calendar/events', label: 'Events' },
    { route: '/calendar/schedules', label: 'Schedules' }
  ] },
  { route: '/marketing', icon: 'megaphone', label: 'Marketing', children: [
    { route: '/marketing/overview', label: 'Overview' },
    { route: '/marketing/audiences', label: 'Audiences' }
  ] },
  { route: '/campaigns', icon: 'target', label: 'Campaign Manager', children: [
    { route: '/campaigns/list', label: 'Campaigns' },
    { route: '/campaigns/create', label: 'Create Campaign' }
  ] },
  { route: '/templates', icon: 'layout-template', label: 'Template Manager', children: [
    { route: '/templates/email', label: 'Email Templates' },
    { route: '/templates/sms', label: 'SMS Templates' },
    { route: '/templates/doc', label: 'Document Templates' }
  ] },
  { route: '/ai-assistant', icon: 'sparkles', label: 'Asha AI' },
  { route: '/download', icon: 'smartphone', label: 'Download App' },
  { route: '/integrations', icon: 'puzzle', label: 'Integrations' },
  { route: '/access-control', icon: 'shield-check', label: 'User Access Control', children: [
    { route: '/access-control/users', label: 'Users' },
    { route: '/access-control/roles', label: 'Roles & Permissions' }
  ] },
  { route: '/reports', icon: 'bar-chart-3', label: 'Reports and Analytics', children: [
    { route: '/reports/overview', label: 'Reports Center' },
    { route: '/reports/custom', label: 'Custom Reports' }
  ] },
  { route: '/audit-log', icon: 'scroll-text', label: 'Audit Log' },
  { route: '/settings', icon: 'settings', label: 'Settings', children: [
    { route: '/settings/general', label: 'General' },
    { route: '/settings/branding', label: 'Branding' }
  ] }
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
        ${role === 'admin' ? `
          <select id="campus-switcher" class="campus-select">
            <option value="bareilly" ${user?.branch === 'bareilly' ? 'selected' : ''}>Bareilly Campus</option>
            <option value="greater_noida" ${user?.branch === 'greater_noida' ? 'selected' : ''}>Greater Noida</option>
          </select>
        ` : `
          <span class="logo-sub">${branchLabel} - ${roleLabel(role)}</span>
        `}
      </div>
    </div>

    <div class="sidebar-search">
      <div class="sidebar-search-box">
        <i data-lucide="search" style="width:16px;height:16px;color:#94a3b8;flex-shrink:0;"></i>
        <input type="text" id="sidebar-search-input" placeholder="Search menu..." />
      </div>
    </div>

    <nav class="sidebar-nav" id="sidebar-nav">
      ${navItems.map(item => {
        if (item.children && item.children.length) {
          return `
            <div class="nav-item has-children" data-route="${item.route}" tabindex="0">
              <a class="nav-main" href="#${item.route}" data-route="${item.route}">
                <i data-lucide="${item.icon}" style="width:20px;height:20px;flex-shrink:0;"></i>
                <span>${item.label}</span>
                <i data-lucide="chevron-down" class="nav-caret" style="margin-left:auto;width:18px;height:18px;color:#94a3b8"></i>
              </a>
              <div class="submenu">
                ${item.children.map(sub => `
                  <a class="nav-subitem" data-route="${sub.route}" href="#${sub.route}">
                    <i data-lucide="${sub.icon || 'dot'}" style="width:16px;height:16px;flex-shrink:0;opacity:0.9;margin-right:10px"></i>
                    <span>${sub.label}</span>
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        }
        return `
          <a class="nav-item" data-route="${item.route}" href="#${item.route}">
            <i data-lucide="${item.icon}" style="width:20px;height:20px;flex-shrink:0;"></i>
            <span>${item.label}</span>
          </a>
        `;
      }).join('')}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="user-avatar-sm">${initials}</div>
        <div class="user-info">
          <span class="user-name">${user ? user.name : 'Admin'}</span>
          <span class="user-role">${roleLabel(role)}</span>
        </div>
        <button class="user-menu-btn" id="logout-btn" title="Logout">Off</button>
      </div>
    </div>
  `;

  function setActive() {
    const hash = window.location.hash.slice(1) || (role === 'student' ? '/portal' : '/dashboard');
    // clear previous
    sidebar.querySelectorAll('.nav-item, .nav-subitem, .nav-item.has-children').forEach(item => item.classList.remove('active'));
    // mark top-level items
    const topMatch = sidebar.querySelector(`.nav-item[data-route="${hash}"]`);
    if (topMatch) topMatch.classList.add('active');
    // mark subitems
    const subMatch = sidebar.querySelector(`.nav-subitem[data-route="${hash}"]`);
    if (subMatch) {
      subMatch.classList.add('active');
      const parent = subMatch.closest('.has-children');
      if (parent) parent.classList.add('expanded');
    }
  }

  setActive();
  window.addEventListener('hashchange', setActive);

  // click handlers for top-level and submenu items
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTo(item.dataset.route);
    });
  });

  // handlers for items with children
  sidebar.querySelectorAll('.nav-item.has-children').forEach(wrapper => {
    const main = wrapper.querySelector('.nav-main');
    const submenu = wrapper.querySelector('.submenu');
    const route = wrapper.dataset.route;
    function collapseOthers() {
      sidebar.querySelectorAll('.nav-item.has-children').forEach(w => {
        if (w !== wrapper) w.classList.remove('expanded');
      });
    }
    main.addEventListener('click', (e) => {
      e.preventDefault();
      const expanded = wrapper.classList.toggle('expanded');
      if (expanded) collapseOthers();
      // navigate to parent route as requested
      navigateTo(route);
    });
    // allow clicking submenu items
    wrapper.querySelectorAll('.nav-subitem').forEach(si => {
      si.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(si.dataset.route);
        // expand parent when a subitem is active
        wrapper.classList.add('expanded');
      });
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

<<<<<<< HEAD
  // Render Lucide icons
=======
  document.getElementById('campus-switcher')?.addEventListener('change', (e) => {
    const branch = e.target.value;
    const currentUser = JSON.parse(sessionStorage.getItem('rbmi_user') || '{}');
    sessionStorage.setItem('rbmi_user', JSON.stringify({ ...currentUser, branch }));
    window.location.reload();
  });

>>>>>>> 612f8ff (modified)
  if (window.renderIcons) {
    window.renderIcons();
  }
}
