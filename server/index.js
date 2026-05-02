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
//  START
// ============================================================

app.listen(PORT, () => {
  console.log(`\n  🚀 RBMI CRM API Server running at http://localhost:${PORT}`);
  console.log(`  📡 Webhook endpoint: POST http://localhost:${PORT}/api/webhook/lead`);
  console.log(`  🔑 Auth: POST http://localhost:${PORT}/api/auth/login\n`);
});




