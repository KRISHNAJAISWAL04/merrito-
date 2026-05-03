-- RBMI Admission Hub — Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'counselor', 'student')),
  counselor_id text,
  branch text default 'bareilly',
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- LEADS
-- ============================================================
create table if not exists leads (
  id text primary key,
  first_name text not null,
  last_name text not null default '',
  email text default '',
  phone text not null,
  course_id text,
  source text default 'Website',
  stage text default 'enquiry',
  counselor_id text,
  priority text default 'medium',
  city text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- COUNSELORS
-- ============================================================
create table if not exists counselors (
  id text primary key,
  name text not null,
  email text default '',
  phone text default '',
  role text default 'Counselor',
  department text default 'General',
  branch text,
  rating numeric default 4.0,
  created_at timestamptz default now()
);

-- ============================================================
-- COURSES
-- ============================================================
create table if not exists courses (
  id text primary key,
  name text not null,
  code text default '',
  department text default '',
  duration text default '',
  total_seats int default 0,
  filled_seats int default 0,
  fee text default '',
  status text default 'Active',
  branch text,
  created_at timestamptz default now()
);

-- ============================================================
-- ACTIVITIES
-- ============================================================
create table if not exists activities (
  id text primary key,
  type text default 'note',
  lead_id text,
  message text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- APPLICATIONS
-- ============================================================
create table if not exists applications (
  id text primary key,
  user_id uuid,
  student_name text not null,
  email text,
  course_id text,
  status text default 'submitted',
  documents_status text default 'pending',
  counselor_name text default 'Admissions team',
  priority text default 'medium',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- QUERIES
-- ============================================================
create table if not exists queries (
  id text primary key,
  user_id uuid,
  student_name text not null,
  subject text default 'Admission query',
  category text default 'General',
  status text default 'open',
  priority text default 'medium',
  message text default '',
  response text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table if not exists payments (
  id text primary key,
  user_id uuid,
  student_name text not null,
  title text default 'Admission fee',
  amount numeric default 0,
  status text default 'due',
  method text default 'Online',
  due_date text default '',
  receipt_no text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PORTAL PROFILES (student-facing)
-- ============================================================
create table if not exists portal_profiles (
  user_id uuid primary key,
  name text not null,
  email text not null,
  phone text default '',
  city text default '',
  course_id text,
  stage text default 'enquiry',
  counselor_name text default 'Admissions team',
  readiness int default 35,
  next_step text default 'Complete your profile',
  fee_due text default '0',
  scholarship text default 'Not reviewed yet',
  branch text default 'bareilly',
  updated_at timestamptz default now()
);

-- ============================================================
-- INSTITUTE SETTINGS
-- ============================================================
create table if not exists institute_settings (
  id text primary key,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ============================================================
-- FORM TEMPLATES
-- ============================================================
create table if not exists form_templates (
  id text primary key,
  name text not null,
  purpose text default 'Lead capture',
  status text default 'draft',
  branch text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table if not exists campaigns (
  id text primary key,
  name text not null,
  channel text default 'Other',
  status text default 'draft',
  budget text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table leads enable row level security;
alter table counselors enable row level security;
alter table courses enable row level security;
alter table activities enable row level security;
alter table applications enable row level security;
alter table queries enable row level security;
alter table payments enable row level security;
alter table portal_profiles enable row level security;
alter table institute_settings enable row level security;
alter table form_templates enable row level security;
alter table campaigns enable row level security;

-- ============================================================
-- POLICIES — Profiles
-- ============================================================
create policy "Anyone can read profiles"
  on profiles for select using (true);

create policy "Service role can manage profiles"
  on profiles for all using (true) with check (true);

-- ============================================================
-- POLICIES — Leads
-- ============================================================
create policy "Anyone can read leads"
  on leads for select using (true);

create policy "Service role can manage leads"
  on leads for all using (true) with check (true);

-- ============================================================
-- POLICIES — Counselors
-- ============================================================
create policy "Anyone can read counselors"
  on counselors for select using (true);

create policy "Service role can manage counselors"
  on counselors for all using (true) with check (true);

-- ============================================================
-- POLICIES — Courses
-- ============================================================
create policy "Anyone can read courses"
  on courses for select using (true);

create policy "Service role can manage courses"
  on courses for all using (true) with check (true);

-- ============================================================
-- POLICIES — Activities
-- ============================================================
create policy "Anyone can read activities"
  on activities for select using (true);

create policy "Service role can manage activities"
  on activities for all using (true) with check (true);

-- ============================================================
-- POLICIES — Applications
-- ============================================================
create policy "Anyone can read applications"
  on applications for select using (true);

create policy "Service role can manage applications"
  on applications for all using (true) with check (true);

-- ============================================================
-- POLICIES — Queries
-- ============================================================
create policy "Anyone can read queries"
  on queries for select using (true);

create policy "Service role can manage queries"
  on queries for all using (true) with check (true);

-- ============================================================
-- POLICIES — Payments
-- ============================================================
create policy "Anyone can read payments"
  on payments for select using (true);

create policy "Service role can manage payments"
  on payments for all using (true) with check (true);

-- ============================================================
-- POLICIES — Portal Profiles
-- ============================================================
create policy "Anyone can read portal profiles"
  on portal_profiles for select using (true);

create policy "Service role can manage portal profiles"
  on portal_profiles for all using (true) with check (true);

-- ============================================================
-- POLICIES — Institute Settings
-- ============================================================
create policy "Anyone can read settings"
  on institute_settings for select using (true);

create policy "Service role can manage settings"
  on institute_settings for all using (true) with check (true);

-- ============================================================
-- POLICIES — Form Templates
-- ============================================================
create policy "Anyone can read form templates"
  on form_templates for select using (true);

create policy "Service role can manage form templates"
  on form_templates for all using (true) with check (true);

-- ============================================================
-- POLICIES — Campaigns
-- ============================================================
create policy "Anyone can read campaigns"
  on campaigns for select using (true);

create policy "Service role can manage campaigns"
  on campaigns for all using (true) with check (true);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();
create trigger update_leads_updated_at before update on leads
  for each row execute function update_updated_at_column();
create trigger update_applications_updated_at before update on applications
  for each row execute function update_updated_at_column();
create trigger update_queries_updated_at before update on queries
  for each row execute function update_updated_at_column();
create trigger update_payments_updated_at before update on payments
  for each row execute function update_updated_at_column();
create trigger update_portal_profiles_updated_at before update on portal_profiles
  for each row execute function update_updated_at_column();
create trigger update_institute_settings_updated_at before update on institute_settings
  for each row execute function update_updated_at_column();
create trigger update_form_templates_updated_at before update on form_templates
  for each row execute function update_updated_at_column();
create trigger update_campaigns_updated_at before update on campaigns
  for each row execute function update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, counselor_id, branch, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'counselor_id',
    coalesce(new.raw_user_meta_data->>'branch', 'bareilly'),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
