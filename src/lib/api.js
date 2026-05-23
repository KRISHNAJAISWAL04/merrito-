import { getToken } from '../lib/auth.js';

// ===== API CLIENT — RBMI CRM =====
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
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
      documents: seedLocalDocuments(),
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
    installments: buildLocalInstallments(25000, 2, '2026-05-15'),
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

function buildLocalInstallments(amount, count = 1, firstDueDate = '') {
  const total = Number(amount || 0);
  const parts = Math.max(1, Number(count || 1));
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, index) => {
    const due = firstDueDate ? new Date(firstDueDate) : new Date();
    due.setMonth(due.getMonth() + index);
    return {
      id: makeLocalId('inst'),
      title: parts === 1 ? 'Full payment' : `Installment ${index + 1}`,
      amount: base + (index === 0 ? remainder : 0),
      status: 'due',
      due_date: due.toISOString().slice(0, 10),
      paid_at: null,
      receipt_no: ''
    };
  });
}

function getLocalPaymentStatus(installments = []) {
  if (!installments.length) return 'due';
  if (installments.every(item => item.status === 'paid')) return 'paid';
  if (installments.some(item => item.status === 'paid')) return 'partial';
  if (installments.some(item => item.status === 'failed')) return 'failed';
  return 'due';
}

function seedLocalDocuments() {
  return [
    { id: makeLocalId('doc'), name: 'Class 10 marksheet', status: 'missing', file_name: '', remarks: '', uploaded_at: null, reviewed_at: null },
    { id: makeLocalId('doc'), name: 'Class 12 marksheet', status: 'missing', file_name: '', remarks: '', uploaded_at: null, reviewed_at: null },
    { id: makeLocalId('doc'), name: 'ID proof', status: 'missing', file_name: '', remarks: '', uploaded_at: null, reviewed_at: null },
    { id: makeLocalId('doc'), name: 'Entrance scorecard', status: 'missing', file_name: '', remarks: '', uploaded_at: null, reviewed_at: null },
    { id: makeLocalId('doc'), name: 'Passport photo', status: 'missing', file_name: '', remarks: '', uploaded_at: null, reviewed_at: null }
  ];
}

function normalizeLocalDocuments(documents) {
  const seed = seedLocalDocuments();
  const byName = new Map((Array.isArray(documents) ? documents : []).map(doc => [doc.name, doc]));
  return seed.map(doc => ({ ...doc, ...(byName.get(doc.name) || {}) }));
}

function getLocalDocumentsStatus(documents) {
  const docs = normalizeLocalDocuments(documents);
  if (docs.every(doc => doc.status === 'verified')) return 'verified';
  if (docs.some(doc => doc.status === 'rejected')) return 'rejected';
  if (docs.some(doc => doc.status === 'submitted')) return 'submitted';
  return 'pending';
}

// ---- TASKS / FOLLOW-UPS ----
export async function fetchTasks({ lead_id, status } = {}) {
  const params = new URLSearchParams();
  if (lead_id) params.set('lead_id', lead_id);
  if (status) params.set('status', status);
  return request(`/tasks?${params.toString()}`);
}

export async function createTask(data) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTask(id, data) {
  return request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' });
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
  return request(`/dashboard/stats?_=${Date.now()}`);
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
      documents: normalizeLocalDocuments(data.documents),
      documents_status: getLocalDocumentsStatus(data.documents),
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
    const updates = { ...data };
    if (updates.documents) {
      updates.documents = normalizeLocalDocuments(updates.documents);
      updates.documents_status = getLocalDocumentsStatus(updates.documents);
    }
    items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
    writeLocal(LOCAL_APPLICATIONS_KEY, items);
    return items[idx];
  }
}

export function exportApplicationsCSV() {
  const token = getToken();
  const url = `${API_BASE}/applications/export/csv`;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'applications.csv';
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.click();
      URL.revokeObjectURL(blobUrl);
    });
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
      installments: data.installments || buildLocalInstallments(data.amount || 0, data.installment_count || 1, data.due_date || ''),
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
    if (updates.installments) updates.status = getLocalPaymentStatus(updates.installments);
    if (updates.status === 'paid' && !updates.receipt_no && !items[idx].receipt_no) {
      updates.receipt_no = `RBMI-${Date.now().toString().slice(-6)}`;
    }
    items[idx] = { ...items[idx], ...updates };
    writeLocal(LOCAL_PAYMENTS_KEY, items);
    return items[idx];
  }
}

// ---- MARKETING / COMMUNICATIONS ----
export async function fetchMarketingOverview() {
  return request('/marketing/overview');
}

export async function fetchMarketingCampaigns() {
  return request('/marketing/campaigns');
}

export async function createMarketingCampaign(data) {
  return request('/marketing/campaigns', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMarketingCampaign(id, data) {
  return request(`/marketing/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function launchMarketingCampaign(id) {
  return request(`/marketing/campaigns/${id}/launch`, { method: 'POST' });
}

export async function fetchCommunicationTemplates() {
  return request('/marketing/templates');
}

export async function createCommunicationTemplate(data) {
  return request('/marketing/templates', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCommunicationTemplate(id, data) {
  return request(`/marketing/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function fetchCommunicationIntegrations() {
  return request('/marketing/integrations');
}

export async function saveCommunicationIntegrations(data) {
  return request('/marketing/integrations', { method: 'PUT', body: JSON.stringify(data) });
}

export async function fetchCallLogs() {
  return request('/marketing/call-logs');
}

export async function createCallLog(data) {
  return request('/marketing/call-logs', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchFollowUps() {
  return request('/marketing/followups');
}

export async function createFollowUp(data) {
  return request('/marketing/followups', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchBroadcasts() {
  return request('/marketing/broadcasts');
}

export async function createBroadcast(data) {
  return request('/marketing/broadcasts', { method: 'POST', body: JSON.stringify(data) });
}

export async function sendBroadcast(id) {
  return request(`/marketing/broadcasts/${id}/send`, { method: 'POST' });
}

export async function fetchStudentInbox() {
  return request('/marketing/inbox');
}

export async function createStudentInboxMessage(data) {
  return request('/marketing/inbox', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateStudentInboxMessage(id, data) {
  return request(`/marketing/inbox/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function fetchChatThreads() {
  return request('/marketing/chats');
}

export async function createChatThread(data = {}) {
  return request('/marketing/chats', { method: 'POST', body: JSON.stringify(data) });
}

export async function sendChatMessage(threadId, data) {
  return request(`/marketing/chats/${threadId}/messages`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchNotifications() {
  return request('/marketing/notifications');
}

export async function createNotification(data) {
  return request('/marketing/notifications', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateNotification(id, data) {
  return request(`/marketing/notifications/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function fetchInboundLogs() {
  return request('/marketing/inbound-logs');
}

export async function fetchPublishers() {
  return request('/marketing/publishers');
}

export function exportPaymentsCSV() {
  const token = getToken();
  const url = `${API_BASE}/payments/export/csv`;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'payments.csv';
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.click();
      URL.revokeObjectURL(blobUrl);
    });
}

// ---- FILE UPLOAD ----
export async function uploadFile(file, metadata = {}) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(metadata).forEach(([key, value]) => {
    if (value) formData.append(key, value);
  });
  
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
      // Note: No Content-Type — browser auto-sets multipart boundary
    },
    body: formData
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'File upload failed');
  }
  return res.json();
}

// ---- FORM TEMPLATES (FormDesk) ----
export async function fetchFormTemplates() {
  return request('/form-templates');
}

export async function createFormTemplate(data) {
  return request('/form-templates', { method: 'POST', body: JSON.stringify(data) });
}

// ---- CAMPAIGNS ----
export async function fetchCampaigns() {
  return request('/campaigns');
}

export async function createCampaign(data) {
  return request('/campaigns', { method: 'POST', body: JSON.stringify(data) });
}

// ---- AI ----
export async function chatWithAI(history) {
  return request('/ai/chat', { method: 'POST', body: JSON.stringify({ history }) });
}
