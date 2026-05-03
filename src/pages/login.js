import { API_BASE } from '../lib/api.js';
import { getSupabase } from '../lib/supabase.js';

export function showLogin({ onSuccess, onSignupClick }) {
  const root = document.getElementById('login-root');
  root.classList.add('show');
  root.innerHTML = `
  <div class="lp">
    <div class="lp-left">
      <div class="lp-brand">
        <img src="/logo.png" alt="RBMI Logo" style="width:108px;height:108px;object-fit:cover;border-radius:50%;border:2px solid rgba(255,255,255,0.3);padding:0;transform:scale(1.10);display:block;" />
        <div class="lp-brand-text">
          <div class="lp-brand-name">RBMI Admission Hub</div>
          <div class="lp-brand-sub">Admissions, applications and student journeys</div>
        </div>
      </div>
      <div class="lp-hero">
        <h1>Admissions<br/>That Move</h1>
        <p>Run leads, applications, fee checkpoints and student communication from one focused enrollment workspace.</p>
        <div class="lp-stats">
          <div class="lp-stat"><span class="ls-n">2</span><span class="ls-l">Campuses</span></div>
          <div class="lp-stat"><span class="ls-n">500+</span><span class="ls-l">Leads/Year</span></div>
          <div class="lp-stat"><span class="ls-n">95%</span><span class="ls-l">Follow-up Rate</span></div>
        </div>
      </div>
      <div class="lp-branches">
        <div class="lp-branch"><span>📍</span><div><strong>Bareilly Campus</strong><small>Pilibhit Bypass Road, Bareilly, UP</small></div></div>
        <div class="lp-branch"><span>📍</span><div><strong>Greater Noida Campus</strong><small>Knowledge Park, Greater Noida, UP</small></div></div>
      </div>
    </div>
    <div class="lp-right">
      <div class="lp-card">
        <div class="lp-card-logo">
          <img src="/logo.png" alt="Logo" style="width:72px;height:72px;object-fit:cover;border-radius:50%;padding:0;transform:scale(1.10);display:block;" />
          <div>
            <div style="font-weight:700;font-size:17px">RBMI Admission Hub</div>
            <div style="font-size:12px;color:#64748b">Admin, counselor and student panels</div>
          </div>
        </div>
        <h2 class="lp-title">Sign in to your account</h2>
        <div id="lerr" class="lp-err"></div>

        <button id="lgoogle" class="lp-btn lp-btn-google">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" style="width:18px;height:18px;"/>
          Sign in with Google
        </button>

        <div class="lp-div"><span>Or with email</span></div>
        <form id="lform" class="lp-form">
          <div class="lp-group">
            <label>Campus</label>
            <select id="lbranch" class="lp-input">
              <option value="bareilly">📍 Bareilly Campus</option>
              <option value="greater_noida">📍 Greater Noida Campus</option>
            </select>
          </div>
          <div class="lp-group">
            <label>Email</label>
            <input type="email" id="lemail" class="lp-input" placeholder="admin@rbmi.edu.in" required/>
          </div>
          <div class="lp-group">
            <label>Password</label>
            <input type="password" id="lpass" class="lp-input" placeholder="Enter password" required/>
          </div>
          <button type="submit" class="lp-btn" id="lbtn">Sign In</button>
        </form>
        <div class="lp-div"><span>Demo Accounts</span></div>
        <div class="lp-demos">
          <button class="lp-demo" data-e="admin@rbmi.edu.in" data-p="admin123"><span class="lp-badge admin">Admin</span><div><div class="lp-demo-name">Admin RBMI</div><div class="lp-demo-email">admin@rbmi.edu.in</div></div></button>
          <button class="lp-demo" data-e="priya@rbmi.edu.in" data-p="counselor123"><span class="lp-badge counselor">Counselor</span><div><div class="lp-demo-name">Priya Sharma</div><div class="lp-demo-email">priya@rbmi.edu.in</div></div></button>
          <button class="lp-demo" data-e="rajesh@rbmi.edu.in" data-p="counselor123"><span class="lp-badge counselor">Counselor</span><div><div class="lp-demo-name">Rajesh Kumar</div><div class="lp-demo-email">rajesh@rbmi.edu.in</div></div></button>
          <button class="lp-demo" data-e="student@demo.in" data-p="student123"><span class="lp-badge student">Student</span><div><div class="lp-demo-name">Aarav Mehta</div><div class="lp-demo-email">student@demo.in</div></div></button>
        </div>
        <div class="lp-footer-link">
          <span>Student? </span><a href="#/signup" id="go-signup">Create your account</a>
        </div>
      </div>
    </div>
  </div>`;

  setTimeout(() => window.renderIcons(), 0);

  root.querySelectorAll('.lp-demo').forEach(b => {
    b.addEventListener('click', () => {
      document.getElementById('lemail').value = b.dataset.e;
      document.getElementById('lpass').value = b.dataset.p;
    });
  });

  document.getElementById('lgoogle')?.addEventListener('click', () => {
    const branch = document.getElementById('lbranch').value;
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?branch=${branch}`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });
    } else {
      const err = document.getElementById('lerr');
      err.textContent = '⚠ Google Sign-In requires Supabase configuration';
      err.style.display = 'block';
    }
  });

  document.getElementById('lform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('lemail').value.trim();
    const pass = document.getElementById('lpass').value;
    const branch = document.getElementById('lbranch').value;
    const err = document.getElementById('lerr');
    const btn = document.getElementById('lbtn');
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Signing in...';
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, branch })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Invalid credentials');
      onSuccess(payload, branch);
      root.classList.remove('show');
      root.innerHTML = '';
    } catch (ex) {
      err.textContent = '⚠ ' + ex.message;
      err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });

  document.getElementById('go-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    onSignupClick();
  });
}

export function showSignup({ onSuccess, onLoginClick }) {
  const root = document.getElementById('login-root');
  root.classList.add('show');
  root.innerHTML = `
  <div class="lp">
    <div class="lp-left">
      <div class="lp-brand">
        <img src="/logo.png" alt="RBMI Logo" style="width:108px;height:108px;object-fit:contain;border-radius:50%;border:2px solid rgba(255,255,255,0.3);padding:0;transform:scale(1.08);" />
        <div class="lp-brand-text">
          <div class="lp-brand-name">RBMI Admission Hub</div>
          <div class="lp-brand-sub">Admissions, applications and student journeys</div>
        </div>
      </div>
      <div class="lp-hero">
        <h1>Start Your<br/>Admission Journey</h1>
        <p>Create your student account to track applications, documents, fees and communicate with your counselor.</p>
        <div class="lp-stats">
          <div class="lp-stat"><span class="ls-n">8+</span><span class="ls-l">Programs</span></div>
          <div class="lp-stat"><span class="ls-n">2</span><span class="ls-l">Campuses</span></div>
          <div class="lp-stat"><span class="ls-n">100%</span><span class="ls-l">Online Process</span></div>
        </div>
      </div>
      <div class="lp-branches">
        <div class="lp-branch"><span>📍</span><div><strong>Bareilly Campus</strong><small>Pilibhit Bypass Road, Bareilly, UP</small></div></div>
        <div class="lp-branch"><span>📍</span><div><strong>Greater Noida Campus</strong><small>Knowledge Park, Greater Noida, UP</small></div></div>
      </div>
    </div>
    <div class="lp-right">
      <div class="lp-card">
        <div class="lp-card-logo">
          <img src="/logo.png" alt="Logo" style="width:72px;height:72px;object-fit:contain;border-radius:50%;padding:0;transform:scale(1.06);" />
          <div>
            <div style="font-weight:700;font-size:17px">Student Registration</div>
            <div style="font-size:12px;color:#64748b">Create your student account</div>
          </div>
        </div>
        <h2 class="lp-title">Create Account</h2>
        <div id="serr" class="lp-err"></div>
        <form id="sform" class="lp-form">
          <div class="lp-group">
            <label>Full Name</label>
            <input type="text" id="sname" class="lp-input" placeholder="Rahul Sharma" required/>
          </div>
          <div class="lp-group">
            <label>Email</label>
            <input type="email" id="semail" class="lp-input" placeholder="rahul@gmail.com" required/>
          </div>
          <div class="lp-group">
            <label>Phone</label>
            <input type="tel" id="sphone" class="lp-input" placeholder="+91 98765 43210"/>
          </div>
          <div class="lp-group">
            <label>Campus</label>
            <select id="sbranch" class="lp-input">
              <option value="bareilly">📍 Bareilly Campus</option>
              <option value="greater_noida">📍 Greater Noida Campus</option>
            </select>
          </div>
          <div class="lp-group">
            <label>Password</label>
            <input type="password" id="spass" class="lp-input" placeholder="Min 6 characters" required minlength="6"/>
          </div>
          <div class="lp-group">
            <label>Confirm Password</label>
            <input type="password" id="spass2" class="lp-input" placeholder="Re-enter password" required/>
          </div>
          <button type="submit" class="lp-btn" id="sbtn">Create Account</button>
        </form>
        <div class="lp-footer-link">
          <span>Already have an account? </span><a href="#/login" id="go-login">Sign in</a>
        </div>
      </div>
    </div>
  </div>`;

  setTimeout(() => window.renderIcons(), 0);

  document.getElementById('sform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('sname').value.trim();
    const email = document.getElementById('semail').value.trim();
    const phone = document.getElementById('sphone').value.trim();
    const branch = document.getElementById('sbranch').value;
    const pass = document.getElementById('spass').value;
    const pass2 = document.getElementById('spass2').value;
    const err = document.getElementById('serr');
    const btn = document.getElementById('sbtn');
    err.style.display = 'none';

    if (pass !== pass2) { err.textContent = '⚠ Passwords do not match'; err.style.display = 'block'; return; }
    if (pass.length < 6) { err.textContent = '⚠ Password must be at least 6 characters'; err.style.display = 'block'; return; }

    btn.disabled = true; btn.textContent = 'Creating account...';
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, name, phone, branch })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Signup failed');
      onSuccess(payload, branch);
      root.classList.remove('show');
      root.innerHTML = '';
    } catch (ex) {
      err.textContent = '⚠ ' + ex.message;
      err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  });

  document.getElementById('go-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    onLoginClick();
  });
}
