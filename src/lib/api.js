import { getToken } from '../lib/auth.js';

// ===== API CLIENT — RBMI CRM =====
const API_BASE = 'http://localhost:3001/api';
async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  });

  if (res.status === 401) {
    // Token expired — force re-login
    sessionStorage.removeItem('rbmi_user');
    sessionStorage.removeItem('rbmi_token');
    window.location.reload();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API request failed');
  }
  return res.json();
}

// ---- LEADS ----
export async function fetchLeads({ stage, source, counselor_id, search, sort, order, page, limit } = {}) {
  const params = new URLSearchParams();
  if (stage) params.set('stage', stage);
  if (source) params.set('source', source);
  if (counselor_id) params.set('counselor_id', counselor_id);
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  if (order) params.set('order', order);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  return request(`/leads?${params.toString()}`);
}

export async function fetchLead(id) {
  return request(`/leads/${id}`);
}

export async function createLead(data) {
  return request('/leads', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateLead(id, data) {
  return request(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteLead(id) {
  return request(`/leads/${id}`, { method: 'DELETE' });
}

export async function bulkDeleteLeads(ids) {
  return request('/leads/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
}

export function exportLeadsCSV() {
  const token = getToken();
  const url = `${API_BASE}/leads/export/csv`;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rbmi-leads.csv';
  // Use fetch to include auth header
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.click();
      URL.revokeObjectURL(blobUrl);
    });
}

// ---- DASHBOARD ----
export async function fetchDashboardStats() {
  return request('/dashboard/stats');
}

// ---- COUNSELORS ----
export async function fetchCounselors() {
  return request('/counselors');
}

export async function createCounselor(data) {
  return request('/counselors', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCounselor(id, data) {
  return request(`/counselors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteCounselor(id) {
  return request(`/counselors/${id}`, { method: 'DELETE' });
}

// ---- COURSES ----
export async function fetchCourses() {
  return request('/courses');
}

export async function createCourse(data) {
  return request('/courses', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCourse(id, data) {
  return request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteCourse(id) {
  return request(`/courses/${id}`, { method: 'DELETE' });
}

// ---- ACTIVITIES ----
export async function fetchActivities(limit = 10) {
  return request(`/activities?limit=${limit}`);
}

// ---- PIPELINE ----
export async function fetchPipeline() {
  return request('/pipeline');
}

// ---- USERS ----
export async function fetchUsers() {
  return request('/users');
}

export async function createUser(data) {
  return request('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUser(id, data) {
  return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' });
}

// ---- SETTINGS ----
export async function fetchSettings() {
  return request('/settings');
}

export async function saveSettings(data) {
  return request('/settings', { method: 'PUT', body: JSON.stringify(data) });
}
