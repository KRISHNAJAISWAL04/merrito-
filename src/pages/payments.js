import { createPayment, fetchPayments, updatePayment } from '../lib/api.js';
import { openModal } from '../components/modal.js';

function userRole() {
  try { return JSON.parse(sessionStorage.getItem('rbmi_user') || '{}').role || 'admin'; } catch { return 'admin'; }
}

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function badge(value) {
  const map = { paid: 'ok', due: 'warn', failed: 'bad', waived: 'info' };
  return `<span class="ops-badge ${map[value] || 'info'}">${value}</span>`;
}

export async function renderPayments(el) {
  const role = userRole();
  const items = await fetchPayments();
  const due = items.filter(i => i.status === 'due').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paid = items.filter(i => i.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);

  el.innerHTML = `
    <div class="ops-shell">
      <div class="ops-header">
        <div><span class="eyebrow">Fee Desk</span><h1>${role === 'student' ? 'My Payments' : 'Payment Manager'}</h1><p>Track fee dues, receipts, confirmation status, and admission payments.</p></div>
        ${role === 'student' ? '' : '<button class="btn btn-primary" id="new-payment">Add Fee</button>'}
      </div>
      <div class="ops-stats"><div><strong>${money(due)}</strong><span>Due</span></div><div><strong>${money(paid)}</strong><span>Collected</span></div><div><strong>${items.length}</strong><span>Records</span></div></div>
      <div class="ops-table-wrap">
        <table class="data-table"><thead><tr><th>Student</th><th>Fee</th><th>Amount</th><th>Status</th><th>Due date</th><th>Receipt</th><th>Action</th></tr></thead><tbody>
          ${items.length ? items.map(item => `<tr><td><strong>${item.student_name}</strong></td><td>${item.title}</td><td>${money(item.amount)}</td><td>${badge(item.status)}</td><td>${item.due_date || '-'}</td><td>${item.receipt_no || '-'}</td><td><button class="btn btn-secondary btn-sm pay-action" data-id="${item.id}">${item.status === 'paid' ? 'Receipt' : role === 'student' ? 'Pay Now' : 'Mark Paid'}</button></td></tr>`).join('') : '<tr><td colspan="7" class="ops-empty">No payments yet</td></tr>'}
        </tbody></table>
      </div>
    </div>`;

  el.querySelector('#new-payment')?.addEventListener('click', () => {
    openModal('Add Fee Record', `
      <div class="form-group"><label class="form-label">Student name</label><input id="p-name" class="form-input"></div>
      <div class="form-group"><label class="form-label">Title</label><input id="p-title" class="form-input" value="Admission fee"></div>
      <div class="form-group"><label class="form-label">Amount</label><input id="p-amount" type="number" class="form-input" value="25000"></div>
      <div class="form-group"><label class="form-label">Due date</label><input id="p-date" type="date" class="form-input"></div>
    `, { submitLabel: 'Create', onSubmit: async (body) => {
      await createPayment({ student_name: body.querySelector('#p-name').value, title: body.querySelector('#p-title').value, amount: body.querySelector('#p-amount').value, due_date: body.querySelector('#p-date').value });
      window.dispatchEvent(new CustomEvent('rbmi:refresh'));
    }});
  });

  el.querySelectorAll('.pay-action').forEach(button => button.addEventListener('click', async () => {
    await updatePayment(button.dataset.id, { status: 'paid', method: 'Online' });
    window.dispatchEvent(new CustomEvent('rbmi:refresh'));
  }));
}
