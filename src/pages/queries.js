import { createQuery, fetchQueries, updateQuery, chatWithAI } from '../lib/api.js';
import { openModal } from '../components/modal.js';

function userRole() {
  try { return JSON.parse(sessionStorage.getItem('rbmi_user') || '{}').role || 'admin'; } catch { return 'admin'; }
}

function statusBadge(value) {
  const map = { open: 'warn', answered: 'ok', closed: 'info' };
  return `<span class="ops-badge ${map[value] || 'info'}">${value}</span>`;
}

export async function renderQueries(el) {
  const role = userRole();
  const items = await fetchQueries();
  const open = items.filter(i => i.status === 'open').length;
  const answered = items.filter(i => i.status === 'answered').length;

  el.innerHTML = `
    <div class="ops-shell">
      <div class="ops-header">
        <div><span class="eyebrow">Help Desk</span><h1>${role === 'student' ? 'My Queries' : 'Query Manager'}</h1><p>Manage admission questions, replies, and student support tickets.</p></div>
        <button class="btn btn-primary" id="new-query">Ask Question</button>
      </div>
      <div class="ops-stats"><div><strong>${items.length}</strong><span>Total</span></div><div><strong>${open}</strong><span>Open</span></div><div><strong>${answered}</strong><span>Answered</span></div></div>
      <div class="ops-list">
        ${items.length ? items.map(item => `<article class="ops-card"><div><span class="eyebrow">${item.category}</span><h3>${item.subject}</h3><p>${item.message}</p>${item.response ? `<div class="ops-response"><strong>Reply</strong><p>${item.response}</p></div>` : ''}</div><div class="ops-card-side">${statusBadge(item.status)}<small>${item.student_name}</small><button class="btn btn-secondary btn-sm query-action" data-id="${item.id}">${role === 'student' ? 'Add note' : 'Reply'}</button></div></article>`).join('') : '<div class="ops-empty">No queries yet</div>'}
      </div>
    </div>`;

  el.querySelector('#new-query')?.addEventListener('click', () => {
    openModal('New Query', `
      <div class="form-group"><label class="form-label">Subject</label><input id="q-subject" class="form-input" placeholder="What do you need help with?"></div>
      <div class="form-group"><label class="form-label">Category</label><select id="q-category" class="form-input"><option>General</option><option>Documents</option><option>Payments</option><option>Application</option></select></div>
      <div class="form-group"><label class="form-label">Message</label><textarea id="q-message" class="form-input" rows="4"></textarea></div>
    `, { submitLabel: 'Submit', onSubmit: async (body) => {
      await createQuery({ subject: body.querySelector('#q-subject').value, category: body.querySelector('#q-category').value, message: body.querySelector('#q-message').value });
      window.dispatchEvent(new CustomEvent('rbmi:refresh'));
    }});
  });

  el.querySelectorAll('.query-action').forEach(button => button.addEventListener('click', () => {
    const queryId = button.dataset.id;
    const queryItem = items.find(i => i.id == queryId);
    
    openModal(
      role === 'student' ? 'Add Note' : 'Reply to Query', 
      `
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <label class="form-label">${role === 'student' ? 'Message' : 'Response'}</label>
          ${role !== 'student' ? `<button class="btn btn-secondary btn-sm" id="ai-draft-query" style="border-color:var(--color-primary);color:var(--color-primary);">
            <i data-lucide="sparkles" style="width:12px;height:12px;margin-right:4px;"></i> AI Draft
          </button>` : ''}
        </div>
        <textarea id="q-reply" class="form-input" rows="6" placeholder="Type your response..."></textarea>
      </div>
      `, 
      { 
        submitLabel: 'Save and Send', 
        onOpen: (body) => {
          const draftBtn = body.querySelector('#ai-draft-query');
          const textarea = body.querySelector('#q-reply');
          
          if (draftBtn) {
            draftBtn.onclick = async () => {
              draftBtn.disabled = true;
              const originalText = draftBtn.innerHTML;
              draftBtn.innerHTML = 'Drafting...';
              
              try {
                const prompt = `Student asked: "${queryItem.message}" (Category: ${queryItem.category}). 
                As an RBMI admission counselor, draft a helpful, professional, and concise response. 
                Keep it under 3-4 sentences.`;
                
                const res = await chatWithAI([{ role: 'user', content: prompt }]);
                textarea.value = res.message;
              } catch (err) {
                alert('AI Draft failed: ' + err.message);
              } finally {
                draftBtn.disabled = false;
                draftBtn.innerHTML = originalText;
              }
            };
          }
        },
        onSubmit: async (body) => {
          const value = body.querySelector('#q-reply').value.trim();
          if (!value) return false;
          await updateQuery(queryId, role === 'student' ? { message: value } : { response: value, status: 'answered' });
          window.dispatchEvent(new CustomEvent('rbmi:refresh'));
        }
      }
    );
  }));
}
