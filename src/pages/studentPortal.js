import { createLead, fetchCourses, fetchPortalProfile, updatePortalProfile } from '../lib/api.js';
import { getCurrentUser } from '../lib/auth.js';

const stageLabels = {
  enquiry: 'Enquiry',
  counseling_scheduled: 'Counseling scheduled',
  counseling_done: 'Counseling done',
  application_submitted: 'Application submitted',
  documents_verified: 'Documents verified',
  admitted: 'Admitted',
  enrolled: 'Enrolled'
};

const checklist = [
  { name: 'Class 10 marksheet', status: 'verified' },
  { name: 'Class 12 marksheet', status: 'pending' },
  { name: 'ID proof', status: 'verified' },
  { name: 'Entrance scorecard', status: 'missing' }
];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function fallbackProfile(user) {
  return {
    name: user?.name || 'Student',
    email: user?.email || '',
    phone: '+91 90123 45678',
    city: 'Bareilly',
    course_name: 'MBA (Master of Business Administration)',
    stage: 'application_submitted',
    counselor_name: 'Priya Sharma',
    readiness: 78,
    next_step: 'Upload Class 12 marksheet',
    fee_due: '25000',
    scholarship: 'Merit review pending',
    branch: 'bareilly'
  };
}

function formatMoney(value) {
  const amount = Number(String(value || '0').replace(/[^\d]/g, '')) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function renderTimeline(stage) {
  const stages = ['enquiry', 'counseling_scheduled', 'application_submitted', 'documents_verified', 'admitted', 'enrolled'];
  const activeIndex = Math.max(0, stages.indexOf(stage));

  return stages.map((item, index) => `
    <div class="portal-step ${index <= activeIndex ? 'active' : ''}">
      <span>${index + 1}</span>
      <div>
        <strong>${stageLabels[item]}</strong>
        <small>${index < activeIndex ? 'Completed' : index === activeIndex ? 'In progress' : 'Upcoming'}</small>
      </div>
    </div>
  `).join('');
}

export async function renderStudentPortal(el) {
  const user = getCurrentUser();
  let profile = fallbackProfile(user);
  let courses = [];

  try {
    [profile, courses] = await Promise.all([fetchPortalProfile(), fetchCourses()]);
  } catch (error) {
    try { courses = await fetchCourses(); } catch (_) { courses = []; }
  }

  const safeName = escapeHtml(profile.name);
  const safeCourse = escapeHtml(profile.course_name || 'Choose a program');
  const readiness = Math.min(100, Math.max(0, Number(profile.readiness || 72)));

  el.innerHTML = `
    <div class="portal-shell">
      <section class="portal-hero">
        <div>
          <span class="eyebrow">Student workspace</span>
          <h1>${safeName}</h1>
          <p>${safeCourse} - ${stageLabels[profile.stage] || 'Application active'}</p>
        </div>
        <div class="portal-score" style="--score:${readiness}%">
          <span>Readiness</span>
          <strong>${readiness}%</strong>
        </div>
      </section>

      <section class="portal-grid">
        <article class="portal-panel portal-wide">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Application path</span>
              <h2>Track your admission</h2>
            </div>
            <button class="btn btn-primary" id="portal-apply-btn">Apply to another course</button>
          </div>
          <div class="portal-timeline">${renderTimeline(profile.stage || 'application_submitted')}</div>
        </article>

        <article class="portal-panel">
          <span class="eyebrow">Next action</span>
          <h2>${escapeHtml(profile.next_step || 'Connect with counselor')}</h2>
          <p class="portal-muted">Counselor: ${escapeHtml(profile.counselor_name || 'Admissions team')}</p>
          <button class="btn btn-secondary" id="portal-contact-btn">Request callback</button>
        </article>

        <article class="portal-panel">
          <span class="eyebrow">Fee desk</span>
          <h2>${formatMoney(profile.fee_due)}</h2>
          <p class="portal-muted">${escapeHtml(profile.scholarship || 'Scholarship review not started')}</p>
          <button class="btn btn-secondary" id="portal-pay-btn">Generate fee slip</button>
        </article>

        <article class="portal-panel portal-wide">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Documents</span>
              <h2>Admission checklist</h2>
            </div>
            <button class="btn btn-secondary" id="portal-upload-btn">Upload document</button>
          </div>
          <div class="doc-list">
            ${checklist.map((item) => `
              <div class="doc-row">
                <div>
                  <strong>${item.name}</strong>
                  <small>${item.status === 'missing' ? 'Needs upload' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}</small>
                </div>
                <span class="doc-status ${item.status}">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
              </div>
            `).join('')}
          </div>
        </article>

        <article class="portal-panel">
          <span class="eyebrow">Profile</span>
          <form class="portal-form" id="portal-profile-form">
            <label>Name<input class="form-input" id="portal-name" value="${safeName}"></label>
            <label>Phone<input class="form-input" id="portal-phone" value="${escapeHtml(profile.phone || '')}"></label>
            <label>City<input class="form-input" id="portal-city" value="${escapeHtml(profile.city || '')}"></label>
            <button class="btn btn-primary" type="submit">Save profile</button>
          </form>
        </article>
      </section>
    </div>
  `;

  el.querySelector('#portal-profile-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await updatePortalProfile({
      name: el.querySelector('#portal-name').value.trim(),
      phone: el.querySelector('#portal-phone').value.trim(),
      city: el.querySelector('#portal-city').value.trim()
    });
    window.dispatchEvent(new CustomEvent('rbmi:refresh'));
  });

  el.querySelector('#portal-contact-btn')?.addEventListener('click', async () => {
    const btn = el.querySelector('#portal-contact-btn');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Requesting...';
    try {
      await updatePortalProfile({ next_step: 'Callback requested! Admissions team will call you shortly.' });
      alert('Callback requested! A counselor will reach out to you shortly.');
      window.dispatchEvent(new CustomEvent('rbmi:refresh'));
    } catch (e) {
      alert('Failed to request callback: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    }
  });

  el.querySelector('#portal-upload-btn')?.addEventListener('click', async () => {
    openModal('Upload Document', `
      <div class="form-group">
        <label class="form-label">Select Document Type</label>
        <select class="form-select" id="upload-type">
          ${checklist.filter(i => i.status === 'missing' || i.status === 'pending').map(i => `<option value="${i.name}">${i.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-top:12px;">
        <label class="form-label">File</label>
        <input type="file" class="form-input" id="upload-file" accept=".pdf,.jpg,.jpeg,.png" />
        <p class="portal-muted" style="font-size:11px;margin-top:4px;">Max size: 5MB. Formats: PDF, JPG, PNG.</p>
      </div>
    `, {
      submitLabel: 'Upload & Submit',
      onSubmit: async (body) => {
        const fileInput = body.querySelector('#upload-file');
        const type = body.querySelector('#upload-type').value;
        if (!fileInput.files[0]) {
          alert('Please select a file');
          return false;
        }
        
        // Simulate upload delay
        const btn = body.parentElement.querySelector('#modal-submit-btn');
        btn.disabled = true;
        btn.innerText = 'Uploading...';
        
        await new Promise(r => setTimeout(r, 1500));
        
        await updatePortalProfile({ next_step: `Reviewing ${type} upload` });
        alert(`${type} has been uploaded successfully and sent for verification.`);
        window.dispatchEvent(new CustomEvent('rbmi:refresh'));
      }
    });
  });

  el.querySelector('#portal-pay-btn')?.addEventListener('click', async () => {
    const amount = profile.fee_due || '25000';
    openModal('RBMI Secure Pay', `
      <div class="payment-gateway-sim" style="text-align:center;padding:12px;">
        <div style="font-size:24px;font-weight:800;margin-bottom:12px;color:var(--color-primary);">₹${Number(amount).toLocaleString('en-IN')}</div>
        <p class="portal-muted">Admission Fee Installment</p>
        <hr style="margin:16px 0;border:none;border-top:1px solid var(--color-border);">
        <div class="form-group" style="text-align:left;">
          <label class="form-label">Payment Method</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
            <button class="btn btn-secondary btn-sm" style="background:var(--color-bg-alt);">UPI / QR</button>
            <button class="btn btn-secondary btn-sm">Card</button>
            <button class="btn btn-secondary btn-sm">Net Banking</button>
            <button class="btn btn-secondary btn-sm">Wallet</button>
          </div>
        </div>
        <div style="margin-top:20px;padding:12px;background:#fef9c3;border-radius:8px;font-size:12px;color:#854d0e;">
          This is a secure sandbox environment. Real payment gateway (Razorpay/Stripe) integration is ready for production credentials.
        </div>
      </div>
    `, {
      submitLabel: 'Complete Payment (Mock)',
      onSubmit: async () => {
        await new Promise(r => setTimeout(r, 2000));
        await updatePortalProfile({ 
          fee_due: '0', 
          scholarship: 'Payment successful! Receipt #RBMI-' + Date.now().toString().slice(-6) 
        });
        alert('Payment successful! Your admission seat is now reserved.');
        window.dispatchEvent(new CustomEvent('rbmi:refresh'));
      }
    });
  });

  el.querySelector('#portal-apply-btn')?.addEventListener('click', async () => {
    console.log('Apply for another course clicked');
    if (!courses || courses.length === 0) {
      alert('Courses are currently unavailable. Please try again later.');
      return;
    }
    
    openModal('Apply for Another Program', `
      <div class="form-group">
        <p class="portal-muted" style="margin-bottom:12px;">Select the course you are interested in. Our admissions team will get in touch to guide you through the transition or secondary application.</p>
        <label class="form-label">Choose Program</label>
        <select class="form-select" id="new-course-select">
          ${courses.filter(c => c.status === 'Active').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-top:16px;">
        <label class="form-label">Why are you interested in this program? (Optional)</label>
        <textarea class="form-textarea" id="new-course-notes" placeholder="e.g. Want to switch from current program, or looking for dual certification..." style="min-height:80px;"></textarea>
      </div>
    `, {
      submitLabel: 'Submit Interest',
      onSubmit: async (body) => {
        const courseId = body.querySelector('#new-course-select').value;
        const notes = body.querySelector('#new-course-notes').value.trim();
        const selectedCourse = courses.find(c => c.id == courseId);
        
        const [firstName, ...lastName] = (profile.name || 'Student').split(' ');
        
        try {
          await createLead({
            first_name: firstName,
            last_name: lastName.join(' '),
            phone: profile.phone || '',
            email: profile.email || user?.email || '',
            city: profile.city || '',
            course_id: courseId,
            source: 'Student Portal',
            stage: 'enquiry',
            priority: 'high',
            notes: notes ? `Student requested ${selectedCourse?.name}. Note: ${notes}` : `Student requested another course: ${selectedCourse?.name}`
          });
          
          await updatePortalProfile({ next_step: `Interest sent for ${selectedCourse?.name}` });
          alert('Your interest has been registered. A counselor will contact you shortly.');
          window.dispatchEvent(new CustomEvent('rbmi:refresh'));
          return true;
        } catch (err) {
          alert('Failed to submit request: ' + err.message);
          return false;
        }
      }
    });
  });
}
