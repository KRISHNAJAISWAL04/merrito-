import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usersPath = process.argv[2] || path.join(__dirname, 'real-users.local.json');
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

if (!fs.existsSync(usersPath)) {
  console.error(`User file not found: ${usersPath}`);
  console.error('Copy scripts/real-users.example.json to scripts/real-users.local.json and fill real credentials.');
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'counsellor') return 'counselor';
  if (['admin', 'counselor', 'student'].includes(value)) return value;
  throw new Error(`Invalid role "${role}". Use admin, counselor, or student.`);
}

for (const user of users) {
  const role = normalizeRole(user.role);
  if (!user.email || !user.password || !user.name || !user.role) {
    console.warn(`Skipping incomplete user: ${user.email || 'unknown'}`);
    continue;
  }

  const { data: existingList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = existingList.users.find(item => item.email?.toLowerCase() === user.email.toLowerCase());

  let authUser = existing;
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
        role,
        counselor_id: user.counselor_id ?? null,
        branch: user.branch || 'bareilly',
        phone: user.phone || ''
      }
    });
    if (error) throw error;
    authUser = data.user;
    console.log(`Updated auth user: ${user.email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
        role,
        counselor_id: user.counselor_id ?? null,
        branch: user.branch || 'bareilly',
        phone: user.phone || ''
      }
    });
    if (error) throw error;
    authUser = data.user;
    console.log(`Created auth user: ${user.email}`);
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authUser.id,
    email: user.email,
    full_name: user.name,
    role,
    counselor_id: user.counselor_id ?? null,
    branch: user.branch || 'bareilly',
    phone: user.phone || '',
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  if (profileError?.code === 'PGRST204' && profileError.message?.includes("'phone'")) {
    const { error: retryError } = await supabase.from('profiles').upsert({
      id: authUser.id,
      email: user.email,
      full_name: user.name,
      role,
      counselor_id: user.counselor_id ?? null,
      branch: user.branch || 'bareilly',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (retryError) throw retryError;
    console.warn('profiles.phone column missing; seeded profile without phone. Add it with: alter table profiles add column if not exists phone text;');
  } else if (profileError) {
    throw profileError;
  }

  if (role === 'counselor' && user.counselor_id) {
    const { error: counselorError } = await supabase.from('counselors').upsert({
      id: user.counselor_id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: 'Counselor',
      department: user.department || 'Admissions',
      branch: user.branch || 'bareilly',
      rating: 4.0,
      created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (counselorError) throw counselorError;
  }
}

console.log('Real users seeded successfully.');
