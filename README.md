# RBMI CRM — Admission Management System

**Rakshpal Bahadur Management Institute**  
📍 Bareilly Campus | 📍 Greater Noida Campus

A complete CRM for managing student admissions, counselors, leads, and pipeline — with automated lead capture from multiple sources.

---

## Quick Start

```bash
npm install
npm start          # Starts both API server (port 3001) and frontend (port 3000)
```

Or run separately:
```bash
npm run server     # API server only — http://localhost:3001
npm run dev        # Frontend only — http://localhost:3000
```

---

## Login Credentials

| Role | Email | Password | Campus |
|------|-------|----------|--------|
| Admin | admin@rbmi.edu.in | admin123 | Bareilly |
| Counselor | priya@rbmi.edu.in | counselor123 | Bareilly |
| Counselor | rajesh@rbmi.edu.in | counselor123 | Bareilly |

---

## How Leads Come In

Leads are captured automatically via the **webhook endpoint** from:

1. **Website Forms** — Your RBMI website contact/inquiry forms
2. **JustDial** — Configure JustDial lead delivery to webhook URL
3. **Shiksha.com** — Set up Shiksha lead forwarding
4. **CollegeDekho** — Configure CollegeDekho lead delivery
5. **Google Ads Lead Forms** — Use n8n/Zapier to forward
6. **Facebook Lead Ads** — Connect via n8n automation
7. **Manual Entry** — Counselors/admins can add leads via "Add Lead" button

### Webhook URL
```
POST http://localhost:3001/api/webhook/lead
Content-Type: application/json

{
  "name": "Rahul Sharma",
  "phone": "+91 9876543210",
  "email": "rahul@example.com",
  "course": "MBA",
  "source": "Website",
  "city": "Bareilly"
}
```

---

## Features (Like Meritto)

### Admin Panel
✅ Full dashboard with KPIs, charts, and activity feed  
✅ Leads Manager — add, edit, delete, filter, search, export CSV  
✅ Pipeline (Kanban) — drag-and-drop stage management  
✅ Counselors — full CRUD (add/edit/delete counselors)  
✅ Courses — full CRUD (add/edit/delete courses)  
✅ Reports & Analytics — funnel, trends, source distribution  
✅ Settings — institute profile, user management, webhook config  
✅ Branch selector — Bareilly / Greater Noida  
✅ Export leads to CSV  
✅ Bulk operations  

### Counselor Panel
✅ Dashboard (own leads only)  
✅ My Leads — view and update their assigned leads  
✅ Pipeline — their leads only  
✅ Courses — view only  
✅ Branch-specific data  

### Lead Automation
✅ Webhook endpoint for external integrations  
✅ Auto-match course by name  
✅ Source tracking (Website, JustDial, Shiksha, etc.)  
✅ Activity logging  
✅ Stage change tracking  

---

## Courses (Bareilly Campus)

- MBA (Master of Business Administration) — ₹3,50,000/yr
- BBA (Bachelor of Business Administration) — ₹1,80,000/yr
- BCA (Bachelor of Computer Applications) — ₹1,60,000/yr
- MCA (Master of Computer Applications) — ₹2,00,000/yr
- B.Com (Bachelor of Commerce) — ₹1,20,000/yr
- M.Com (Master of Commerce) — ₹1,50,000/yr
- PGDM (Post Graduate Diploma in Management) — ₹4,00,000/yr

---

## Tech Stack
- **Frontend**: Vite + Vanilla JS, Chart.js, Lucide Icons
- **Backend**: Express.js (Node.js)
- **Database**: Local JSON file (or Supabase PostgreSQL)
- **Auth**: JWT-based token authentication with branch support

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | None | Login |
| GET | /api/leads | Required | List leads |
| POST | /api/leads | Required | Create lead |
| PUT | /api/leads/:id | Required | Update lead |
| DELETE | /api/leads/:id | Admin | Delete lead |
| GET | /api/leads/export/csv | Required | Export CSV |
| POST | /api/webhook/lead | None | Capture lead (automation) |
| GET | /api/counselors | Required | List counselors |
| POST | /api/counselors | Admin | Add counselor |
| PUT | /api/counselors/:id | Admin | Update counselor |
| DELETE | /api/counselors/:id | Admin | Delete counselor |
| GET | /api/courses | Required | List courses |
| POST | /api/courses | Admin | Add course |
| GET | /api/dashboard/stats | Required | Dashboard data |
| GET | /api/pipeline | Required | Pipeline data |
| GET | /api/settings | Required | Get settings |
| PUT | /api/settings | Admin | Save settings |
