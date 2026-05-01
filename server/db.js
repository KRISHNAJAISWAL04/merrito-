// ===== JSON FILE DATABASE =====
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data.json');

// Default empty structure
const DEFAULT_DB = {
  leads: [],
  counselors: [],
  courses: [],
  activities: []
};

function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading DB:', e.message);
  }
  return { ...DEFAULT_DB };
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getDB() {
  return readDB();
}

export function saveDB(data) {
  writeDB(data);
}

export function generateId() {
  return randomUUID();
}

// ===== SEED DATA =====
export function seedIfEmpty() {
  const db = readDB();
  if (db.counselors && db.counselors.length > 0) {
    console.log('  Database already initialized, skipping seed.');
    return;
  }

  console.log('  Initializing database with reference data (counselors & courses)...');

  // Counselors (reference data — needed for lead assignment dropdowns)
  const counselors = [
    { id: generateId(), name: 'Priya Sharma', email: 'priya.sharma@Meriito.com', phone: '+91 98765 43210', role: 'Senior Counselor', department: 'Engineering', rating: 4.8, created_at: new Date().toISOString() },
    { id: generateId(), name: 'Rajesh Kumar', email: 'rajesh.kumar@Meriito.com', phone: '+91 87654 32109', role: 'Counselor', department: 'Management', rating: 4.5, created_at: new Date().toISOString() },
    { id: generateId(), name: 'Anita Desai', email: 'anita.desai@Meriito.com', phone: '+91 76543 21098', role: 'Senior Counselor', department: 'Sciences', rating: 4.9, created_at: new Date().toISOString() },
    { id: generateId(), name: 'Vikram Singh', email: 'vikram.singh@Meriito.com', phone: '+91 65432 10987', role: 'Counselor', department: 'Arts & Humanities', rating: 4.3, created_at: new Date().toISOString() },
    { id: generateId(), name: 'Neha Patel', email: 'neha.patel@Meriito.com', phone: '+91 54321 09876', role: 'Junior Counselor', department: 'Commerce', rating: 4.6, created_at: new Date().toISOString() },
    { id: generateId(), name: 'Arjun Mehta', email: 'arjun.mehta@Meriito.com', phone: '+91 43210 98765', role: 'Counselor', department: 'Engineering', rating: 4.4, created_at: new Date().toISOString() }
  ];

  // Courses (reference data — needed for lead assignment dropdowns)
  const courses = [
    { id: generateId(), name: 'B.Tech Computer Science', code: 'BTCS', department: 'Engineering', duration: '4 Years', total_seats: 120, filled_seats: 0, fee: '₹2,50,000/yr', status: 'Active', created_at: new Date().toISOString() },
    { id: generateId(), name: 'B.Tech Electronics', code: 'BTEC', department: 'Engineering', duration: '4 Years', total_seats: 60, filled_seats: 0, fee: '₹2,30,000/yr', status: 'Active', created_at: new Date().toISOString() },
    { id: generateId(), name: 'MBA General', code: 'MBA', department: 'Management', duration: '2 Years', total_seats: 90, filled_seats: 0, fee: '₹3,50,000/yr', status: 'Active', created_at: new Date().toISOString() },
    { id: generateId(), name: 'BBA', code: 'BBA', department: 'Management', duration: '3 Years', total_seats: 60, filled_seats: 0, fee: '₹1,80,000/yr', status: 'Active', created_at: new Date().toISOString() },
    { id: generateId(), name: 'B.Sc Physics', code: 'BSP', department: 'Sciences', duration: '3 Years', total_seats: 40, filled_seats: 0, fee: '₹1,20,000/yr', status: 'Active', created_at: new Date().toISOString() },
    { id: generateId(), name: 'B.Sc Chemistry', code: 'BSC', department: 'Sciences', duration: '3 Years', total_seats: 40, filled_seats: 0, fee: '₹1,20,000/yr', status: 'Active', created_at: new Date().toISOString() },
    { id: generateId(), name: 'BA English', code: 'BAE', department: 'Arts & Humanities', duration: '3 Years', total_seats: 50, filled_seats: 0, fee: '₹90,000/yr', status: 'Active', created_at: new Date().toISOString() },
    { id: generateId(), name: 'B.Com Honours', code: 'BCOM', department: 'Commerce', duration: '3 Years', total_seats: 80, filled_seats: 0, fee: '₹1,40,000/yr', status: 'Active', created_at: new Date().toISOString() },
    { id: generateId(), name: 'M.Tech AI & ML', code: 'MTAI', department: 'Engineering', duration: '2 Years', total_seats: 30, filled_seats: 0, fee: '₹3,00,000/yr', status: 'Active', created_at: new Date().toISOString() },
    { id: generateId(), name: 'BCA', code: 'BCA', department: 'Engineering', duration: '3 Years', total_seats: 60, filled_seats: 0, fee: '₹1,60,000/yr', status: 'Active', created_at: new Date().toISOString() }
  ];

  // Start with ZERO leads and ZERO activities — user adds their own data
  const seeded = { leads: [], counselors, courses, activities: [] };
  writeDB(seeded);
  console.log(`  Initialized: 0 leads, ${counselors.length} counselors, ${courses.length} courses (clean start)`);
}
