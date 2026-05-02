// ===== AUTH MODULE =====
import { getDB, saveDB, generateId } from './db.js';
import { randomBytes, createHmac } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'rbmi-crm-secret-2026';

// Simple JWT-like token (base64 encoded, HMAC signed)
function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    if (!header || !body || !sig) return null;
    const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload || !payload.id) return null;
    return payload;
  } catch { return null; }
}

// Seed default users if none exist
export function seedUsers() {
  const db = getDB();
  if (!db.users) db.users = [];
  if (db.users.length > 0) return;

  const now = new Date().toISOString();
  db.users = [
    {
      id: generateId(),
      name: 'Admin RBMI',
      email: 'admin@rbmi.edu.in',
      password: 'admin123',
      role: 'admin',
      counselor_id: null,
      created_at: now
    },
    {
      id: generateId(),
      name: 'Priya Sharma',
      email: 'priya@rbmi.edu.in',
      password: 'counselor123',
      role: 'counselor',
      counselor_id: null, // linked after counselors seeded
      created_at: now
    },
    {
      id: generateId(),
      name: 'Rajesh Kumar',
      email: 'rajesh@rbmi.edu.in',
      password: 'counselor123',
      role: 'counselor',
      counselor_id: null,
      created_at: now
    }
  ];
  saveDB(db);
}

function ensureDemoUsers() {
  const db = getDB();
  if (!db.users) db.users = [];
  if (!db.users.some(u => u.email.toLowerCase() === 'student@demo.in')) {
    db.users.push({
      id: 'u004-student-demo',
      name: 'Aarav Mehta',
      email: 'student@demo.in',
      password: 'student123',
      role: 'student',
      counselor_id: null,
      branch: 'bareilly',
      created_at: new Date().toISOString()
    });
  }
  if (!db.portalProfiles) db.portalProfiles = {};
  if (!db.portalProfiles['u004-student-demo']) {
    db.portalProfiles['u004-student-demo'] = {
      user_id: 'u004-student-demo',
      name: 'Aarav Mehta',
      email: 'student@demo.in',
      phone: '+91 90123 45678',
      city: 'Bareilly',
      course_id: 'cr001-mba',
      stage: 'application_submitted',
      counselor_name: 'Priya Sharma',
      readiness: 78,
      next_step: 'Upload Class 12 marksheet',
      fee_due: '25000',
      scholarship: 'Merit review pending',
      branch: 'bareilly',
      updated_at: new Date().toISOString()
    };
  }
  saveDB(db);
}
export function loginUser(email, password) {
  ensureDemoUsers();
  const db = getDB();
  const users = db.users || [];
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return null;

  const payload = { id: user.id, email: user.email, name: user.name, role: user.role, counselor_id: user.counselor_id, branch: user.branch || 'bareilly' };
  const token = signToken(payload);
  return { user: payload, token };
}

export function getUsers() {
  const db = getDB();
  return (db.users || []).map(u => ({ ...u, password: undefined }));
}

export function createUser(data) {
  const db = getDB();
  if (!db.users) db.users = [];
  const existing = db.users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
  if (existing) throw new Error('Email already exists');
  const user = { id: generateId(), ...data, created_at: new Date().toISOString() };
  db.users.push(user);
  saveDB(db);
  return { ...user, password: undefined };
}

export function updateUser(id, data) {
  const db = getDB();
  const idx = (db.users || []).findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found');
  db.users[idx] = { ...db.users[idx], ...data };
  saveDB(db);
  return { ...db.users[idx], password: undefined };
}

export function deleteUser(id) {
  const db = getDB();
  db.users = (db.users || []).filter(u => u.id !== id);
  saveDB(db);
}

// Auth middleware
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — no token' });
  }
  const token = auth.slice(7);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized — empty token' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized — invalid token' });
  }
  req.user = payload;
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}


