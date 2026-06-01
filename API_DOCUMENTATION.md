# RBMI Admission Hub - Complete API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format
All responses follow this format:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

Error responses:
```json
{
  "error": "Error message here"
}
```

---

## 1. Authentication Endpoints

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@rbmi.edu.in",
  "password": "admin123",
  "branch": "bareilly"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "admin@rbmi.edu.in",
    "role": "admin",
    "branch": "bareilly"
  }
}
```

### POST /auth/signup
Register new student account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "9876543210",
  "branch": "bareilly"
}
```

### GET /auth/me
Get current user details (requires auth).

---

## 2. Lead Management

### GET /leads
Get all leads with filters.

**Query Parameters:**
- `stage` - Filter by stage
- `source` - Filter by source
- `counselor_id` - Filter by counselor
- `search` - Search by name, email, phone
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 12)

**Response:**
```json
{
  "data": [
    {
      "id": "lead_id",
      "first_name": "Rahul",
      "last_name": "Sharma",
      "email": "rahul@example.com",
      "phone": "9876543210",
      "course_id": "course_id",
      "course_name": "MBA",
      "source": "Website",
      "stage": "enquiry",
      "counselor_id": "counselor_id",
      "counselor_name": "Priya Sharma",
      "priority": "high",
      "lead_score": 75,
      "created_at": "2026-06-01T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 9
}
```

### POST /leads
Create new lead.

**Request:**
```json
{
  "first_name": "Rahul",
  "last_name": "Sharma",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "course_id": "course_id",
  "source": "Website",
  "stage": "enquiry",
  "priority": "high",
  "city": "Delhi",
  "notes": "Interested in MBA program"
}
```

### PUT /leads/:id
Update lead.

### DELETE /leads/:id
Delete lead (Admin only).

### GET /leads/export/csv
Export leads to CSV.

---

## 3. Bulk Import

### POST /import/leads
Import leads from CSV.

**Request:**
```json
{
  "csvContent": "first_name,last_name,email,phone,course\nRahul,Sharma,rahul@example.com,9876543210,MBA",
  "skipDuplicates": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Import completed: 50 imported, 5 skipped",
  "results": {
    "total": 55,
    "imported": 50,
    "skipped": 5,
    "errors": [],
    "duplicates": [...]
  }
}
```

### GET /import/template
Download CSV template.

### POST /import/validate
Validate CSV before import.

---

## 4. Interview Scheduling

### GET /interviews
Get all interviews.

**Query Parameters:**
- `lead_id` - Filter by lead
- `status` - Filter by status
- `date_from` - Filter from date
- `date_to` - Filter to date

### POST /interviews
Schedule new interview.

**Request:**
```json
{
  "lead_id": "lead_id",
  "interviewer_id": "counselor_id",
  "scheduled_at": "2026-06-15T10:00:00Z",
  "duration_minutes": 30,
  "mode": "video",
  "meeting_link": "https://meet.google.com/abc-defg-hij",
  "notes": "MBA admission interview"
}
```

### GET /interviews/slots
Get available time slots.

**Query Parameters:**
- `interviewer_id` - Counselor ID (required)
- `date` - Date in YYYY-MM-DD format (required)

**Response:**
```json
{
  "date": "2026-06-15",
  "interviewer_id": "counselor_id",
  "slots": [
    {
      "start": "2026-06-15T09:00:00Z",
      "end": "2026-06-15T09:30:00Z",
      "label": "09:00 AM - 09:30 AM"
    }
  ]
}
```

### PUT /interviews/:id
Update interview.

### DELETE /interviews/:id
Delete interview (Admin only).

---

## 5. Payment Gateway

### GET /payment-gateway/config
Get Razorpay configuration.

**Response:**
```json
{
  "key_id": "rzp_test_mock_key_id",
  "currency": "INR",
  "name": "RBMI Admissions",
  "theme": {
    "color": "#3b82f6"
  }
}
```

### POST /payment-gateway/order
Create payment order.

**Request:**
```json
{
  "amount": 50000,
  "currency": "INR",
  "lead_id": "lead_id",
  "receipt": "receipt_001"
}
```

**Response:**
```json
{
  "id": "order_abc123",
  "amount": 5000000,
  "currency": "INR",
  "status": "created"
}
```

### POST /payment-gateway/verify
Verify payment.

**Request:**
```json
{
  "razorpay_order_id": "order_abc123",
  "razorpay_payment_id": "pay_xyz789",
  "razorpay_signature": "signature_here",
  "lead_id": "lead_id"
}
```

### GET /payment-gateway/status/:order_id
Get payment status.

---

## 6. Saved Filters

### GET /saved-filters
Get user's saved filters.

### POST /saved-filters
Create saved filter.

**Request:**
```json
{
  "name": "High Priority MBA Leads",
  "description": "All high priority MBA enquiries",
  "filters": {
    "stage": "enquiry",
    "priority": "high",
    "course": "MBA"
  },
  "is_shared": true,
  "is_default": false
}
```

### PUT /saved-filters/:id
Update saved filter.

### DELETE /saved-filters/:id
Delete saved filter.

### GET /saved-filters/shared
Get shared filters.

---

## 7. Admission Tests

### GET /admission-tests
Get all admission tests.

**Query Parameters:**
- `status` - Filter by status
- `course_id` - Filter by course

### POST /admission-tests
Create admission test (Admin only).

**Request:**
```json
{
  "name": "MBA Entrance Test 2026",
  "course_id": "course_id",
  "test_date": "2026-07-15T09:00:00Z",
  "duration_minutes": 120,
  "total_marks": 100,
  "passing_marks": 40,
  "venue": "Main Campus, Hall A",
  "instructions": "Bring ID proof and admit card",
  "syllabus": "Quantitative Aptitude, Logical Reasoning, English"
}
```

### POST /admission-tests/register
Register student for test.

**Request:**
```json
{
  "test_id": "test_id",
  "lead_id": "lead_id"
}
```

**Response:**
```json
{
  "id": "registration_id",
  "test_id": "test_id",
  "lead_id": "lead_id",
  "roll_number": "ROLL202612345",
  "status": "registered"
}
```

### POST /admission-tests/result
Submit test result (Admin only).

**Request:**
```json
{
  "registration_id": "registration_id",
  "marks_obtained": 75,
  "status": "appeared"
}
```

### GET /admission-tests/:test_id/merit-list
Generate merit list.

**Response:**
```json
{
  "test_id": "test_id",
  "merit_list": [
    {
      "rank": 1,
      "roll_number": "ROLL202612345",
      "name": "Rahul Sharma",
      "marks_obtained": 95,
      "result": "pass"
    }
  ],
  "total": 50
}
```

---

## 8. Scholarship Management

### GET /scholarships
Get all scholarships.

**Query Parameters:**
- `status` - Filter by status
- `type` - Filter by type

### POST /scholarships
Create scholarship (Admin only).

**Request:**
```json
{
  "name": "Merit Scholarship 2026",
  "type": "merit",
  "amount": 50000,
  "percentage": 50,
  "eligibility_criteria": "Minimum 85% in Class 12",
  "required_documents": ["Class 12 Marksheet", "Income Certificate"],
  "deadline": "2026-08-31T23:59:59Z",
  "max_recipients": 10
}
```

### POST /scholarships/apply
Apply for scholarship.

**Request:**
```json
{
  "scholarship_id": "scholarship_id",
  "lead_id": "lead_id",
  "documents": ["doc1.pdf", "doc2.pdf"],
  "justification": "I have scored 90% in Class 12"
}
```

### POST /scholarships/review
Review scholarship application (Admin only).

**Request:**
```json
{
  "application_id": "application_id",
  "status": "approved",
  "remarks": "Eligible for scholarship"
}
```

### GET /scholarships/applications
Get scholarship applications.

**Query Parameters:**
- `scholarship_id` - Filter by scholarship
- `lead_id` - Filter by lead
- `status` - Filter by status

---

## 9. Batch Management

### GET /batches
Get all batches.

**Query Parameters:**
- `course_id` - Filter by course
- `academic_year` - Filter by year
- `status` - Filter by status

### POST /batches
Create batch (Admin only).

**Request:**
```json
{
  "name": "MBA Batch 2026",
  "course_id": "course_id",
  "academic_year": "2026-2027",
  "start_date": "2026-08-01",
  "end_date": "2028-05-31",
  "max_students": 60,
  "sections": ["A", "B"]
}
```

### POST /batches/assign
Assign student to batch (Admin only).

**Request:**
```json
{
  "batch_id": "batch_id",
  "lead_id": "lead_id",
  "section": "A",
  "roll_number": "2026001"
}
```

### GET /batches/students
Get batch students.

**Query Parameters:**
- `batch_id` - Filter by batch
- `section` - Filter by section

---

## 10. Advanced Reports

### POST /reports/generate
Generate custom report.

**Request:**
```json
{
  "report_type": "conversion_funnel",
  "date_from": "2026-01-01",
  "date_to": "2026-06-01",
  "filters": {}
}
```

**Report Types:**
- `conversion_funnel` - Stage-wise conversion analysis
- `source_effectiveness` - Lead source performance
- `counselor_performance` - Counselor metrics
- `revenue_forecast` - Revenue projections
- `cohort_analysis` - Month-wise cohort retention
- `lead_quality` - Lead scoring analysis

**Response:**
```json
{
  "report_type": "conversion_funnel",
  "date_from": "2026-01-01",
  "date_to": "2026-06-01",
  "generated_at": "2026-06-01T10:00:00Z",
  "data": {
    "stages": {
      "enquiry": 1000,
      "counseling_scheduled": 800,
      "application_submitted": 500,
      "admitted": 300,
      "enrolled": 250
    },
    "conversion_rates": {
      "enquiry_to_counseling": "80.00",
      "overall": "25.00"
    }
  }
}
```

### POST /reports/schedule
Schedule report (Admin only).

**Request:**
```json
{
  "report_type": "conversion_funnel",
  "frequency": "weekly",
  "recipients": ["admin@rbmi.edu.in"],
  "filters": {}
}
```

---

## 11. Notifications

### GET /notifications
Get user notifications.

**Query Parameters:**
- `unread_only` - true/false

### GET /notifications/unread-count
Get unread notification count.

**Response:**
```json
{
  "count": 5
}
```

### POST /notifications
Create notification (Admin only).

**Request:**
```json
{
  "user_id": "user_id",
  "title": "New Lead Assigned",
  "message": "You have been assigned a new lead: Rahul Sharma",
  "type": "info",
  "action_url": "/leads/lead_id",
  "priority": "high"
}
```

### POST /notifications/broadcast
Broadcast to multiple users (Admin only).

**Request:**
```json
{
  "user_ids": ["user1", "user2"],
  "title": "System Maintenance",
  "message": "System will be down for maintenance on Sunday",
  "type": "warning",
  "priority": "high"
}
```

### PUT /notifications/:id/read
Mark notification as read.

### PUT /notifications/mark-all-read
Mark all notifications as read.

### DELETE /notifications/:id
Delete notification.

---

## 12. Other Endpoints

### Counselors
- GET /counselors
- POST /counselors (Admin)
- PUT /counselors/:id (Admin)
- DELETE /counselors/:id (Admin)

### Courses
- GET /courses
- POST /courses (Admin)
- PUT /courses/:id (Admin)
- DELETE /courses/:id (Admin)

### Dashboard
- GET /dashboard/stats

### Pipeline
- GET /pipeline

### Applications
- GET /applications
- POST /applications
- PUT /applications/:id

### Tasks
- GET /tasks
- POST /tasks
- PUT /tasks/:id

### Activities
- GET /activities

### Webhooks
- POST /webhook/lead (Public)
- POST /webhook/publisher/:name (Public)

---

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (Duplicate)
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Rate Limiting

- Login: 12 requests/minute
- Signup: 8 requests/minute
- Webhook: 30 requests/minute
- Other endpoints: 60 requests/minute

---

**Version**: 3.0.0  
**Last Updated**: June 1, 2026
