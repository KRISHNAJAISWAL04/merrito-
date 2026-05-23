import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateId, getDB, saveDB, seedIfEmpty } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load env from project root and override preloaded values from other cwd/shell contexts.
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
export const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const REAL_DATA_MODE = process.env.REAL_DATA_MODE === 'true' || process.env.USE_DEMO_DATA === 'false';

if (!USE_SUPABASE) {
  console.warn('Supabase credentials missing. Using local JSON database fallback.');
  seedIfEmpty();
} else if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'Supabase: server using anon key. If Row Level Security blocks reads/writes, set SUPABASE_SERVICE_ROLE_KEY in .env (server-only, never expose to the browser).'
  );
}

const supabase = USE_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;

/** Server-side Supabase client (service role preferred). */
export function getServerSupabase() {
  return supabase;
}

function sortByDateDesc(items, key = 'created_at') {
  return [...items].sort((a, b) => new Date(b[key] || 0) - new Date(a[key] || 0));
}

function nowIso() {
  return new Date().toISOString();
}

function hasAnyLocalData(key) {
  const db = getDB();
  return Array.isArray(db[key]) && db[key].length > 0;
}

function localCollection(key, sortKey = 'created_at', limit = null) {
  const db = getDB();
  const rows = Array.isArray(db[key]) ? db[key] : [];
  const sorted = sortByDateDesc(rows, sortKey);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

// ===== LEADS =====
export async function getLeads(filters = {}) {
  if (USE_SUPABASE) {
    let query = supabase.from('leads').select('*');

    if (filters.stage) query = query.eq('stage', filters.stage);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.counselor_id) query = query.eq('counselor_id', filters.counselor_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    // debug log: show server-side fetched lead count for troubleshooting
    try { console.log('SUPABASE_GET_LEADS ->', Array.isArray(data) ? data.length : 'no-data', 'filters=', filters); } catch (e) {}
    return data || [];
  }

  const db = getDB();
  let leads = db.leads || [];
  if (filters.stage) leads = leads.filter(l => l.stage === filters.stage);
  if (filters.source) leads = leads.filter(l => l.source === filters.source);
  if (filters.counselor_id) leads = leads.filter(l => l.counselor_id === filters.counselor_id);
  return sortByDateDesc(leads, 'created_at');
}

export async function getLead(id) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
    if (error) throw error;
    if ((data || []).length > 0 || !hasAnyLocalData('leads')) return data || [];
  }

  const db = getDB();
  return (db.leads || []).find(l => l.id === id) || null;
}

export async function createLead(leadData) {
  const id = generateId();
  if (USE_SUPABASE) {
    const now = nowIso();
    const { data, error } = await supabase
      .from('leads')
      .insert([{ id, ...leadData, created_at: now, updated_at: now }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const db = getDB();
  const now = nowIso();
  const lead = {
    id,
    ...leadData,
    created_at: now,
    updated_at: now
  };
  db.leads = [lead, ...(db.leads || [])];
  return lead;
}

export async function updateLead(id, leadData) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('leads')
      .update({ ...leadData, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const db = getDB();
  const idx = (db.leads || []).findIndex(l => l.id === id);
  if (idx === -1) throw new Error('Lead not found');
  db.leads[idx] = { ...db.leads[idx], ...leadData, updated_at: nowIso() };
  saveDB(db);
  return db.leads[idx];
}

export async function deleteLead(id) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  const db = getDB();
  const before = (db.leads || []).length;
  db.leads = (db.leads || []).filter(l => l.id !== id);
  if (db.leads.length === before) throw new Error('Lead not found');
  saveDB(db);
  return true;
}

// ===== COUNSELORS =====
export async function getCounselors() {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('counselors')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  const db = getDB();
  return sortByDateDesc(db.counselors || [], 'created_at');
}

export async function getCounselor(id) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('counselors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  const db = getDB();
  return (db.counselors || []).find(c => c.id === id) || null;
}

export async function createCounselor(row) {
  const now = nowIso();
  const counselor = {
    id: generateId(),
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || 'Counselor',
    department: row.department || 'General',
    branch: row.branch || null,
    rating: parseFloat(row.rating) || 4.0,
    created_at: now
  };
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('counselors').insert([counselor]).select().single();
    if (error) throw error;
    return data;
  }
  const db = getDB();
  if (!db.counselors) db.counselors = [];
  db.counselors.push(counselor);
  saveDB(db);
  return counselor;
}

export async function updateCounselor(id, updates) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('counselors').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const db = getDB();
  const idx = (db.counselors || []).findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Counselor not found');
  db.counselors[idx] = { ...db.counselors[idx], ...updates };
  saveDB(db);
  return db.counselors[idx];
}

export async function deleteCounselor(id) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('counselors').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  const db = getDB();
  const before = (db.counselors || []).length;
  db.counselors = (db.counselors || []).filter(c => c.id !== id);
  if (db.counselors.length === before) throw new Error('Counselor not found');
  saveDB(db);
  return true;
}

// ===== COURSES =====
export async function getCourses() {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  const db = getDB();
  return sortByDateDesc(db.courses || [], 'created_at');
}

export async function getCourse(id) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  const db = getDB();
  return (db.courses || []).find(c => c.id === id) || null;
}

export async function updateCourse(id, courseData) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('courses')
      .update(courseData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const db = getDB();
  const idx = (db.courses || []).findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Course not found');
  db.courses[idx] = { ...db.courses[idx], ...courseData };
  saveDB(db);
  return db.courses[idx];
}

export async function createCourse(row) {
  const now = nowIso();
  const course = {
    id: generateId(),
    name: row.name,
    code: row.code || '',
    department: row.department || '',
    duration: row.duration || '',
    total_seats: parseInt(row.total_seats, 10) || 0,
    filled_seats: parseInt(row.filled_seats, 10) || 0,
    fee: row.fee || '',
    status: row.status || 'Active',
    branch: row.branch || null,
    created_at: now
  };
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('courses').insert([course]).select().single();
    if (error) throw error;
    return data;
  }
  const db = getDB();
  if (!db.courses) db.courses = [];
  db.courses.push(course);
  saveDB(db);
  return course;
}

export async function deleteCourse(id) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  const db = getDB();
  const before = (db.courses || []).length;
  db.courses = (db.courses || []).filter(c => c.id !== id);
  if (db.courses.length === before) throw new Error('Course not found');
  saveDB(db);
  return true;
}

// ===== ACTIVITIES =====
export async function getActivities(limit = 10) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  const db = getDB();
  return sortByDateDesc(db.activities || [], 'created_at').slice(0, limit);
}

export async function createActivity(activityData) {
  if (USE_SUPABASE) {
    const payload = {
      id: generateId(),
      ...activityData,
      lead_id: activityData.lead_id ?? null,
      message: activityData.message || activityData.description || '',
      created_at: nowIso()
    };
    const { data, error } = await supabase
      .from('activities')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const db = getDB();
  const activity = {
    id: generateId(),
    type: activityData.type || 'note',
    ...activityData,
    message: activityData.message || activityData.description || '',
    created_at: nowIso()
  };
  db.activities = [activity, ...(db.activities || [])];
  saveDB(db);
  return activity;
}

// ===== TASKS / FOLLOW-UPS =====
export async function getTasks(filters = {}) {
  if (USE_SUPABASE) {
    let query = supabase.from('tasks').select('*');
    if (filters.lead_id) query = query.eq('lead_id', filters.lead_id);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  const db = getDB();
  let tasks = db.tasks || [];
  if (filters.lead_id) tasks = tasks.filter(t => t.lead_id === filters.lead_id);
  if (filters.status) tasks = tasks.filter(t => t.status === filters.status);
  return [...tasks].sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
}

export async function createTask(taskData) {
  const now = nowIso();
  const task = {
    id: generateId(),
    title: taskData.title,
    lead_id: taskData.lead_id,
    due_date: taskData.due_date,
    type: taskData.type || 'call',
    status: taskData.status || 'pending',
    notes: taskData.notes || '',
    created_at: now,
    updated_at: now
  };

  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('tasks').insert([task]).select().single();
    if (error) throw error;
    return data;
  }

  const db = getDB();
  db.tasks = [task, ...(db.tasks || [])];
  saveDB(db);
  return task;
}

export async function updateTask(id, updates) {
  const payload = { ...updates, updated_at: nowIso() };

  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('tasks').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  const db = getDB();
  const idx = (db.tasks || []).findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Task not found');
  db.tasks[idx] = { ...db.tasks[idx], ...payload };
  saveDB(db);
  return db.tasks[idx];
}

export async function deleteTask(id) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  const db = getDB();
  const before = (db.tasks || []).length;
  db.tasks = (db.tasks || []).filter(t => t.id !== id);
  if (db.tasks.length === before) throw new Error('Task not found');
  saveDB(db);
  return true;
}
