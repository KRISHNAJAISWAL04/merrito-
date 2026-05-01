// ===== COURSES PAGE — Full CRUD =====
import { fetchCourses, createCourse, updateCourse, deleteCourse } from '../lib/api.js';
import { openModal } from '../components/modal.js';

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('rbmi_user') || 'null'); } catch { return null; }
}

export async function renderCourses(container) {
  container.innerHTML = `<div class="courses-page"><div class="page-header"><div><h1 class="page-title">Courses</h1><p class="page-subtitle">Loading...</p></div></div></div>`;
  try {
    await loadCourses(container);
  } catch (err) {
    container.innerHTML = `<div class="courses-page"><div class="error-state"><p>Failed to load: ${err.message}</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div></div>`;
  }
}

async function loadCourses(container) {
  const courses = await fetchCourses();
  const user = getCurrentUser();
  const isAdmin = !user || user.role === 'admin';

  const departments = {};
  courses.forEach(c => {
    if (!departments[c.department]) departments[c.department] = { courses: 0, totalSeats: 0, filledSeats: 0 };
    departments[c.department].courses++;
    departments[c.department].totalSeats += c.total_seats;
    departments[c.department].filledSeats += c.filled_seats;
  });

  container.innerHTML = `
    <div class="courses-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Courses</h1>
          <p class="page-subtitle">RBMI course catalog with seat availability and lead distribution.</p>
        </div>
        ${isAdmin ? `
        <div class="header-actions">
          <button class="btn btn-primary" id="btn-add-course">
            <i data-lucide="plus"></i> Add Course
          </button>
        </div>` : ''}
      </div>

      <div class="dept-grid animate-fade-in">
        ${Object.entries(departments).map(([dept, d]) => {
          const pct = d.totalSeats > 0 ? ((d.filledSeats / d.totalSeats) * 100).toFixed(0) : 0;
          return `
          <div class="dept-card">
            <div class="dept-header"><i data-lucide="building-2" style="width:20px;height:20px;color:var(--color-primary);"></i><h3 class="dept-name">${dept}</h3></div>
            <div class="dept-stats"><span>${d.courses} courses</span><span>${d.filledSeats}/${d.totalSeats} seats</span></div>
            <div class="dept-progress">
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${parseInt(pct)>80?'var(--color-danger)':parseInt(pct)>60?'var(--color-warning)':'var(--color-primary)'};"></div></div>
              <span class="progress-label">${pct}% filled</span>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="table-card animate-fade-in">
        <table class="data-table courses-table">
          <thead>
            <tr>
              <th>Course Name</th><th>Code</th><th>Department</th><th>Duration</th>
              <th>Fee</th><th>Seats</th><th>Occupancy</th><th>Leads</th><th>Status</th>
              ${isAdmin ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody id="courses-tbody">
            ${courses.map(c => renderCourseRow(c, isAdmin)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.renderIcons();

  // Add course
  document.getElementById('btn-add-course')?.addEventListener('click', () => {
    openCourseModal(null, async (data) => {
      await createCourse(data);
      await loadCourses(container);
    });
  });

  // Edit/Delete
  container.querySelectorAll('.btn-edit-course').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const c = courses.find(x => x.id === id);
      if (!c) return;
      openCourseModal(c, async (data) => {
        await updateCourse(id, data);
        await loadCourses(container);
      });
    });
  });

  container.querySelectorAll('.btn-delete-course').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const c = courses.find(x => x.id === id);
      if (!c) return;
      if (!confirm(`Delete course "${c.name}"?`)) return;
      await deleteCourse(id);
      await loadCourses(container);
    });
  });
}

function renderCourseRow(c, isAdmin) {
  const pct = c.total_seats > 0 ? ((c.filled_seats / c.total_seats) * 100).toFixed(0) : 0;
  const isFull = parseInt(pct) >= 95;
  return `
    <tr>
      <td><span class="course-name">${c.name}</span></td>
      <td><span class="course-code">${c.code}</span></td>
      <td>${c.department}</td>
      <td>${c.duration}</td>
      <td><span class="fee-cell">${c.fee}</span></td>
      <td><span class="seats-cell">${c.filled_seats}/${c.total_seats}</span></td>
      <td>
        <div class="occupancy-bar">
          <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:${pct}%;background:${isFull?'var(--color-danger)':parseInt(pct)>80?'var(--color-warning)':'var(--color-success)'};"></div></div>
          <span class="occupancy-pct">${pct}%</span>
        </div>
      </td>
      <td><span class="leads-count-badge">${c.lead_count || 0}</span></td>
      <td><span class="status-badge ${isFull?'status-full':'status-active'}">${isFull?'Almost Full':'Active'}</span></td>
      ${isAdmin ? `
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm btn-edit-course" data-id="${c.id}" title="Edit" style="padding:5px 10px;font-size:12px;">✏️ Edit</button>
          <button class="btn btn-danger btn-sm btn-delete-course" data-id="${c.id}" title="Delete" style="padding:5px 10px;font-size:12px;">🗑️ Delete</button>
        </div>
      </td>` : ''}
    </tr>
  `;
}

function openCourseModal(course, onSave) {
  const isEdit = !!course;
  const DEPARTMENTS = ['Engineering', 'Management', 'Sciences', 'Arts & Humanities', 'Commerce', 'Pharmacy', 'Law'];

  const content = `
    <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="form-group" style="grid-column:1/-1;">
        <label class="form-label">Course Name *</label>
        <input type="text" id="cr-name" class="form-input" value="${course?.name || ''}" placeholder="e.g. B.Tech Computer Science" required />
      </div>
      <div class="form-group">
        <label class="form-label">Course Code</label>
        <input type="text" id="cr-code" class="form-input" value="${course?.code || ''}" placeholder="BTCS" />
      </div>
      <div class="form-group">
        <label class="form-label">Department</label>
        <select id="cr-dept" class="form-input">
          ${DEPARTMENTS.map(d => `<option value="${d}" ${course?.department === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Duration</label>
        <input type="text" id="cr-duration" class="form-input" value="${course?.duration || ''}" placeholder="4 Years" />
      </div>
      <div class="form-group">
        <label class="form-label">Fee per Year</label>
        <input type="text" id="cr-fee" class="form-input" value="${course?.fee || ''}" placeholder="₹2,50,000/yr" />
      </div>
      <div class="form-group">
        <label class="form-label">Total Seats</label>
        <input type="number" id="cr-seats" class="form-input" value="${course?.total_seats || ''}" placeholder="120" min="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Filled Seats</label>
        <input type="number" id="cr-filled" class="form-input" value="${course?.filled_seats || 0}" placeholder="0" min="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="cr-status" class="form-input">
          <option value="Active" ${course?.status === 'Active' ? 'selected' : ''}>Active</option>
          <option value="Inactive" ${course?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
          <option value="Full" ${course?.status === 'Full' ? 'selected' : ''}>Full</option>
        </select>
      </div>
    </div>
    <div id="cr-error" style="color:#dc2626;font-size:13px;margin-top:8px;display:none;"></div>
  `;

  openModal(isEdit ? 'Edit Course' : 'Add Course', content, {
    submitLabel: isEdit ? 'Save Changes' : 'Add Course',
    width: '560px',
    onSubmit: async (body) => {
      const name = body.querySelector('#cr-name').value.trim();
      const errEl = body.querySelector('#cr-error');
      if (!name) {
        errEl.textContent = 'Course name is required.';
        errEl.style.display = 'block';
        return false;
      }
      await onSave({
        name,
        code: body.querySelector('#cr-code').value.trim(),
        department: body.querySelector('#cr-dept').value,
        duration: body.querySelector('#cr-duration').value.trim(),
        fee: body.querySelector('#cr-fee').value.trim(),
        total_seats: parseInt(body.querySelector('#cr-seats').value) || 0,
        filled_seats: parseInt(body.querySelector('#cr-filled').value) || 0,
        status: body.querySelector('#cr-status').value
      });
    }
  });
}
