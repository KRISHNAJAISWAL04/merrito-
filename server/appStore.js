// ===== Application data: JSON fallback or Supabase =====
import {
  USE_SUPABASE,
  getServerSupabase,
  createActivity,
  getCourse,
  getCourses
} from './supabase.js';
import { getDB, saveDB, generateId } from './db.js';

function sb() {
  const c = getServerSupabase();
  if (!c) throw new Error('Supabase not configured');
  return c;
}

function nowIso() {
  return new Date().toISOString();
}

function jsonEnsureAdmissions() {
  const dbData = getDB();
  if (!dbData.applications) dbData.applications = [];
  if (!dbData.queries) dbData.queries = [];
  if (!dbData.payments) dbData.payments = [];
  if (!dbData.portalProfiles) dbData.portalProfiles = {};
  if (!dbData.settings) dbData.settings = null;
  if (!dbData.form_templates) dbData.form_templates = [];
  if (!dbData.campaigns) dbData.campaigns = [];

  if (!dbData.applications.some(a => a.user_id === 'u004-student-demo')) {
    dbData.applications.push({
      id: 'app-demo-aarav',
      user_id: 'u004-student-demo',
      student_name: 'Aarav Mehta',
      email: 'student@demo.in',
      course_id: 'cr001-mba',
      status: 'submitted',
      documents_status: 'pending',
      counselor_name: 'Priya Sharma',
      priority: 'high',
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }
  if (!dbData.queries.some(q => q.user_id === 'u004-student-demo')) {
    dbData.queries.push({
      id: 'qry-demo-aarav',
      user_id: 'u004-student-demo',
      student_name: 'Aarav Mehta',
      subject: 'Document upload help',
      category: 'Documents',
      status: 'open',
      priority: 'medium',
      message: 'Need help uploading Class 12 marksheet.',
      response: '',
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }
  if (!dbData.payments.some(p => p.user_id === 'u004-student-demo')) {
    dbData.payments.push({
      id: 'pay-demo-aarav',
      user_id: 'u004-student-demo',
      student_name: 'Aarav Mehta',
      title: 'Admission confirmation fee',
      amount: 25000,
      status: 'due',
      method: 'Online',
      due_date: '2026-05-15',
      receipt_no: '',
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }
  saveDB(dbData);
  return dbData;
}

export function getDefaultSettings() {
  return {
    institute_name: 'Ram Babu Mahavidyalaya Institute (RBMI)',
    short_name: 'RBMI',
    email: 'admissions@rbmi.edu.in',
    phone: '+91 581 250 0000',
    address: 'Pilibhit Bypass Road, Bareilly, Uttar Pradesh - 243006',
    website: 'https://www.rbmi.edu.in',
    academic_year: '2025-2026',
    city: 'Bareilly',
    state: 'Uttar Pradesh'
  };
}

export async function loadSettings() {
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('institute_settings').select('data').eq('id', 'main').maybeSingle();
    if (error) throw error;
    const base = getDefaultSettings();
    return { ...base, ...(data?.data || {}) };
  }
  const dbData = getDB();
  return { ...getDefaultSettings(), ...(dbData.settings || {}) };
}

export async function storeSettings(partial) {
  const merged = { ...(await loadSettings()), ...partial };
  if (USE_SUPABASE) {
    const { error } = await sb().from('institute_settings').upsert({
      id: 'main',
      data: merged,
      updated_at: nowIso()
    });
    if (error) throw error;
    return merged;
  }
  const dbData = getDB();
  dbData.settings = merged;
  saveDB(dbData);
  return merged;
}

export async function getPortalProfileForUser(user) {
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('portal_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (data) return data;
    const profile = {
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone: '',
      city: '',
      course_id: null,
      stage: 'enquiry',
      counselor_name: 'Admissions team',
      readiness: 35,
      next_step: 'Complete your profile',
      fee_due: '0',
      scholarship: 'Not reviewed yet',
      branch: user.branch || 'bareilly',
      updated_at: nowIso()
    };
    const { error: insErr } = await sb().from('portal_profiles').insert([profile]);
    if (insErr) throw insErr;
    return profile;
  }

  const dbData = getDB();
  jsonEnsureAdmissions();
  if (!dbData.portalProfiles) dbData.portalProfiles = {};
  let profile = dbData.portalProfiles[user.id];
  if (!profile) {
    profile = {
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone: '',
      city: '',
      course_id: null,
      stage: 'enquiry',
      counselor_name: 'Admissions team',
      readiness: 35,
      next_step: 'Complete your profile',
      fee_due: '0',
      scholarship: 'Not reviewed yet',
      branch: user.branch || 'bareilly',
      updated_at: nowIso()
    };
    dbData.portalProfiles[user.id] = profile;
    saveDB(dbData);
  }
  return profile;
}

export async function updatePortalProfile(user, body) {
  const current = await getPortalProfileForUser(user);
  const allowed = ['name', 'phone', 'city', 'course_id', 'next_step', 'scholarship', 'stage'];
  const updates = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
  }
  const next = { ...current, ...updates, updated_at: nowIso() };

  if (USE_SUPABASE) {
    const { error } = await sb().from('portal_profiles').upsert(next, { onConflict: 'user_id' });
    if (error) throw error;
  } else {
    const dbData = getDB();
    if (!dbData.portalProfiles) dbData.portalProfiles = {};
    dbData.portalProfiles[user.id] = next;
    saveDB(dbData);
  }

  let actionDesc = 'updated profile';
  if (body.next_step) {
    if (body.next_step.toLowerCase().includes('callback')) actionDesc = 'requested a callback';
    else if (body.next_step.toLowerCase().includes('application')) actionDesc = 'requested a new application';
    else actionDesc = `updated status to "${body.next_step}"`;
  }

  await createActivity({
    user_id: user.id,
    type: 'student_portal',
    message: `${next.name || user.name} ${actionDesc}`
  });

  const course = next.course_id ? await getCourse(next.course_id) : null;
  return { ...next, course_name: course?.name || 'Program not selected' };
}

function enrichApplication(item, courses) {
  const course = courses.find(c => c.id === item.course_id);
  return { ...item, course_name: course?.name || 'Program not selected' };
}

export async function listApplications(reqUser) {
  const courses = await getCourses();
  if (USE_SUPABASE) {
    let q = sb().from('applications').select('*').order('updated_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    let items = data || [];
    if (reqUser.role === 'student') items = items.filter(item => item.user_id === reqUser.id);
    return items.map(item => enrichApplication(item, courses));
  }
  const dbData = jsonEnsureAdmissions();
  let items = dbData.applications || [];
  if (reqUser.role === 'student') items = items.filter(item => item.user_id === reqUser.id);
  return items.map(item => enrichApplication(item, courses)).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function insertApplication(reqUser, body) {
  const profile = reqUser.role === 'student' ? await getPortalProfileForUser(reqUser) : null;
  const item = {
    id: generateId(),
    user_id: reqUser.role === 'student' ? reqUser.id : body.user_id || null,
    student_name: body.student_name || profile?.name || reqUser.name,
    email: body.email || profile?.email || reqUser.email,
    course_id: body.course_id || profile?.course_id || null,
    status: body.status || 'submitted',
    documents_status: body.documents_status || 'pending',
    counselor_name: body.counselor_name || profile?.counselor_name || 'Admissions team',
    priority: body.priority || 'medium',
    created_at: nowIso(),
    updated_at: nowIso()
  };

  if (USE_SUPABASE) {
    const { data, error } = await sb().from('applications').insert([item]).select().single();
    if (error) throw error;
    const courses = await getCourses();
    return enrichApplication(data, courses);
  }
  const dbData = jsonEnsureAdmissions();
  dbData.applications.unshift(item);
  saveDB(dbData);
  const courses = await getCourses();
  return enrichApplication(item, courses);
}

export async function patchApplication(reqUser, id, body) {
  if (USE_SUPABASE) {
    const { data: row, error: fe } = await sb().from('applications').select('*').eq('id', id).single();
    if (fe || !row) throw new Error('Application not found');
    if (reqUser.role === 'student' && row.user_id !== reqUser.id) throw new Error('Access denied');
    const allowed = reqUser.role === 'student' ? ['documents_status'] : ['status', 'documents_status', 'counselor_name', 'priority'];
    const updates = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
    const { data, error } = await sb()
      .from('applications')
      .update({ ...updates, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    const courses = await getCourses();
    return enrichApplication(data, courses);
  }

  const dbData = jsonEnsureAdmissions();
  const idx = dbData.applications.findIndex(item => item.id === id);
  if (idx === -1) throw new Error('Application not found');
  const item = dbData.applications[idx];
  if (reqUser.role === 'student' && item.user_id !== reqUser.id) throw new Error('Access denied');
  const allowed = reqUser.role === 'student' ? ['documents_status'] : ['status', 'documents_status', 'counselor_name', 'priority'];
  const updates = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
  dbData.applications[idx] = { ...item, ...updates, updated_at: nowIso() };
  saveDB(dbData);
  const courses = await getCourses();
  return enrichApplication(dbData.applications[idx], courses);
}

export async function listQueries(reqUser) {
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('queries').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    let items = data || [];
    if (reqUser.role === 'student') items = items.filter(item => item.user_id === reqUser.id);
    return items;
  }
  const dbData = jsonEnsureAdmissions();
  let items = dbData.queries || [];
  if (reqUser.role === 'student') items = items.filter(item => item.user_id === reqUser.id);
  return items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function insertQuery(reqUser, body) {
  const item = {
    id: generateId(),
    user_id: reqUser.role === 'student' ? reqUser.id : body.user_id || null,
    student_name: body.student_name || reqUser.name,
    subject: body.subject || 'Admission query',
    category: body.category || 'General',
    status: 'open',
    priority: body.priority || 'medium',
    message: body.message || '',
    response: '',
    created_at: nowIso(),
    updated_at: nowIso()
  };
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('queries').insert([item]).select().single();
    if (error) throw error;
    return data;
  }
  const dbData = jsonEnsureAdmissions();
  dbData.queries.unshift(item);
  saveDB(dbData);
  return item;
}

export async function patchQuery(reqUser, id, body) {
  if (USE_SUPABASE) {
    const { data: row, error: fe } = await sb().from('queries').select('*').eq('id', id).single();
    if (fe || !row) throw new Error('Query not found');
    if (reqUser.role === 'student' && row.user_id !== reqUser.id) throw new Error('Access denied');
    const allowed = reqUser.role === 'student' ? ['message'] : ['status', 'priority', 'response'];
    const updates = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
    const { data, error } = await sb()
      .from('queries')
      .update({ ...updates, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const dbData = jsonEnsureAdmissions();
  const idx = dbData.queries.findIndex(item => item.id === id);
  if (idx === -1) throw new Error('Query not found');
  const item = dbData.queries[idx];
  if (reqUser.role === 'student' && item.user_id !== reqUser.id) throw new Error('Access denied');
  const allowed = reqUser.role === 'student' ? ['message'] : ['status', 'priority', 'response'];
  const updates = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
  dbData.queries[idx] = { ...item, ...updates, updated_at: nowIso() };
  saveDB(dbData);
  return dbData.queries[idx];
}

export async function listPayments(reqUser) {
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('payments').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    let items = data || [];
    if (reqUser.role === 'student') items = items.filter(item => item.user_id === reqUser.id);
    return items;
  }
  const dbData = jsonEnsureAdmissions();
  let items = dbData.payments || [];
  if (reqUser.role === 'student') items = items.filter(item => item.user_id === reqUser.id);
  return items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function insertPayment(reqUser, body) {
  const item = {
    id: generateId(),
    user_id: body.user_id || null,
    student_name: body.student_name || 'Student',
    title: body.title || 'Admission fee',
    amount: Number(body.amount || 0),
    status: body.status || 'due',
    method: body.method || 'Online',
    due_date: body.due_date || '',
    receipt_no: body.receipt_no || '',
    created_at: nowIso(),
    updated_at: nowIso()
  };
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('payments').insert([item]).select().single();
    if (error) throw error;
    return data;
  }
  const dbData = jsonEnsureAdmissions();
  dbData.payments.unshift(item);
  saveDB(dbData);
  return item;
}

export async function patchPayment(reqUser, id, body) {
  if (USE_SUPABASE) {
    const { data: row, error: fe } = await sb().from('payments').select('*').eq('id', id).single();
    if (fe || !row) throw new Error('Payment not found');
    if (reqUser.role === 'student' && row.user_id !== reqUser.id) throw new Error('Access denied');
    const allowed = reqUser.role === 'student' ? ['status', 'method'] : ['status', 'method', 'receipt_no', 'amount', 'due_date', 'title'];
    const updates = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
    if (updates.status === 'paid' && !updates.receipt_no && !row.receipt_no) {
      updates.receipt_no = `RBMI-${Date.now().toString().slice(-6)}`;
    }
    const { data, error } = await sb()
      .from('payments')
      .update({ ...updates, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const dbData = jsonEnsureAdmissions();
  const idx = dbData.payments.findIndex(item => item.id === id);
  if (idx === -1) throw new Error('Payment not found');
  const item = dbData.payments[idx];
  if (reqUser.role === 'student' && item.user_id !== reqUser.id) throw new Error('Access denied');
  const allowed = reqUser.role === 'student' ? ['status', 'method'] : ['status', 'method', 'receipt_no', 'amount', 'due_date', 'title'];
  const updates = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
  if (updates.status === 'paid' && !updates.receipt_no && !item.receipt_no) {
    updates.receipt_no = `RBMI-${Date.now().toString().slice(-6)}`;
  }
  dbData.payments[idx] = { ...item, ...updates, updated_at: nowIso() };
  saveDB(dbData);
  return dbData.payments[idx];
}

export async function listFormTemplates() {
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('form_templates').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  const dbData = jsonEnsureAdmissions();
  return [...(dbData.form_templates || [])].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function insertFormTemplate(body) {
  const row = {
    id: generateId(),
    name: body.name || 'Untitled form',
    purpose: body.purpose || 'Lead capture',
    status: body.status || 'draft',
    branch: body.branch || '',
    created_at: nowIso(),
    updated_at: nowIso()
  };
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('form_templates').insert([row]).select().single();
    if (error) throw error;
    return data;
  }
  const dbData = jsonEnsureAdmissions();
  dbData.form_templates.unshift(row);
  saveDB(dbData);
  return row;
}

export async function listCampaigns() {
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('campaigns').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  const dbData = jsonEnsureAdmissions();
  return [...(dbData.campaigns || [])].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function insertCampaign(body) {
  const row = {
    id: generateId(),
    name: body.name || 'Untitled campaign',
    channel: body.channel || 'Other',
    status: body.status || 'draft',
    budget: body.budget || '',
    notes: body.notes || '',
    created_at: nowIso(),
    updated_at: nowIso()
  };
  if (USE_SUPABASE) {
    const { data, error } = await sb().from('campaigns').insert([row]).select().single();
    if (error) throw error;
    return data;
  }
  const dbData = jsonEnsureAdmissions();
  dbData.campaigns.unshift(row);
  saveDB(dbData);
  return row;
}
