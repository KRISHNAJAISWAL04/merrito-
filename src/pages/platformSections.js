import { openModal } from '../components/modal.js';
import { fetchFormTemplates, createFormTemplate, fetchCampaigns, createCampaign } from '../lib/api.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statCards(items) {
  return `<div class="suite-stats">${items.map(item => `<div><span>${item.label}</span><strong>${item.value}</strong><small>${item.note}</small></div>`).join('')}</div>`;
}

function featureGrid(items) {
  return `<div class="suite-grid">${items.map(item => `<article class="suite-card"><div class="suite-card-icon">${item.icon}</div><div><span class="eyebrow">${item.kicker}</span><h3>${item.title}</h3><p>${item.copy}</p></div>${item.meta ? `<small>${item.meta}</small>` : ''}</article>`).join('')}</div>`;
}

function statusPill(status) {
  const key = String(status || 'active').toLowerCase();
  const cls = key.includes('live') || key.includes('active') || key.includes('ready') ? 'ok' : key.includes('draft') || key.includes('review') ? 'warn' : 'info';
  return `<span class="suite-pill ${cls}">${status}</span>`;
}

function renderSuitePage(el, config) {
  el.innerHTML = `
    <div class="suite-shell">
      <section class="suite-hero ${config.heroClass || ''}">
        <div>
          <span class="eyebrow">${config.kicker}</span>
          <h1>${config.title}</h1>
          <p>${config.subtitle}</p>
        </div>
        <button class="btn btn-primary" id="suite-primary-action">${config.action}</button>
      </section>
      ${statCards(config.stats)}
      ${config.before || ''}
      ${featureGrid(config.features)}
      ${config.after || ''}
    </div>
  `;

  el.querySelector('#suite-primary-action')?.addEventListener('click', () => {
    if (typeof config.onPrimaryClick === 'function') {
      config.onPrimaryClick(el);
      return;
    }
    openModal(config.action, config.modal || '<p class="portal-muted">This workflow UI is ready. Connect backend integration in the next step.</p>', {
      submitLabel: 'Save Draft',
      width: config.modalWidth || '620px'
    });
  });
}

export async function renderFormDesk(el) {
  let templates = [];
  try {
    templates = await fetchFormTemplates();
  } catch {
    templates = [];
  }
  const live = templates.filter(t => ['live', 'active'].includes(String(t.status || '').toLowerCase())).length;
  const rowsHtml = templates.length
    ? templates
        .slice(0, 24)
        .map(
          t =>
            `<div><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.purpose)} · ${escapeHtml(t.status)}${t.branch ? ` · ${escapeHtml(t.branch)}` : ''}</span></div>`
        )
        .join('')
    : `<div><strong>MBA Enquiry Form</strong><span>Sample row — create a form below to persist your library</span></div><div><strong>Campus Visit Form</strong><span>Sample row</span></div><div><strong>Scholarship Application</strong><span>Sample row</span></div>`;

  renderSuitePage(el, {
    kicker: 'FormDesk',
    title: 'Smart admission forms',
    subtitle: 'Create landing-page forms, application forms, walk-in capture forms, and campaign-specific enquiry forms with source tracking.',
    action: 'Create form',
    stats: [
      { label: 'Saved forms', value: String(templates.length), note: 'In workspace' },
      { label: 'Live forms', value: String(live || 0), note: 'Status live/active' },
      { label: 'Library', value: templates.length ? 'Synced' : 'Local demo', note: 'API-backed when signed in' }
    ],
    features: [
      { icon: 'F', kicker: 'Builder', title: 'Drag-and-drop fields', copy: 'Name, phone, program, campus, documents, payments, consent, and custom fields.', meta: '12 field types' },
      { icon: 'U', kicker: 'Tracking', title: 'UTM and source capture', copy: 'Every submission can carry campaign, ad, keyword, city, device, and counselor routing data.', meta: 'Auto mapped' },
      { icon: 'V', kicker: 'Validation', title: 'Duplicate prevention', copy: 'Phone/email rules, OTP-ready checks, course eligibility warnings, and spam protection UI.', meta: 'Rules ready' },
      { icon: 'E', kicker: 'Embed', title: 'Website embed center', copy: 'Generate form links, iframe snippets, QR codes, and landing page capture blocks for campaigns.', meta: 'Website ready' }
    ],
    after: `<section class="suite-panel"><div class="panel-head"><div><span class="eyebrow">Form Library</span><h2>Active capture points</h2></div>${statusPill('Live')}</div><div class="suite-rows">${rowsHtml}</div></section>`,
    onPrimaryClick: rootEl => {
      openModal(
        'Create form',
        '<div class="form-group"><label class="form-label">Form name</label><input type="text" class="form-input" id="fd-name" placeholder="MBA Enquiry Form"></div><div class="form-group"><label class="form-label">Purpose</label><select class="form-input" id="fd-purpose"><option>Lead capture</option><option>Application form</option><option>Scholarship form</option></select></div><div class="form-group"><label class="form-label">Status</label><select class="form-input" id="fd-status"><option value="draft">Draft</option><option value="live">Live</option></select></div>',
        {
          submitLabel: 'Save',
          width: '620px',
          onSubmit: async body => {
            const name = body.querySelector('#fd-name')?.value?.trim();
            const purpose = body.querySelector('#fd-purpose')?.value || 'Lead capture';
            const status = body.querySelector('#fd-status')?.value || 'draft';
            if (!name) {
              alert('Form name is required');
              return false;
            }
            try {
              await createFormTemplate({ name, purpose, status, branch: '' });
              await renderFormDesk(rootEl);
            } catch (err) {
              alert(err.message || 'Could not save form');
              return false;
            }
          }
        }
      );
    }
  });
}

export function renderCalendar(el) {
  renderSuitePage(el, {
    kicker: 'Calendar Pro',
    title: 'Counseling and follow-up calendar',
    subtitle: 'Plan callbacks, campus visits, document deadlines, payment reminders, counselor meetings, and field tasks from one calendar.',
    action: 'Schedule session',
    stats: [
      { label: 'Today', value: '14', note: 'Follow-ups due' },
      { label: 'Visits', value: '6', note: 'Campus appointments' },
      { label: 'Overdue', value: '3', note: 'Needs attention' }
    ],
    features: [
      { icon: 'C', kicker: 'Counseling', title: 'Session planner', copy: 'Book counseling calls and campus visits with status, owner, lead, program, and reminder labels.', meta: 'Reminder ready' },
      { icon: 'T', kicker: 'Tasks', title: 'Follow-up queue', copy: 'Daily counselor task view for calls, WhatsApp nudges, document reminders, and payment nudges.', meta: 'SLA visible' },
      { icon: 'G', kicker: 'Field team', title: 'Geo visit slots', copy: 'UI for check-in, route plan, school visits, fairs, and on-ground admission drives.', meta: 'Mobile ready' },
      { icon: 'R', kicker: 'Sync', title: 'Google Calendar-ready', copy: 'Designed for later calendar sync, reminders, and automated invite generation.', meta: 'Integration pending' }
    ],
    after: `<section class="suite-panel"><div class="panel-head"><div><span class="eyebrow">Today</span><h2>Schedule board</h2></div>${statusPill('Active')}</div><div class="suite-timeline"><div><time>10:30</time><strong>Aarav Mehta callback</strong><span>Documents pending - Priya</span></div><div><time>12:00</time><strong>MBA campus visit</strong><span>3 applicants - Bareilly</span></div><div><time>16:30</time><strong>Fee reminder batch</strong><span>12 due payments</span></div></div></section>`,
    modal: '<div class="form-group"><label class="form-label">Student / lead</label><input class="form-input" placeholder="Search student"></div><div class="form-group"><label class="form-label">Type</label><select class="form-input"><option>Callback</option><option>Campus visit</option><option>Document reminder</option><option>Payment reminder</option></select></div>'
  });
}

export function renderMarketing(el) {
  renderSuitePage(el, {
    kicker: 'Modern Engagement Suite',
    title: 'Email, SMS, WhatsApp and live chat',
    subtitle: 'A communication workspace for nurturing students across channels with automation, segmentation, and performance tracking.',
    action: 'Create workflow',
    stats: [
      { label: 'Messages', value: '12.8k', note: 'This month' },
      { label: 'Open rate', value: '62%', note: 'Across channels' },
      { label: 'Replies', value: '418', note: 'Need counselor action' }
    ],
    features: [
      { icon: 'W', kicker: 'WhatsApp', title: 'Live chat inbox', copy: 'Conversation cards, unread states, assigned counselor, student stage, and quick replies.', meta: 'Echo-style UI' },
      { icon: 'S', kicker: 'SMS', title: 'Instant nudges', copy: 'Payment reminders, application completion nudges, OTP-ready flows, and event alerts.', meta: 'Gateway pending' },
      { icon: 'E', kicker: 'Email', title: 'Campaign emails', copy: 'Rich templates for admission offers, document requests, and scholarship announcements.', meta: 'Templates linked' },
      { icon: 'A', kicker: 'Automation', title: 'Drip workflow builder', copy: 'Trigger-based journeys for new lead, application started, payment due, and document rejected.', meta: 'Rules ready' }
    ],
    after: `<section class="suite-panel"><div class="panel-head"><div><span class="eyebrow">Channels</span><h2>Communication performance</h2></div>${statusPill('Draft')}</div><div class="suite-bars"><div><span>WhatsApp</span><i style="--w:82%"></i><b>82%</b></div><div><span>Email</span><i style="--w:58%"></i><b>58%</b></div><div><span>SMS</span><i style="--w:46%"></i><b>46%</b></div></div></section>`,
    modal: '<div class="form-group"><label class="form-label">Workflow name</label><input class="form-input" placeholder="Application completion nurture"></div><div class="form-group"><label class="form-label">Trigger</label><select class="form-input"><option>New lead captured</option><option>Application incomplete</option><option>Payment due</option></select></div>'
  });
}

export async function renderCampaigns(el) {
  let campaigns = [];
  try {
    campaigns = await fetchCampaigns();
  } catch {
    campaigns = [];
  }
  const live = campaigns.filter(c => ['live', 'active'].includes(String(c.status || '').toLowerCase())).length;
  const rowsHtml = campaigns.length
    ? campaigns
        .slice(0, 24)
        .map(
          c =>
            `<div><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.channel)} · ${escapeHtml(c.status)}${c.budget ? ` · Budget ${escapeHtml(c.budget)}` : ''}</span></div>`
        )
        .join('')
    : `<div><strong>MBA Google Search</strong><span>Sample row — launch a campaign below to persist</span></div><div><strong>BCA Meta Lead Ads</strong><span>Sample row</span></div><div><strong>Campus Visit QR</strong><span>Sample row</span></div>`;

  renderSuitePage(el, {
    kicker: 'Campaign Manager',
    title: 'Campaign ROI and source attribution',
    subtitle: 'Plan, track, and optimize admission campaigns across Google, Meta, education portals, QR campaigns, fairs, and referrals.',
    action: 'Launch campaign',
    stats: [
      { label: 'Campaigns', value: String(campaigns.length), note: 'Saved in workspace' },
      { label: 'Live', value: String(live || 0), note: 'Status live/active' },
      { label: 'Board', value: campaigns.length ? 'Synced' : 'Local demo', note: 'API-backed when signed in' }
    ],
    features: [
      { icon: 'G', kicker: 'Google Ads', title: 'Search campaign tracking', copy: 'Keyword, source, city, device, and program-level campaign cards.', meta: 'Connector pending' },
      { icon: 'M', kicker: 'Meta', title: 'Lead ad import UI', copy: 'Facebook/Instagram campaign cards with cost, lead quality, and application conversion.', meta: 'API pending' },
      { icon: 'Q', kicker: 'Offline', title: 'QR and fair campaigns', copy: 'Education fair, school visit, campus event, and walk-in campaign source tracking.', meta: 'FormDesk linked' },
      { icon: 'R', kicker: 'ROI', title: 'Revenue attribution', copy: 'Map spend to leads, applications, admissions, payments, and counselor conversion.', meta: 'Finance linked' }
    ],
    after: `<section class="suite-panel"><div class="panel-head"><div><span class="eyebrow">Active Campaigns</span><h2>Performance board</h2></div>${statusPill('Live')}</div><div class="suite-rows">${rowsHtml}</div></section>`,
    onPrimaryClick: rootEl => {
      openModal(
        'Launch campaign',
        '<div class="form-group"><label class="form-label">Campaign name</label><input type="text" class="form-input" id="cmp-name" placeholder="MBA Google Search"></div><div class="form-group"><label class="form-label">Channel</label><select class="form-input" id="cmp-channel"><option>Google Ads</option><option>Meta Ads</option><option>Education Fair</option><option>Referral</option></select></div><div class="form-group"><label class="form-label">Budget note</label><input type="text" class="form-input" id="cmp-budget" placeholder="e.g. Rs. 50k / month"></div><div class="form-group"><label class="form-label">Status</label><select class="form-input" id="cmp-status"><option value="draft">Draft</option><option value="live">Live</option></select></div>',
        {
          submitLabel: 'Save campaign',
          width: '620px',
          onSubmit: async body => {
            const name = body.querySelector('#cmp-name')?.value?.trim();
            const channel = body.querySelector('#cmp-channel')?.value || 'Other';
            const status = body.querySelector('#cmp-status')?.value || 'draft';
            const budget = body.querySelector('#cmp-budget')?.value || '';
            if (!name) {
              alert('Campaign name is required');
              return false;
            }
            try {
              await createCampaign({ name, channel, status, budget, notes: '' });
              await renderCampaigns(rootEl);
            } catch (err) {
              alert(err.message || 'Could not save campaign');
              return false;
            }
          }
        }
      );
    }
  });
}

export function renderTemplates(el) {
  renderSuitePage(el, {
    kicker: 'Template Manager',
    title: 'Reusable message and document templates',
    subtitle: 'Manage WhatsApp, SMS, email, offer letter, fee receipt, and document-request templates from one library.',
    action: 'New template',
    stats: [
      { label: 'Templates', value: '36', note: 'Across channels' },
      { label: 'Approved', value: '24', note: 'Ready to send' },
      { label: 'Variables', value: '18', note: 'Personalization fields' }
    ],
    features: [
      { icon: 'W', kicker: 'WhatsApp', title: 'Approved WhatsApp templates', copy: 'Admission reminders, payment links, event invites, and document requests.', meta: 'Approval flow UI' },
      { icon: 'E', kicker: 'Email', title: 'Email builder library', copy: 'Offer, scholarship, webinar, application completion, and nurture templates.', meta: 'Drag-ready' },
      { icon: 'D', kicker: 'Documents', title: 'Letter templates', copy: 'Offer letters, admission confirmations, fee receipts, and application summaries.', meta: 'PDF pending' },
      { icon: 'V', kicker: 'Variables', title: 'Personalization tokens', copy: 'Student name, course, campus, counselor, fee amount, due date, and application stage.', meta: 'Tokenized' }
    ],
    after: `<section class="suite-panel"><div class="panel-head"><div><span class="eyebrow">Library</span><h2>Popular templates</h2></div>${statusPill('Ready')}</div><div class="suite-rows"><div><strong>Application Incomplete Reminder</strong><span>WhatsApp - uses student_name, course_name</span></div><div><strong>Fee Due Reminder</strong><span>SMS - uses amount, due_date</span></div><div><strong>Document Re-upload Request</strong><span>Email - uses missing_document</span></div></div></section>`,
    modal: '<div class="form-group"><label class="form-label">Template name</label><input class="form-input" placeholder="Fee due reminder"></div><div class="form-group"><label class="form-label">Channel</label><select class="form-input"><option>WhatsApp</option><option>Email</option><option>SMS</option><option>Document</option></select></div>'
  });
}

export function renderAccessControl(el) {
  renderSuitePage(el, {
    kicker: 'Access Control',
    title: 'Roles, teams and permission matrix',
    subtitle: 'Control what admins, counselors, finance teams, marketing teams, and students can see or change.',
    action: 'Invite user',
    stats: [
      { label: 'Users', value: '18', note: 'Across teams' },
      { label: 'Roles', value: '6', note: 'Customizable' },
      { label: 'Branches', value: '2', note: 'Scoped access' }
    ],
    features: [
      { icon: 'A', kicker: 'Admin', title: 'Full administrator role', copy: 'Can manage settings, users, reports, payments, campaigns, forms, and applications.', meta: 'Full access' },
      { icon: 'C', kicker: 'Counselor', title: 'Counselor workspace role', copy: 'Sees assigned leads, queries, callbacks, application updates, and follow-up tasks.', meta: 'Scoped' },
      { icon: 'F', kicker: 'Finance', title: 'Finance approval role', copy: 'Payment records, receipts, waivers, refunds, and settlement reports.', meta: 'Payments' },
      { icon: 'S', kicker: 'Student', title: 'Student portal role', copy: 'Can view own application, query, document, and fee information only.', meta: 'Self access' }
    ],
    after: `<section class="suite-panel"><div class="panel-head"><div><span class="eyebrow">Permission Matrix</span><h2>Module access</h2></div>${statusPill('Review')}</div><div class="permission-grid"><span>Module</span><span>Admin</span><span>Counselor</span><span>Student</span><b>Applications</b><i>Manage</i><i>Update</i><i>Own</i><b>Payments</b><i>Manage</i><i>View</i><i>Own</i><b>Campaigns</b><i>Manage</i><i>View</i><i>-</i></div></section>`,
    modal: '<div class="form-group"><label class="form-label">Email</label><input class="form-input" placeholder="team@rbmi.edu.in"></div><div class="form-group"><label class="form-label">Role</label><select class="form-input"><option>Admin</option><option>Counselor</option><option>Finance</option><option>Marketing</option></select></div>'
  });
}

export function renderAiAssistant(el) {
  renderSuitePage(el, {
    kicker: 'Asha AI',
    title: 'AI admission assistant and chatbot UI',
    subtitle: 'A student-facing chatbot and staff assistant surface for FAQs, lead scoring, follow-up drafts, query routing, and application guidance.',
    action: 'Open assistant',
    heroClass: 'ai-hero',
    stats: [
      { label: 'Bot replies', value: '1.2k', note: 'Sample monthly volume' },
      { label: 'Lead score', value: '84', note: 'High intent example' },
      { label: 'Saved time', value: '38h', note: 'Automation estimate' }
    ],
    features: [
      { icon: 'AI', kicker: 'Student chatbot', title: 'Admission FAQ assistant', copy: 'Answers course, fee, document, scholarship, deadline, and campus questions in portal UI.', meta: 'OpenAI-ready' },
      { icon: 'LS', kicker: 'Lead scoring', title: 'Intent and drop-off scoring', copy: 'Highlights hot leads, stuck applications, missing documents, and fee-risk students.', meta: 'Model pending' },
      { icon: 'DR', kicker: 'Drafting', title: 'Message draft assistant', copy: 'Drafts WhatsApp, SMS, email, and counselor follow-up notes from student context.', meta: 'Human review' },
      { icon: 'QC', kicker: 'Query routing', title: 'Auto classify support queries', copy: 'Routes documents, payments, applications, and scholarship questions to the right team.', meta: 'Rules ready' }
    ],
    before: `<section class="ai-chat-demo"><div class="ai-chat-head"><strong>Asha AI</strong>${statusPill('UI Ready')}</div><div class="ai-msg student">What documents are pending for my admission?</div><div class="ai-msg bot">Your Class 12 marksheet is pending. Upload it from My Application, then the document team can verify your file.</div><div class="ai-suggestions"><button>Draft reminder</button><button>Score lead</button><button>Classify query</button></div></section>`,
    onPrimaryClick: () => {
      let chatHistory = [
        { role: 'bot', text: 'Hello! I am Asha AI, your admission assistant. How can I help you today?' }
      ];

      function renderChat(body) {
        const wrap = body.querySelector('#ai-chat-history');
        if (!wrap) return;
        wrap.innerHTML = chatHistory.map(m => `
          <div class="ai-msg ${m.role}">
            ${escapeHtml(m.text)}
          </div>
        `).join('');
        wrap.scrollTop = wrap.scrollHeight;
      }

      openModal(
        'Asha AI Assistant',
        `
        <div class="ai-modal">
          <div class="ai-chat-history" id="ai-chat-history" style="height:350px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px;background:var(--color-bg-alt);border-radius:8px;margin-bottom:12px;"></div>
          <div class="form-group" style="display:flex;gap:8px;">
            <input type="text" class="form-input" id="ai-input" placeholder="Type your question..." style="flex:1">
            <button class="btn btn-primary" id="ai-send-btn">Send</button>
          </div>
          <p class="portal-muted" style="font-size:11px;margin-top:8px;">Powered by RBMI Intelligence. Connect OpenAI API to enable real-time learning.</p>
        </div>
        `,
        {
          width: '680px',
          showFooter: false,
          onOpen: (body) => {
            renderChat(body);
            const input = body.querySelector('#ai-input');
            const btn = body.querySelector('#ai-send-btn');

            const handleSend = () => {
              const text = input.value.trim();
              if (!text) return;
              chatHistory.push({ role: 'student', text });
              input.value = '';
              renderChat(body);

              // Simulate AI thinking
              setTimeout(() => {
                let reply = 'I am processing your request. Connect your OpenAI API key in Settings to get real-time admission guidance.';
                const low = text.toLowerCase();
                if (low.includes('document')) reply = 'Pending documents for most students include Class 12 marksheet and ID proof. You can check your specific checklist in the Student Portal.';
                else if (low.includes('fee') || low.includes('pay')) reply = 'Fees can be paid online via the Portal or offline at the Bareilly/Greater Noida campuses. MBA fees are currently approx. ₹25,000 per semester.';
                else if (low.includes('course') || low.includes('mba') || low.includes('bba')) reply = 'RBMI offers top-tier MBA, BBA, BCA, and B.Tech programs. Would you like to speak with a counselor about eligibility?';

                chatHistory.push({ role: 'bot', text: reply });
                renderChat(body);
              }, 800);
            };

            btn.onclick = handleSend;
            input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
          }
        }
      );
    }
  });
}

export function renderMobileApp(el) {
  renderSuitePage(el, {
    kicker: 'Mobile App',
    title: 'Admissions on the go',
    subtitle: 'A mobile-first workspace for counselors, field teams, and students with calls, voice notes, push reminders, geo visits, and query handling.',
    action: 'Preview app flow',
    heroClass: 'mobile-hero',
    stats: [
      { label: 'Push alerts', value: '94%', note: 'Reminder reach' },
      { label: 'Calls logged', value: '286', note: 'This month' },
      { label: 'Visits', value: '42', note: 'Field check-ins' }
    ],
    features: [
      { icon: '??', kicker: 'Telephony', title: 'One-tap calling UI', copy: 'Call students from lead/application cards and log outcomes automatically later.', meta: 'Telephony pending' },
      { icon: '??', kicker: 'Field force', title: 'Geo check-in and route plan', copy: 'Field teams can check in/out, record school visits, and view route history.', meta: 'PWA-ready' },
      { icon: '??', kicker: 'Voice notes', title: 'Voice notes and voice search', copy: 'Mobile UI for quick notes and searching leads/applications by voice.', meta: 'Native pending' },
      { icon: '??', kicker: 'Push', title: 'Push reminders', copy: 'Follow-up, payment, query, and document deadline notifications for teams and students.', meta: 'Service worker pending' }
    ],
    before: `<section class="phone-preview"><div class="phone-frame"><div class="phone-top"></div><div class="phone-screen"><strong>RBMI Hub</strong><span>Today</span><div>14 follow-ups</div><div>6 campus visits</div><div>3 fee reminders</div><button>Start calling</button></div></div><div><h2>Mobile-ready sections now exist</h2><p class="portal-muted">This is a UI/PWA surface. A real Android/iOS app can later reuse the same APIs with React Native or Capacitor.</p></div></section>`,
    modal: '<p class="portal-muted">Mobile UI preview is ready. Next step: convert to PWA install prompt or build React Native/Capacitor app.</p>'
  });
}

export function renderIntegrations(el) {
  renderSuitePage(el, {
    kicker: 'Integrations',
    title: 'Connect admission tools and data sources',
    subtitle: 'A central integration center for website forms, Supabase, WhatsApp, SMS, payment gateway, ad platforms, telephony, and automation tools.',
    action: 'Add connector',
    stats: [
      { label: 'Connectors', value: '12', note: 'UI cards ready' },
      { label: 'Webhooks', value: '4', note: 'Lead capture flows' },
      { label: 'Pending', value: '8', note: 'Need credentials' }
    ],
    features: [
      { icon: 'SB', kicker: 'Database', title: 'Supabase', copy: 'Auth, database, storage, and row-level security connection center.', meta: 'Planned' },
      { icon: 'WA', kicker: 'Messaging', title: 'WhatsApp Business', copy: 'Live chat, templates, delivery reports, and campaign replies.', meta: 'Credentials needed' },
      { icon: 'RP', kicker: 'Payments', title: 'Razorpay / Stripe', copy: 'Payment links, receipts, failed payments, refunds, and settlement tracking.', meta: 'Gateway pending' },
      { icon: 'AD', kicker: 'Ads', title: 'Google and Meta Ads', copy: 'Campaign import, source attribution, cost, conversion, and ROI reporting.', meta: 'API pending' },
      { icon: 'N8', kicker: 'Automation', title: 'n8n and webhooks', copy: 'Route website leads, application updates, and notification workflows.', meta: 'Webhook ready' },
      { icon: 'CT', kicker: 'Telephony', title: 'Cloud calling', copy: 'Call masking, call logs, recordings, and caller ID for counselors.', meta: 'Vendor pending' }
    ],
    after: `<section class="suite-panel"><div class="panel-head"><div><span class="eyebrow">Connection Status</span><h2>Setup checklist</h2></div>${statusPill('Pending')}</div><div class="suite-rows"><div><strong>Supabase</strong><span>Add URL, anon key, service role, schema, RLS policies</span></div><div><strong>WhatsApp</strong><span>Add business API credentials and approved templates</span></div><div><strong>Payment Gateway</strong><span>Add key, webhook secret, callback URL</span></div></div></section>`,
    modal: '<div class="form-group"><label class="form-label">Connector</label><select class="form-input"><option>Supabase</option><option>WhatsApp Business</option><option>Razorpay</option><option>Google Ads</option><option>n8n</option></select></div><div class="form-group"><label class="form-label">Status</label><select class="form-input"><option>Pending credentials</option><option>Sandbox</option><option>Live</option></select></div>'
  });
}
