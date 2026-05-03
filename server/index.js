// ===== EXPRESS API SERVER — RBMI CRM =====
import express from 'express';
import cors from 'cors';
import * as db from './supabase.js';
import { loginUser, seedUsers, getUsers, createUser, updateUser, deleteUser, requireAuth, requireAdmin } from './auth.js';
import { getDB, saveDB, generateId } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.post('/api/health', (req, res) => res.json({ ok: true, body: req.body }));

// Seed users on startup
seedUsers();

// ============================================================
//  AUTH
// ============================================================

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = loginUser(email, password);
    if (!result) return res.status(401).json({ error: 'Invalid email or password' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// ============================================================
//  LEADS
// ============================================================

app.get('/api/leads', requireAuth, async (req, res) => {
  try {
    const { stage, source, counselor_id, search, sort, order, page, limit } = req.query;

    // Counselors can only see their own leads
    const filterCounselorId = req.user.role === 'counselor' ? req.user.counselor_id : counselor_id;

    let leads = await db.getLeads({ stage, source, counselor_id: filterCounselorId });

    if (search) {
      const q = search.toLowerCase();
      const courses = await db.getCourses();
      const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));
      leads = leads.filter(l =>
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (courseMap[l.course_id]?.name || '').toLowerCase().includes(q) ||
        (l.city && l.city.toLowerCase().includes(q))
      );
    }

    const sortField = sort || 'created_at';
    const sortOrder = order === 'asc' ? 1 : -1;
    leads.sort((a, b) => {
      let av = a[sortField] || '', bv = b[sortField] || '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return av < bv ? -sortOrder : av > bv ? sortOrder : 0;
    });

    const total = leads.length;
    const pg = parseInt(page) || 1;
    const lim = parseInt(limit) || 12;
    const start = (pg - 1) * lim;
    const paged = leads.slice(start, start + lim);

    const counselors = await db.getCounselors();
    const courses = await db.getCourses();
    const counselorMap = Object.fromEntries(counselors.map(c => [c.id, c]));
    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

    const enriched = paged.map(l => ({
      ...l,
      name: `${l.first_name} ${l.last_name}`,
      counselor_name: counselorMap[l.counselor_id]?.name || 'Unassigned',
      course_name: courseMap[l.course_id]?.name || 'N/A'
    }));

    res.json({ data: enriched, total, page: pg, totalPages: Math.ceil(total / lim) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leads/export/csv', requireAuth, async (req, res) => {
  try {
    const filterCounselorId = req.user.role === 'counselor' ? req.user.counselor_id : undefined;
    const leads = await db.getLeads({ counselor_id: filterCounselorId });
    const counselors = await db.getCounselors();
    const courses = await db.getCourses();
    const counselorMap = Object.fromEntries(counselors.map(c => [c.id, c]));
    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

    const headers = ['Name', 'Email', 'Phone', 'City', 'Course', 'Source', 'Stage', 'Priority', 'Counselor', 'Date'];
    const rows = leads.map(l => [
      `${l.first_name} ${l.last_name}`,
      l.email, l.phone, l.city || '',
      courseMap[l.course_id]?.name || '',
      l.source, l.stage, l.priority,
      counselorMap[l.counselor_id]?.name || 'Unassigned',
      new Date(l.created_at).toLocaleDateString('en-IN')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rbmi-leads.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leads/:id', requireAuth, async (req, res) => {
  try {
    const lead = await db.getLead(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Counselors can only view their own leads
    if (req.user.role === 'counselor' && lead.counselor_id !== req.user.counselor_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const counselor = await db.getCounselor(lead.counselor_id);
    const course = lead.course_id ? await db.getCourse(lead.course_id) : null;

    res.json({
      ...lead,
      name: `${lead.first_name} ${lead.last_name}`,
      counselor_name: counselor?.name || 'Unassigned',
      course_name: course?.name || 'N/A'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leads', requireAuth, async (req, res) => {
  try {
    const lead = await db.createLead({
      first_name: req.body.first_name || '',
      last_name: req.body.last_name || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      course_id: req.body.course_id || null,
      source: req.body.source || 'Website',
      stage: req.body.stage || 'enquiry',
      counselor_id: req.body.counselor_id || null,
      priority: req.body.priority || 'medium',
      city: req.body.city || '',
      notes: req.body.notes || ''
    });

    await db.createActivity({
      lead_id: lead.id,
      type: 'lead_added',
      message: `New lead ${lead.first_name} ${lead.last_name} added via ${lead.source}`
    });

    const counselor = lead.counselor_id ? await db.getCounselor(lead.counselor_id) : null;
    const course = lead.course_id ? await db.getCourse(lead.course_id) : null;

    res.status(201).json({
      ...lead,
      name: `${lead.first_name} ${lead.last_name}`,
      counselor_name: counselor?.name || 'Unassigned',
      course_name: course?.name || 'N/A'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/leads/:id', requireAuth, async (req, res) => {
  try {
    const old = await db.getLead(req.params.id);
    if (!old) return res.status(404).json({ error: 'Lead not found' });

    if (req.user.role === 'counselor' && old.counselor_id !== req.user.counselor_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await db.updateLead(req.params.id, req.body);

    if (req.body.stage && req.body.stage !== old.stage) {
      const stageLabels = {
        enquiry: 'Enquiry', counseling_scheduled: 'Counseling Scheduled',
        counseling_done: 'Counseling Done', application_submitted: 'Application Submitted',
        documents_verified: 'Documents Verified', admitted: 'Admitted', enrolled: 'Enrolled'
      };
      await db.createActivity({
        lead_id: updated.id,
        type: 'stage_change',
        message: `${updated.first_name} ${updated.last_name} moved to ${stageLabels[updated.stage] || updated.stage}`
      });
    }

    const counselor = updated.counselor_id ? await db.getCounselor(updated.counselor_id) : null;
    const course = updated.course_id ? await db.getCourse(updated.course_id) : null;

    res.json({
      ...updated,
      name: `${updated.first_name} ${updated.last_name}`,
      counselor_name: counselor?.name || 'Unassigned',
      course_name: course?.name || 'N/A'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/leads/:id', requireAdmin, async (req, res) => {
  try {
    await db.deleteLead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete
app.post('/api/leads/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    for (const id of ids) await db.deleteLead(id);
    res.json({ success: true, deleted: ids.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  WEBHOOK — Lead Capture (for n8n, website forms, etc.)
// ============================================================

app.post('/api/webhook/lead', async (req, res) => {
  try {
    const {
      first_name, last_name, name, email, phone,
      course, course_id, source, city, notes, priority
    } = req.body;

    // Support both "name" and "first_name/last_name"
    let fname = first_name || '';
    let lname = last_name || '';
    if (!fname && name) {
      const parts = name.trim().split(' ');
      fname = parts[0];
      lname = parts.slice(1).join(' ');
    }

    if (!fname || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    // Find course by name if course_id not provided
    let resolvedCourseId = course_id || null;
    if (!resolvedCourseId && course) {
      const courses = await db.getCourses();
      const found = courses.find(c => c.name.toLowerCase().includes(course.toLowerCase()) || c.code.toLowerCase() === course.toLowerCase());
      if (found) resolvedCourseId = found.id;
    }

    const lead = await db.createLead({
      first_name: fname,
      last_name: lname,
      email: email || '',
      phone: phone || '',
      course_id: resolvedCourseId,
      source: source || 'Website',
      stage: 'enquiry',
      counselor_id: null,
      priority: priority || 'medium',
      city: city || '',
      notes: notes || ''
    });

    await db.createActivity({
      lead_id: lead.id,
      type: 'lead_added',
      message: `New lead ${fname} ${lname} captured via webhook (${source || 'Website'})`
    });

    res.status(201).json({ success: true, lead_id: lead.id, message: 'Lead captured successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  DASHBOARD STATS
// ============================================================

app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const filterCounselorId = req.user.role === 'counselor' ? req.user.counselor_id : undefined;
    const leads = await db.getLeads({ counselor_id: filterCounselorId });
    const counselors = await db.getCounselors();

    const totalLeads = leads.length;
    const activeApplications = leads.filter(l => ['application_submitted', 'documents_verified'].includes(l.stage)).length;
    const admissions = leads.filter(l => l.stage === 'admitted' || l.stage === 'enrolled').length;
    const conversionRate = totalLeads > 0 ? ((admissions / totalLeads) * 100).toFixed(1) : '0';

    const stageDistribution = {};
    leads.forEach(l => { stageDistribution[l.stage] = (stageDistribution[l.stage] || 0) + 1; });

    const sourceDistribution = {};
    leads.forEach(l => { sourceDistribution[l.source] = (sourceDistribution[l.source] || 0) + 1; });

    const priorityDistribution = { high: 0, medium: 0, low: 0 };
    leads.forEach(l => { if (priorityDistribution[l.priority] !== undefined) priorityDistribution[l.priority]++; });

    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), year: d.getFullYear(), month: d.getMonth() });
    }

    const monthlyEnquiries = months.map(m => leads.filter(l => { const d = new Date(l.created_at); return d.getFullYear() === m.year && d.getMonth() === m.month; }).length);
    const monthlyAdmissions = months.map(m => leads.filter(l => { const d = new Date(l.updated_at); return d.getFullYear() === m.year && d.getMonth() === m.month && (l.stage === 'admitted' || l.stage === 'enrolled'); }).length);
    const monthlyEnrollments = months.map(m => leads.filter(l => { const d = new Date(l.updated_at); return d.getFullYear() === m.year && d.getMonth() === m.month && l.stage === 'enrolled'; }).length);

    const counselorStats = counselors.map(c => {
      const assigned = leads.filter(l => l.counselor_id === c.id).length;
      const converted = leads.filter(l => l.counselor_id === c.id && (l.stage === 'admitted' || l.stage === 'enrolled')).length;
      return { ...c, leads_assigned: assigned, conversions: converted, active_leads: leads.filter(l => l.counselor_id === c.id && !['admitted', 'enrolled'].includes(l.stage)).length };
    });

    res.json({
      totalLeads, activeApplications, admissions,
      conversionRate: parseFloat(conversionRate),
      stageDistribution, sourceDistribution, priorityDistribution,
      monthly: { labels: months.map(m => m.label), enquiries: monthlyEnquiries, admissions: monthlyAdmissions, enrollments: monthlyEnrollments },
      counselorStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  COUNSELORS (full CRUD)
// ============================================================

app.get('/api/counselors', requireAuth, async (req, res) => {
  try {
    const counselors = await db.getCounselors();
    const leads = await db.getLeads({});
    const enriched = counselors.map(c => {
      const assigned = leads.filter(l => l.counselor_id === c.id).length;
      const converted = leads.filter(l => l.counselor_id === c.id && (l.stage === 'admitted' || l.stage === 'enrolled')).length;
      const active = leads.filter(l => l.counselor_id === c.id && !['admitted', 'enrolled'].includes(l.stage)).length;
      return { ...c, leads_assigned: assigned, conversions: converted, active_leads: active };
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/counselors/:id', requireAuth, async (req, res) => {
  try {
    const counselor = await db.getCounselor(req.params.id);
    if (!counselor) return res.status(404).json({ error: 'Counselor not found' });
    res.json(counselor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/counselors', requireAdmin, async (req, res) => {
  try {
    const dbData = getDB();
    if (!dbData.counselors) dbData.counselors = [];
    const counselor = {
      id: generateId(),
      name: req.body.name,
      email: req.body.email || '',
      phone: req.body.phone || '',
      role: req.body.role || 'Counselor',
      department: req.body.department || 'General',
      rating: parseFloat(req.body.rating) || 4.0,
      created_at: new Date().toISOString()
    };
    dbData.counselors.push(counselor);
    saveDB(dbData);
    res.status(201).json(counselor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/counselors/:id', requireAdmin, async (req, res) => {
  try {
    const dbData = getDB();
    const idx = (dbData.counselors || []).findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Counselor not found' });
    dbData.counselors[idx] = { ...dbData.counselors[idx], ...req.body };
    saveDB(dbData);
    res.json(dbData.counselors[idx]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/counselors/:id', requireAdmin, async (req, res) => {
  try {
    const dbData = getDB();
    dbData.counselors = (dbData.counselors || []).filter(c => c.id !== req.params.id);
    saveDB(dbData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  COURSES (full CRUD)
// ============================================================

app.get('/api/courses', requireAuth, async (req, res) => {
  try {
    const courses = await db.getCourses();
    const leads = await db.getLeads({});
    const enriched = courses.map(c => ({ ...c, lead_count: leads.filter(l => l.course_id === c.id).length }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/courses', requireAdmin, async (req, res) => {
  try {
    const dbData = getDB();
    if (!dbData.courses) dbData.courses = [];
    const course = {
      id: generateId(),
      name: req.body.name,
      code: req.body.code || '',
      department: req.body.department || '',
      duration: req.body.duration || '',
      total_seats: parseInt(req.body.total_seats) || 0,
      filled_seats: parseInt(req.body.filled_seats) || 0,
      fee: req.body.fee || '',
      status: req.body.status || 'Active',
      created_at: new Date().toISOString()
    };
    dbData.courses.push(course);
    saveDB(dbData);
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/courses/:id', requireAdmin, async (req, res) => {
  try {
    const course = await db.updateCourse(req.params.id, req.body);
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/courses/:id', requireAdmin, async (req, res) => {
  try {
    const dbData = getDB();
    dbData.courses = (dbData.courses || []).filter(c => c.id !== req.params.id);
    saveDB(dbData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  ACTIVITIES
// ============================================================

app.get('/api/activities', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = await db.getActivities(limit);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  PIPELINE
// ============================================================

app.get('/api/pipeline', requireAuth, async (req, res) => {
  try {
    const filterCounselorId = req.user.role === 'counselor' ? req.user.counselor_id : undefined;
    const leads = await db.getLeads({ counselor_id: filterCounselorId });
    const counselors = await db.getCounselors();
    const courses = await db.getCourses();

    const counselorMap = Object.fromEntries(counselors.map(c => [c.id, c]));
    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

    const stages = ['enquiry', 'counseling_scheduled', 'counseling_done', 'application_submitted', 'documents_verified', 'admitted', 'enrolled'];
    const pipeline = {};
    stages.forEach(stage => {
      pipeline[stage] = leads
        .filter(l => l.stage === stage)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .map(l => ({
          ...l,
          name: `${l.first_name} ${l.last_name}`,
          counselor_name: counselorMap[l.counselor_id]?.name || 'Unassigned',
          course_name: courseMap[l.course_id]?.name || 'N/A'
        }));
    });

    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  APPLICATIONS, QUERIES, PAYMENTS
// ============================================================

function ensureAdmissionsModules() {
  const dbData = getDB();
  if (!dbData.applications) dbData.applications = [];
  if (!dbData.queries) dbData.queries = [];
  if (!dbData.payments) dbData.payments = [];
  if (!dbData.applications.some(a => a.user_id === 'u004-student-demo')) {
    dbData.applications.push({ id: 'app-demo-aarav', user_id: 'u004-student-demo', student_name: 'Aarav Mehta', email: 'student@demo.in', course_id: 'cr001-mba', status: 'submitted', documents_status: 'pending', counselor_name: 'Priya Sharma', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  if (!dbData.queries.some(q => q.user_id === 'u004-student-demo')) {
    dbData.queries.push({ id: 'qry-demo-aarav', user_id: 'u004-student-demo', student_name: 'Aarav Mehta', subject: 'Document upload help', category: 'Documents', status: 'open', priority: 'medium', message: 'Need help uploading Class 12 marksheet.', response: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  if (!dbData.payments.some(p => p.user_id === 'u004-student-demo')) {
    dbData.payments.push({ id: 'pay-demo-aarav', user_id: 'u004-student-demo', student_name: 'Aarav Mehta', title: 'Admission confirmation fee', amount: 25000, status: 'due', method: 'Online', due_date: '2026-05-15', receipt_no: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  saveDB(dbData);
  return dbData;
}

function enrichApplication(item, courses) {
  const course = courses.find(c => c.id === item.course_id);
  return { ...item, course_name: course?.name || 'Program not selected' };
}

app.get('/api/applications', requireAuth, async (req, res) => {
  try {
    const dbData = ensureAdmissionsModules();
    const courses = await db.getCourses();
    let items = dbData.applications || [];
    if (req.user.role === 'student') items = items.filter(item => item.user_id === req.user.id);
    res.json(items.map(item => enrichApplication(item, courses)).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/applications', requireAuth, async (req, res) => {
  try {
    const dbData = ensureAdmissionsModules();
    const profile = req.user.role === 'student' ? getPortalProfileForUser(req.user) : null;
    const item = { id: generateId(), user_id: req.user.role === 'student' ? req.user.id : (req.body.user_id || null), student_name: req.body.student_name || profile?.name || req.user.name, email: req.body.email || profile?.email || req.user.email, course_id: req.body.course_id || profile?.course_id || null, status: req.body.status || 'submitted', documents_status: req.body.documents_status || 'pending', counselor_name: req.body.counselor_name || profile?.counselor_name || 'Admissions team', priority: req.body.priority || 'medium', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    dbData.applications.unshift(item); saveDB(dbData);
    const courses = await db.getCourses();
    res.status(201).json(enrichApplication(item, courses));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/applications/:id', requireAuth, async (req, res) => {
  try {
    const dbData = ensureAdmissionsModules();
    const idx = dbData.applications.findIndex(item => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Application not found' });
    const item = dbData.applications[idx];
    if (req.user.role === 'student' && item.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    const allowed = req.user.role === 'student' ? ['documents_status'] : ['status', 'documents_status', 'counselor_name', 'priority'];
    const updates = {}; for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key];
    dbData.applications[idx] = { ...item, ...updates, updated_at: new Date().toISOString() }; saveDB(dbData);
    const courses = await db.getCourses();
    res.json(enrichApplication(dbData.applications[idx], courses));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/queries', requireAuth, (req, res) => {
  try { const dbData = ensureAdmissionsModules(); let items = dbData.queries || []; if (req.user.role === 'student') items = items.filter(item => item.user_id === req.user.id); res.json(items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))); } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/queries', requireAuth, (req, res) => {
  try { const dbData = ensureAdmissionsModules(); const item = { id: generateId(), user_id: req.user.role === 'student' ? req.user.id : (req.body.user_id || null), student_name: req.body.student_name || req.user.name, subject: req.body.subject || 'Admission query', category: req.body.category || 'General', status: 'open', priority: req.body.priority || 'medium', message: req.body.message || '', response: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; dbData.queries.unshift(item); saveDB(dbData); res.status(201).json(item); } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/queries/:id', requireAuth, (req, res) => {
  try { const dbData = ensureAdmissionsModules(); const idx = dbData.queries.findIndex(item => item.id === req.params.id); if (idx === -1) return res.status(404).json({ error: 'Query not found' }); const item = dbData.queries[idx]; if (req.user.role === 'student' && item.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' }); const allowed = req.user.role === 'student' ? ['message'] : ['status', 'priority', 'response']; const updates = {}; for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key]; dbData.queries[idx] = { ...item, ...updates, updated_at: new Date().toISOString() }; saveDB(dbData); res.json(dbData.queries[idx]); } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/payments', requireAuth, (req, res) => {
  try { const dbData = ensureAdmissionsModules(); let items = dbData.payments || []; if (req.user.role === 'student') items = items.filter(item => item.user_id === req.user.id); res.json(items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))); } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/payments', requireAuth, (req, res) => {
  try { if (req.user.role === 'student') return res.status(403).json({ error: 'Admin or counselor access required' }); const dbData = ensureAdmissionsModules(); const item = { id: generateId(), user_id: req.body.user_id || null, student_name: req.body.student_name || 'Student', title: req.body.title || 'Admission fee', amount: Number(req.body.amount || 0), status: req.body.status || 'due', method: req.body.method || 'Online', due_date: req.body.due_date || '', receipt_no: req.body.receipt_no || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; dbData.payments.unshift(item); saveDB(dbData); res.status(201).json(item); } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/payments/:id', requireAuth, (req, res) => {
  try { const dbData = ensureAdmissionsModules(); const idx = dbData.payments.findIndex(item => item.id === req.params.id); if (idx === -1) return res.status(404).json({ error: 'Payment not found' }); const item = dbData.payments[idx]; if (req.user.role === 'student' && item.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' }); const allowed = req.user.role === 'student' ? ['status', 'method'] : ['status', 'method', 'receipt_no', 'amount', 'due_date', 'title']; const updates = {}; for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key]; if (updates.status === 'paid' && !updates.receipt_no && !item.receipt_no) updates.receipt_no = `RBMI-${Date.now().toString().slice(-6)}`; dbData.payments[idx] = { ...item, ...updates, updated_at: new Date().toISOString() }; saveDB(dbData); res.json(dbData.payments[idx]); } catch (error) { res.status(500).json({ error: error.message }); }
});
// ============================================================
//  STUDENT PORTAL
// ============================================================

function getPortalProfileForUser(user) {
  const dbData = getDB();
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
      updated_at: new Date().toISOString()
    };
    dbData.portalProfiles[user.id] = profile;
    saveDB(dbData);
  }

  return profile;
}

app.get('/api/portal/profile', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student portal access required' });
    const profile = getPortalProfileForUser(req.user);
    const course = profile.course_id ? await db.getCourse(profile.course_id) : null;
    res.json({
      ...profile,
      course_name: course?.name || 'Program not selected'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/portal/profile', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student portal access required' });
    const dbData = getDB();
    if (!dbData.portalProfiles) dbData.portalProfiles = {};
    const current = getPortalProfileForUser(req.user);
    const allowed = ['name', 'phone', 'city', 'course_id', 'next_step', 'scholarship', 'stage'];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key];
    }
    const next = { ...current, ...updates, updated_at: new Date().toISOString() };
    dbData.portalProfiles[req.user.id] = next;
    saveDB(dbData);

    await db.createActivity({
      type: 'student_portal',
      message: `${next.name || req.user.name} updated student portal profile`
    });

    const course = next.course_id ? await db.getCourse(next.course_id) : null;
    res.json({ ...next, course_name: course?.name || 'Program not selected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ============================================================
//  USERS (admin only)
// ============================================================

app.get('/api/users', requireAdmin, (req, res) => {
  try {
    res.json(getUsers());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', requireAdmin, (req, res) => {
  try {
    const user = createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
  try {
    const user = updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  try {
    deleteUser(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
//  SETTINGS (institute profile)
// ============================================================

app.get('/api/settings', requireAuth, (req, res) => {
  try {
    const dbData = getDB();
    res.json(dbData.settings || getDefaultSettings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', requireAdmin, (req, res) => {
  try {
    const dbData = getDB();
    dbData.settings = { ...getDefaultSettings(), ...req.body };
    saveDB(dbData);
    res.json(dbData.settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function getDefaultSettings() {
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

// ============================================================
//  MARKETING / COMMUNICATIONS
// ============================================================

function ensureMarketingModules() {
  const dbData = getDB();
  let changed = false;
  const now = new Date().toISOString();
  const leads = dbData.leads || [];
  const lead = leads[0] || {
    id: 'demo-student',
    first_name: 'Aarav',
    last_name: 'Mehta',
    email: 'student@demo.in',
    phone: '+91 90123 45678',
    city: 'Bareilly'
  };
  const leadName = `${lead.first_name || 'Aarav'} ${lead.last_name || 'Mehta'}`.trim();

  if (!dbData.communicationIntegrations) {
    dbData.communicationIntegrations = {
      email: { enabled: true, provider: 'SMTP relay', sender: 'admissions@rbmi.edu.in' },
      sms: { enabled: true, provider: 'MSG91', sender: 'RBMIAD' },
      whatsapp: { enabled: true, provider: 'WhatsApp Business Cloud', sender: '+91 581 250 0000' },
      ivr: { enabled: true, provider: 'Exotel', sender: 'IVR Queue A' },
      push: { enabled: true, provider: 'Firebase Cloud Messaging', sender: 'RBMI Hub App' }
    };
    changed = true;
  }

  if (!dbData.communicationTemplates || dbData.communicationTemplates.length === 0) {
    dbData.communicationTemplates = [
      {
        id: generateId(),
        name: 'Open House Invite',
        channel: 'email',
        category: 'campaign',
        subject: 'Join RBMI open house this Saturday',
        content: 'Hi {{name}}, visit {{campus}} this Saturday for our open house and course guidance session.',
        variables: ['name', 'campus'],
        active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: generateId(),
        name: 'Callback Reminder',
        channel: 'sms',
        category: 'follow_up',
        subject: '',
        content: 'Hi {{name}}, our counselor will call you today regarding {{course}} admission.',
        variables: ['name', 'course'],
        active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: generateId(),
        name: 'Document Nudge',
        channel: 'whatsapp',
        category: 'drip',
        subject: '',
        content: 'Hello {{name}}, please upload your pending documents to keep your admission moving.',
        variables: ['name'],
        active: true,
        created_at: now,
        updated_at: now
      }
    ];
    changed = true;
  }

  if (!dbData.communicationCampaigns || dbData.communicationCampaigns.length === 0) {
    dbData.communicationCampaigns = [
      {
        id: generateId(),
        name: 'MBA Priority Outreach',
        channel: 'email',
        category: 'campaign',
        status: 'draft',
        audience: 'MBA prospects',
        audience_count: Math.max(1, leads.length || 1),
        template_id: dbData.communicationTemplates[0]?.id || null,
        subject: 'Admissions guidance for MBA applicants',
        message: 'Shortlist warm MBA leads for a counselor callback.',
        auto_followup: true,
        owner_id: reqUserFallbackId(),
        metrics: { delivered: 0, opened: 0, clicked: 0, replied: 0, failed: 0 },
        created_at: now,
        updated_at: now,
        sent_at: null
      },
      {
        id: generateId(),
        name: 'Application Deadline SMS',
        channel: 'sms',
        category: 'broadcast',
        status: 'scheduled',
        audience: 'All active leads',
        audience_count: Math.max(1, leads.length || 1),
        template_id: dbData.communicationTemplates[1]?.id || null,
        subject: '',
        message: 'Send deadline reminders for pending applicants.',
        auto_followup: false,
        owner_id: reqUserFallbackId(),
        metrics: { delivered: 0, opened: 0, clicked: 0, replied: 0, failed: 0 },
        created_at: now,
        updated_at: now,
        sent_at: null
      },
      {
        id: generateId(),
        name: 'Document Completion Drip',
        channel: 'whatsapp',
        category: 'drip',
        status: 'active',
        audience: 'Document pending students',
        audience_count: 1,
        template_id: dbData.communicationTemplates[2]?.id || null,
        subject: '',
        message: 'Automated nudges for pending document uploads.',
        auto_followup: true,
        owner_id: reqUserFallbackId(),
        metrics: { delivered: 12, opened: 10, clicked: 6, replied: 4, failed: 1 },
        created_at: now,
        updated_at: now,
        sent_at: now
      }
    ];
    changed = true;
  }

  if (!dbData.callLogs || dbData.callLogs.length === 0) {
    dbData.callLogs = [
      {
        id: generateId(),
        student_name: leadName,
        phone: lead.phone || '+91 90123 45678',
        direction: 'outbound',
        provider: 'Exotel',
        duration_seconds: 412,
        recording_url: 'https://recordings.rbmi.local/call-demo-001',
        summary: 'Discussed MBA admission process and scheduled callback.',
        status: 'completed',
        created_at: now
      }
    ];
    changed = true;
  }

  if (!dbData.autoFollowUps || dbData.autoFollowUps.length === 0) {
    dbData.autoFollowUps = [
      {
        id: generateId(),
        title: 'No response in 24 hours',
        trigger: 'lead_created',
        channel: 'sms',
        delay_hours: 24,
        status: 'active',
        template_id: dbData.communicationTemplates[1]?.id || null,
        created_at: now,
        updated_at: now
      }
    ];
    changed = true;
  }

  if (!dbData.broadcastMessages || dbData.broadcastMessages.length === 0) {
    dbData.broadcastMessages = [
      {
        id: generateId(),
        title: 'Scholarship Webinar Alert',
        channel: 'whatsapp',
        audience: 'All scholarship leads',
        message: 'Scholarship webinar starts at 5 PM. Join using the portal link.',
        status: 'sent',
        metrics: { reached: Math.max(1, leads.length || 1), engaged: Math.max(1, Math.floor((leads.length || 1) * 0.6)) },
        created_at: now,
        updated_at: now
      }
    ];
    changed = true;
  }

  if (!dbData.studentInbox || dbData.studentInbox.length === 0) {
    dbData.studentInbox = [
      {
        id: generateId(),
        student_name: leadName,
        channel: 'email',
        subject: 'Admission help required',
        message: 'Can I switch from BBA to MBA after counseling?',
        status: 'open',
        priority: 'high',
        created_at: now,
        updated_at: now
      }
    ];
    changed = true;
  }

  if (!dbData.chatThreads || dbData.chatThreads.length === 0) {
    dbData.chatThreads = [
      {
        id: generateId(),
        student_name: leadName,
        counselor_name: 'Priya Sharma',
        status: 'active',
        last_message_at: now,
        messages: [
          {
            id: generateId(),
            sender: 'student',
            text: 'Hello, I need the fee structure for MBA.',
            created_at: now
          },
          {
            id: generateId(),
            sender: 'counselor',
            text: 'Sharing the updated fee structure and scholarship slab now.',
            created_at: now
          }
        ]
      }
    ];
    changed = true;
  }

  if (!dbData.notificationCenter || dbData.notificationCenter.length === 0) {
    dbData.notificationCenter = [
      {
        id: generateId(),
        title: 'Broadcast delivered',
        message: 'Scholarship webinar broadcast reached active leads.',
        channel: 'push',
        target_type: 'marketing',
        status: 'unread',
        created_at: now
      },
      {
        id: generateId(),
        title: 'Inbox waiting',
        message: `${leadName} is waiting for a counselor response.`,
        channel: 'email',
        target_type: 'student_inbox',
        status: 'unread',
        created_at: now
      }
    ];
    changed = true;
  }

  if (changed) saveDB(dbData);
  return dbData;
}

function reqUserFallbackId() {
  return 'u001-admin';
}

function buildCampaignAnalytics(dbData) {
  const campaigns = dbData.communicationCampaigns || [];
  const notifications = dbData.notificationCenter || [];
  const inbox = dbData.studentInbox || [];
  const calls = dbData.callLogs || [];

  const totals = campaigns.reduce((acc, item) => {
    acc.total += 1;
    acc.sent += item.status === 'sent' || item.status === 'active' ? 1 : 0;
    acc.delivered += Number(item.metrics?.delivered || 0);
    acc.opened += Number(item.metrics?.opened || 0);
    acc.clicked += Number(item.metrics?.clicked || 0);
    acc.replied += Number(item.metrics?.replied || 0);
    return acc;
  }, { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0 });

  const byChannel = ['email', 'sms', 'whatsapp', 'ivr', 'push'].map((channel) => {
    const items = campaigns.filter(item => item.channel === channel);
    const delivered = items.reduce((sum, item) => sum + Number(item.metrics?.delivered || 0), 0);
    const opened = items.reduce((sum, item) => sum + Number(item.metrics?.opened || 0), 0);
    return { channel, campaigns: items.length, delivered, opened };
  });

  const byCategory = ['campaign', 'broadcast', 'drip'].map((category) => ({
    category,
    count: campaigns.filter(item => item.category === category).length
  }));

  return {
    totals: {
      ...totals,
      inboxOpen: inbox.filter(item => item.status === 'open').length,
      unreadNotifications: notifications.filter(item => item.status === 'unread').length,
      callLogs: calls.length
    },
    byChannel,
    byCategory
  };
}

function createNotificationEntry(dbData, payload) {
  const item = {
    id: generateId(),
    title: payload.title,
    message: payload.message,
    channel: payload.channel || 'push',
    target_type: payload.target_type || 'marketing',
    status: payload.status || 'unread',
    created_at: new Date().toISOString()
  };
  dbData.notificationCenter = [item, ...(dbData.notificationCenter || [])];
  return item;
}

app.get('/api/marketing/overview', requireAuth, async (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json({
      integrations: dbData.communicationIntegrations,
      analytics: buildCampaignAnalytics(dbData),
      counts: {
        templates: (dbData.communicationTemplates || []).length,
        campaigns: (dbData.communicationCampaigns || []).length,
        followUps: (dbData.autoFollowUps || []).length,
        broadcasts: (dbData.broadcastMessages || []).length,
        inbox: (dbData.studentInbox || []).length,
        chats: (dbData.chatThreads || []).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/templates', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json((dbData.communicationTemplates || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/templates', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const now = new Date().toISOString();
    const item = {
      id: generateId(),
      name: req.body.name || 'Untitled template',
      channel: req.body.channel || 'email',
      category: req.body.category || 'campaign',
      subject: req.body.subject || '',
      content: req.body.content || '',
      variables: Array.isArray(req.body.variables) ? req.body.variables : [],
      active: req.body.active !== false,
      created_at: now,
      updated_at: now
    };
    dbData.communicationTemplates.unshift(item);
    saveDB(dbData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/marketing/templates/:id', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const idx = dbData.communicationTemplates.findIndex(item => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Template not found' });
    dbData.communicationTemplates[idx] = {
      ...dbData.communicationTemplates[idx],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    saveDB(dbData);
    res.json(dbData.communicationTemplates[idx]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/campaigns', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json((dbData.communicationCampaigns || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/campaigns', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const now = new Date().toISOString();
    const item = {
      id: generateId(),
      name: req.body.name || 'Untitled campaign',
      channel: req.body.channel || 'email',
      category: req.body.category || 'campaign',
      status: req.body.status || 'draft',
      audience: req.body.audience || 'All leads',
      audience_count: Number(req.body.audience_count || (dbData.leads || []).length || 1),
      template_id: req.body.template_id || null,
      subject: req.body.subject || '',
      message: req.body.message || '',
      auto_followup: !!req.body.auto_followup,
      owner_id: req.user.id,
      metrics: { delivered: 0, opened: 0, clicked: 0, replied: 0, failed: 0 },
      created_at: now,
      updated_at: now,
      sent_at: null
    };
    dbData.communicationCampaigns.unshift(item);
    saveDB(dbData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/marketing/campaigns/:id', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const idx = dbData.communicationCampaigns.findIndex(item => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Campaign not found' });
    dbData.communicationCampaigns[idx] = {
      ...dbData.communicationCampaigns[idx],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    saveDB(dbData);
    res.json(dbData.communicationCampaigns[idx]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/campaigns/:id/launch', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const idx = dbData.communicationCampaigns.findIndex(item => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Campaign not found' });

    const current = dbData.communicationCampaigns[idx];
    const delivered = Math.max(1, Number(current.audience_count || 1));
    const opened = current.channel === 'sms' ? 0 : Math.max(0, Math.floor(delivered * 0.72));
    const clicked = current.channel === 'ivr' ? 0 : Math.max(0, Math.floor(delivered * 0.38));
    const replied = Math.max(0, Math.floor(delivered * 0.18));
    const failed = Math.max(0, Math.floor(delivered * 0.06));
    const now = new Date().toISOString();

    dbData.communicationCampaigns[idx] = {
      ...current,
      status: 'sent',
      metrics: { delivered, opened, clicked, replied, failed },
      sent_at: now,
      updated_at: now
    };

    if (dbData.communicationCampaigns[idx].auto_followup) {
      dbData.autoFollowUps.unshift({
        id: generateId(),
        title: `${current.name} follow-up`,
        trigger: 'campaign_sent',
        channel: current.channel === 'email' ? 'sms' : current.channel,
        delay_hours: 24,
        status: 'active',
        template_id: current.template_id || null,
        created_at: now,
        updated_at: now
      });
    }

    if (current.channel === 'ivr') {
      dbData.callLogs.unshift({
        id: generateId(),
        student_name: 'Campaign audience',
        phone: 'Bulk IVR',
        direction: 'outbound',
        provider: dbData.communicationIntegrations?.ivr?.provider || 'IVR',
        duration_seconds: 95,
        recording_url: `https://recordings.rbmi.local/${current.id}`,
        summary: `IVR campaign "${current.name}" launched to ${delivered} recipients.`,
        status: 'completed',
        created_at: now
      });
    }

    dbData.studentInbox.unshift({
      id: generateId(),
      student_name: 'Campaign audience',
      channel: current.channel,
      subject: current.subject || current.name,
      message: `${current.name} was delivered to ${delivered} recipients.`,
      status: 'open',
      priority: 'medium',
      created_at: now,
      updated_at: now
    });

    createNotificationEntry(dbData, {
      title: 'Campaign launched',
      message: `${current.name} was sent over ${current.channel}.`,
      channel: current.channel === 'push' ? 'push' : 'email',
      target_type: 'campaign'
    });

    saveDB(dbData);
    res.json(dbData.communicationCampaigns[idx]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/integrations', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json(dbData.communicationIntegrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/marketing/integrations', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    dbData.communicationIntegrations = { ...dbData.communicationIntegrations, ...req.body };
    createNotificationEntry(dbData, {
      title: 'Integrations updated',
      message: 'Communication provider settings were updated.',
      channel: 'push',
      target_type: 'integration'
    });
    saveDB(dbData);
    res.json(dbData.communicationIntegrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/call-logs', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json((dbData.callLogs || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/call-logs', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const item = {
      id: generateId(),
      student_name: req.body.student_name || 'Student',
      phone: req.body.phone || '',
      direction: req.body.direction || 'outbound',
      provider: req.body.provider || dbData.communicationIntegrations?.ivr?.provider || 'IVR',
      duration_seconds: Number(req.body.duration_seconds || 0),
      recording_url: req.body.recording_url || '',
      summary: req.body.summary || 'Manual call note added.',
      status: req.body.status || 'completed',
      created_at: new Date().toISOString()
    };
    dbData.callLogs.unshift(item);
    saveDB(dbData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/followups', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json((dbData.autoFollowUps || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/followups', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const now = new Date().toISOString();
    const item = {
      id: generateId(),
      title: req.body.title || 'Auto follow-up',
      trigger: req.body.trigger || 'lead_created',
      channel: req.body.channel || 'sms',
      delay_hours: Number(req.body.delay_hours || 24),
      status: req.body.status || 'active',
      template_id: req.body.template_id || null,
      created_at: now,
      updated_at: now
    };
    dbData.autoFollowUps.unshift(item);
    saveDB(dbData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/broadcasts', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json((dbData.broadcastMessages || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/broadcasts', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const now = new Date().toISOString();
    const item = {
      id: generateId(),
      title: req.body.title || 'Broadcast',
      channel: req.body.channel || 'whatsapp',
      audience: req.body.audience || 'All leads',
      message: req.body.message || '',
      status: req.body.status || 'draft',
      metrics: { reached: 0, engaged: 0 },
      created_at: now,
      updated_at: now
    };
    dbData.broadcastMessages.unshift(item);
    saveDB(dbData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/broadcasts/:id/send', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const idx = dbData.broadcastMessages.findIndex(item => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Broadcast not found' });
    const reached = Math.max(1, (dbData.leads || []).length || 1);
    const engaged = Math.max(1, Math.floor(reached * 0.64));
    dbData.broadcastMessages[idx] = {
      ...dbData.broadcastMessages[idx],
      status: 'sent',
      metrics: { reached, engaged },
      updated_at: new Date().toISOString()
    };
    createNotificationEntry(dbData, {
      title: 'Broadcast sent',
      message: `${dbData.broadcastMessages[idx].title} reached ${reached} recipients.`,
      channel: 'push',
      target_type: 'broadcast'
    });
    saveDB(dbData);
    res.json(dbData.broadcastMessages[idx]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/inbox', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json((dbData.studentInbox || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/inbox', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const now = new Date().toISOString();
    const item = {
      id: generateId(),
      student_name: req.body.student_name || 'Student',
      channel: req.body.channel || 'email',
      subject: req.body.subject || 'Student inbox message',
      message: req.body.message || '',
      status: req.body.status || 'open',
      priority: req.body.priority || 'medium',
      created_at: now,
      updated_at: now
    };
    dbData.studentInbox.unshift(item);
    createNotificationEntry(dbData, {
      title: 'Inbox updated',
      message: `${item.student_name} sent a new ${item.channel} message.`,
      channel: item.channel,
      target_type: 'student_inbox'
    });
    saveDB(dbData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/marketing/inbox/:id', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const idx = dbData.studentInbox.findIndex(item => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Inbox message not found' });
    dbData.studentInbox[idx] = {
      ...dbData.studentInbox[idx],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    saveDB(dbData);
    res.json(dbData.studentInbox[idx]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/chats', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json((dbData.chatThreads || []).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/chats/:id/messages', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const idx = dbData.chatThreads.findIndex(item => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Chat thread not found' });
    const message = {
      id: generateId(),
      sender: req.body.sender || (req.user.role === 'student' ? 'student' : 'counselor'),
      text: req.body.text || '',
      created_at: new Date().toISOString()
    };
    dbData.chatThreads[idx].messages.push(message);
    dbData.chatThreads[idx].last_message_at = message.created_at;
    dbData.chatThreads[idx].status = 'active';
    createNotificationEntry(dbData, {
      title: 'Chat updated',
      message: `New counselor-student chat message in ${dbData.chatThreads[idx].student_name}'s thread.`,
      channel: 'push',
      target_type: 'chat'
    });
    saveDB(dbData);
    res.status(201).json(dbData.chatThreads[idx]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/notifications', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    res.json((dbData.notificationCenter || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/notifications', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const item = createNotificationEntry(dbData, req.body);
    saveDB(dbData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/marketing/notifications/:id', requireAuth, (req, res) => {
  try {
    const dbData = ensureMarketingModules();
    const idx = dbData.notificationCenter.findIndex(item => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Notification not found' });
    dbData.notificationCenter[idx] = { ...dbData.notificationCenter[idx], ...req.body };
    saveDB(dbData);
    res.json(dbData.notificationCenter[idx]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  START
// ============================================================

app.listen(PORT, () => {
  console.log(`\n  🚀 RBMI CRM API Server running at http://localhost:${PORT}`);
  console.log(`  📡 Webhook endpoint: POST http://localhost:${PORT}/api/webhook/lead`);
  console.log(`  🔑 Auth: POST http://localhost:${PORT}/api/auth/login\n`);
});



