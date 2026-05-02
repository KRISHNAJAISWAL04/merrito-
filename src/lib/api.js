import { getToken } from '../lib/auth.js';

// ===== API CLIENT — RBMI CRM =====
const API_BASE = 'http://localhost:3001/api';
const LOCAL_APPLICATIONS_KEY = 'rbmi_local_applications';
const LOCAL_QUERIES_KEY = 'rbmi_local_queries';
const LOCAL_PAYMENTS_KEY = 'rbmi_local_payments';
const LOCAL_PORTAL_KEY = 'rbmi_local_portal_profiles';

function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem('rbmi_user') || 'null');
  } catch {
    return null;
  }
}

function shouldUseLocalAdmissionsFallback(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('not found') || message.includes('failed to fetch') || message.includes('networkerror');
}

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function makeLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getLocalCollection(key, seedFactory) {
  const current = readLocal(key, null);
  if (current) return current;
  const seeded = seedFactory();
  writeLocal(key, seeded);
  return seeded;
}

function seedLocalApplications() {
  const user = getSessionUser();
  const seed = [];
  if (user?.role === 'student') {
    seed.push({
      id: 'local-app-student-demo',
      user_id: user.id,
      student_name: user.name,
      email: user.email,
      course_id: null,
      course_name: 'Program not selected',
      status: 'submitted',
      documents_status: 'pending',
      counselor_name: 'Admissions team',
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  return seed;
}

function seedLocalQueries() {
  const user = getSessionUser();
  return [{
    id: 'local-query-demo',
    user_id: user?.id || null,
    student_name: user?.name || 'Student',
    subject: 'Admission help',
    category: 'General',
    status: 'open',
    priority: 'medium',
    message: 'Need help with the next admission step.',
    response: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }];
}

function seedLocalPayments() {
  const user = getSessionUser();
  return [{
    id: 'local-payment-demo',
    user_id: user?.role === 'student' ? user.id : null,
    student_name: user?.name || 'Student',
    title: 'Admission fee',
    amount: 25000,
    status: 'due',
    method: 'Online',
    due_date: '2026-05-15',
    receipt_no: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }];
}

function getLocalPortalProfiles() {
  return readLocal(LOCAL_PORTAL_KEY, {});
}

function saveLocalPortalProfiles(value) {
  writeLocal(LOCAL_PORTAL_KEY, value);
}
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

// ---- STUDENT PORTAL ----
export async function fetchPortalProfile() {
  try {
    return await request('/portal/profile');
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const user = getSessionUser();
    const profiles = getLocalPortalProfiles();
    if (profiles[user?.id]) return profiles[user.id];
    const profile = {
      user_id: user?.id || 'local-student',
      name: user?.name || 'Student',
      email: user?.email || '',
      phone: '',
      city: '',
      course_id: null,
      course_name: 'Program not selected',
      stage: 'enquiry',
      counselor_name: 'Admissions team',
      readiness: 35,
      next_step: 'Complete your profile',
      fee_due: '25000',
      scholarship: 'Not reviewed yet',
      branch: user?.branch || 'bareilly',
      updated_at: new Date().toISOString()
    };
    profiles[profile.user_id] = profile;
    saveLocalPortalProfiles(profiles);
    return profile;
  }
}

export async function updatePortalProfile(data) {
  try {
    return await request('/portal/profile', { method: 'PUT', body: JSON.stringify(data) });
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const user = getSessionUser();
    const profiles = getLocalPortalProfiles();
    const fallbackProfile = profiles[user?.id] || await fetchPortalProfile();
    const next = { ...fallbackProfile, ...data, updated_at: new Date().toISOString() };
    profiles[next.user_id] = next;
    saveLocalPortalProfiles(profiles);
    return next;
  }
}

// ---- APPLICATIONS ----
export async function fetchApplications() {
  try {
    return await request('/applications');
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const user = getSessionUser();
    let items = getLocalCollection(LOCAL_APPLICATIONS_KEY, seedLocalApplications);
    if (user?.role === 'student') items = items.filter(item => item.user_id === user.id);
    return items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
}

export async function createApplication(data) {
  try {
    return await request('/applications', { method: 'POST', body: JSON.stringify(data) });
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const user = getSessionUser();
    const items = getLocalCollection(LOCAL_APPLICATIONS_KEY, seedLocalApplications);
    const item = {
      id: makeLocalId('app'),
      user_id: user?.role === 'student' ? user.id : null,
      student_name: data.student_name || user?.name || 'Student',
      email: data.email || user?.email || '',
      course_id: data.course_id || null,
      course_name: 'Program not selected',
      status: data.status || 'submitted',
      documents_status: data.documents_status || 'pending',
      counselor_name: data.counselor_name || 'Admissions team',
      priority: data.priority || 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    items.unshift(item);
    writeLocal(LOCAL_APPLICATIONS_KEY, items);
    return item;
  }
}

export async function updateApplication(id, data) {
  try {
    return await request(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const items = getLocalCollection(LOCAL_APPLICATIONS_KEY, seedLocalApplications);
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) throw new Error('Application not found');
    items[idx] = { ...items[idx], ...data, updated_at: new Date().toISOString() };
    writeLocal(LOCAL_APPLICATIONS_KEY, items);
    return items[idx];
  }
}

// ---- QUERIES ----
export async function fetchQueries() {
  try {
    return await request('/queries');
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const user = getSessionUser();
    let items = getLocalCollection(LOCAL_QUERIES_KEY, seedLocalQueries);
    if (user?.role === 'student') items = items.filter(item => item.user_id === user.id);
    return items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
}

export async function createQuery(data) {
  try {
    return await request('/queries', { method: 'POST', body: JSON.stringify(data) });
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const user = getSessionUser();
    const items = getLocalCollection(LOCAL_QUERIES_KEY, seedLocalQueries);
    const item = {
      id: makeLocalId('qry'),
      user_id: user?.id || null,
      student_name: data.student_name || user?.name || 'Student',
      subject: data.subject || 'Admission query',
      category: data.category || 'General',
      status: 'open',
      priority: data.priority || 'medium',
      message: data.message || '',
      response: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    items.unshift(item);
    writeLocal(LOCAL_QUERIES_KEY, items);
    return item;
  }
}

export async function updateQuery(id, data) {
  try {
    return await request(`/queries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const items = getLocalCollection(LOCAL_QUERIES_KEY, seedLocalQueries);
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) throw new Error('Query not found');
    items[idx] = { ...items[idx], ...data, updated_at: new Date().toISOString() };
    writeLocal(LOCAL_QUERIES_KEY, items);
    return items[idx];
  }
}

// ---- PAYMENTS ----
export async function fetchPayments() {
  try {
    return await request('/payments');
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const user = getSessionUser();
    let items = getLocalCollection(LOCAL_PAYMENTS_KEY, seedLocalPayments);
    if (user?.role === 'student') items = items.filter(item => item.user_id === user.id);
    return items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
}

export async function createPayment(data) {
  try {
    return await request('/payments', { method: 'POST', body: JSON.stringify(data) });
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const items = getLocalCollection(LOCAL_PAYMENTS_KEY, seedLocalPayments);
    const item = {
      id: makeLocalId('pay'),
      user_id: data.user_id || null,
      student_name: data.student_name || 'Student',
      title: data.title || 'Admission fee',
      amount: Number(data.amount || 0),
      status: data.status || 'due',
      method: data.method || 'Online',
      due_date: data.due_date || '',
      receipt_no: data.receipt_no || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    items.unshift(item);
    writeLocal(LOCAL_PAYMENTS_KEY, items);
    return item;
  }
}

export async function updatePayment(id, data) {
  try {
    return await request(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  } catch (error) {
    if (!shouldUseLocalAdmissionsFallback(error)) throw error;
    const items = getLocalCollection(LOCAL_PAYMENTS_KEY, seedLocalPayments);
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) throw new Error('Payment not found');
    const updates = { ...data, updated_at: new Date().toISOString() };
    if (updates.status === 'paid' && !updates.receipt_no && !items[idx].receipt_no) {
      updates.receipt_no = `RBMI-${Date.now().toString().slice(-6)}`;
    }
    items[idx] = { ...items[idx], ...updates };
    writeLocal(LOCAL_PAYMENTS_KEY, items);
    return items[idx];
  }
}
