// ===== EXPRESS API SERVER — RBMI CRM =====
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as db from './supabase.js';
import {
  loginUser,
  loginWithSupabaseAccessToken,
  signupStudent,
  seedDemoUsers,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  requireAuth,
  requireAdmin
} from './auth.js';
import * as appStore from './appStore.js';
import { assertLeadPayload, assertRequired } from './validate.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.post('/api/health', (req, res) => res.json({ ok: true, body: req.body }));

// Seed demo users on startup
await seedDemoUsers();

// ============================================================
//  AUTH
// ============================================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, branch } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = await loginUser(email, password, branch);
    if (!result) {
      return res.status(401).json({
        error: db.USE_SUPABASE
          ? 'Invalid credentials. Contact admin to create your account.'
          : 'Invalid email or password'
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/supabase', async (req, res) => {
  try {
    const access_token = req.body?.access_token;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });
    const result = await loginWithSupabaseAccessToken(access_token);
    if (!result) return res.status(401).json({ error: 'Invalid or expired Supabase session' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, phone, branch } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Name, email and password required' });
    const result = await signupStudent(email, password, name, phone, branch || 'bareilly');
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

    const enriched = paged.map(l => {
      let score = 10; // Base score
      // Priority points
      if (l.priority === 'high') score += 30;
      else if (l.priority === 'medium') score += 15;
      // Stage points
      if (l.stage === 'admitted' || l.stage === 'enrolled') score += 40;
      else if (l.stage === 'documents_verified') score += 30;
      else if (l.stage === 'application_submitted') score += 20;
      else if (l.stage === 'counseling_done') score += 15;
      
      return {
        ...l,
        name: `${l.first_name} ${l.last_name}`,
        counselor_name: counselorMap[l.counselor_id]?.name || 'Unassigned',
        course_name: courseMap[l.course_id]?.name || 'N/A',
        lead_score: score
      };
    });

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
    assertLeadPayload(req.body);
    
    // Auto-assignment logic: if no counselor_id, assign to the one with least active leads
    let assignedCounselorId = req.body.counselor_id;
    if (!assignedCounselorId && req.user.role === 'admin') {
      const allCounselors = await db.getCounselors();
      if (allCounselors.length > 0) {
        const allLeads = await db.getLeads({});
        const workloads = allCounselors.map(c => ({
          id: c.id,
          active: allLeads.filter(l => l.counselor_id === c.id && !['admitted', 'enrolled'].includes(l.stage)).length
        }));
        workloads.sort((a, b) => a.active - b.active);
        assignedCounselorId = workloads[0].id;
      }
    }

    const lead = await db.createLead({
      first_name: req.body.first_name || '',
      last_name: req.body.last_name || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      course_id: req.body.course_id || null,
      source: req.body.source || 'Website',
      stage: req.body.stage || 'enquiry',
      counselor_id: assignedCounselorId || null,
      priority: req.body.priority || 'medium',
      city: req.body.city || '',
      notes: req.body.notes || ''
    });

    await db.createActivity({
      lead_id: lead.id,
      type: 'lead_added',
      message: `New lead ${lead.first_name} ${lead.last_name} added via ${lead.source}${assignedCounselorId ? ' and auto-assigned' : ''}`
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

    if (!String(fname || '').trim() || !String(phone || '').trim()) {
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
    assertRequired(req.body, ['name']);
    const counselor = await db.createCounselor(req.body);
    res.status(201).json(counselor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/counselors/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await db.updateCounselor(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(error.message === 'Counselor not found' ? 404 : 400).json({ error: error.message });
  }
});

app.delete('/api/counselors/:id', requireAdmin, async (req, res) => {
  try {
    await db.deleteCounselor(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
    assertRequired(req.body, ['name']);
    const course = await db.createCourse(req.body);
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ error: error.message });
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
    await db.deleteCourse(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
//  ACTIVITIES (Audit Log)
// ============================================================

app.get('/api/activities', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await db.getActivities(limit);
    const users = await getUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const enriched = activities.map(a => ({
      ...a,
      user_name: userMap[a.user_id]?.name || 'System',
      user_role: userMap[a.user_id]?.role || 'system'
    }));
    res.json(enriched);
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

app.get('/api/applications', requireAuth, async (req, res) => {
  try {
    const items = await appStore.listApplications(req.user);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/applications/export/csv', requireAuth, async (req, res) => {
  try {
    const items = await appStore.listApplications(req.user);
    const headers = ['Student', 'Email', 'Course', 'Status', 'Docs', 'Counselor', 'Priority', 'Date'];
    const rows = items.map(i => [
      i.student_name, i.email || '', i.course_name || '',
      i.status, i.documents_status, i.counselor_name,
      i.priority, new Date(i.created_at).toLocaleDateString('en-IN')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/applications', requireAuth, async (req, res) => {
  try {
    const item = await appStore.insertApplication(req.user, req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/applications/:id', requireAuth, async (req, res) => {
  try {
    const item = await appStore.patchApplication(req.user, req.params.id, req.body);
    res.json(item);
  } catch (error) {
    const code = error.message === 'Application not found' ? 404 : error.message === 'Access denied' ? 403 : 500;
    res.status(code).json({ error: error.message });
  }
});

app.get('/api/queries', requireAuth, async (req, res) => {
  try {
    const items = await appStore.listQueries(req.user);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/queries', requireAuth, async (req, res) => {
  try {
    const item = await appStore.insertQuery(req.user, req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/queries/:id', requireAuth, async (req, res) => {
  try {
    const item = await appStore.patchQuery(req.user, req.params.id, req.body);
    res.json(item);
  } catch (error) {
    const code = error.message === 'Query not found' ? 404 : error.message === 'Access denied' ? 403 : 500;
    res.status(code).json({ error: error.message });
  }
});

app.get('/api/payments', requireAuth, async (req, res) => {
  try {
    const items = await appStore.listPayments(req.user);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/payments/export/csv', requireAuth, async (req, res) => {
  try {
    const items = await appStore.listPayments(req.user);
    const headers = ['Student', 'Title', 'Amount', 'Status', 'Method', 'Due Date', 'Receipt No', 'Date'];
    const rows = items.map(i => [
      i.student_name, i.title, i.amount, i.status,
      i.method || '', i.due_date || '', i.receipt_no || '',
      new Date(i.created_at).toLocaleDateString('en-IN')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Admin or counselor access required' });
    const item = await appStore.insertPayment(req.user, req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/payments/:id', requireAuth, async (req, res) => {
  try {
    const item = await appStore.patchPayment(req.user, req.params.id, req.body);
    res.json(item);
  } catch (error) {
    const code = error.message === 'Payment not found' ? 404 : error.message === 'Access denied' ? 403 : 500;
    res.status(code).json({ error: error.message });
  }
});

// ============================================================
//  STUDENT PORTAL
// ============================================================

app.get('/api/portal/profile', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student portal access required' });
    const profile = await appStore.getPortalProfileForUser(req.user);
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
    const next = await appStore.updatePortalProfile(req.user, req.body);
    res.json(next);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  USERS (admin only)
// ============================================================

app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    res.json(await getUsers());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    assertRequired(req.body, ['email', 'name', 'role']);
    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
//  SETTINGS (institute profile)
// ============================================================

app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const settings = await appStore.loadSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await appStore.storeSettings(req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  FORMS & CAMPAIGNS (FormDesk / Campaign manager persistence)
// ============================================================

app.get('/api/form-templates', requireAuth, async (req, res) => {
  try {
    res.json(await appStore.listFormTemplates());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/form-templates', requireAdmin, async (req, res) => {
  try {
    const row = await appStore.insertFormTemplate(req.body);
    res.status(201).json(row);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/campaigns', requireAuth, async (req, res) => {
  try {
    res.json(await appStore.listCampaigns());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/campaigns', requireAdmin, async (req, res) => {
  try {
    const row = await appStore.insertCampaign(req.body);
    res.status(201).json(row);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
//  START
// ============================================================

app.listen(PORT, () => {
  console.log(`\n  RBMI CRM API Server running at http://localhost:${PORT}`);
  console.log(`  Webhook: POST http://localhost:${PORT}/api/webhook/lead`);
  console.log(`  Auth: POST http://localhost:${PORT}/api/auth/login`);
  if (db.USE_SUPABASE) console.log(`  Supabase session: POST http://localhost:${PORT}/api/auth/supabase`);
  console.log('');
});




