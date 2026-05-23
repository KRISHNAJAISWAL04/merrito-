import { createPayment, fetchPayments, updatePayment, exportPaymentsCSV } from '../lib/api.js';
import { openModal } from '../components/modal.js';

function userRole() {
  try { return JSON.parse(sessionStorage.getItem('rbmi_user') || '{}').role || 'admin'; } catch { return 'admin'; }
}

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function badge(value) {
  const map = { paid: 'ok', due: 'warn', partial: 'info', failed: 'bad', waived: 'info' };
  return `<span class="ops-badge ${map[value] || 'info'}">${value}</span>`;
}

function normalizeInstallments(item) {
  if (Array.isArray(item.installments) && item.installments.length) return item.installments;
  return [{
    id: item.id + '-full',
    title: 'Full payment',
    amount: Number(item.amount || 0),
    status: item.status || 'due',
    due_date: item.due_date || '',
    paid_at: item.status === 'paid' ? item.updated_at : null,
    receipt_no: item.receipt_no || ''
  }];
}

function receiptNumber(item, inst) {
  return inst.receipt_no || item.receipt_no || `RBMI-${Date.now().toString().slice(-6)}`;
}

async function markInstallmentPaid(item, instId) {
  const installments = normalizeInstallments(item).map(inst => inst.id === instId ? {
    ...inst,
    status: 'paid',
    paid_at: new Date().toISOString(),
    receipt_no: receiptNumber(item, inst)
  } : inst);
  await updatePayment(item.id, { installments, method: 'Online' });
}

function showReceipt(item, inst = null) {
  const installment = inst || normalizeInstallments(item).find(i => i.status === 'paid') || normalizeInstallments(item)[0];
  openModal('Payment Receipt', `
    <div style="padding:8px;">
      <h2 style="margin:0 0 4px;">RBMI Admission Fee Receipt</h2>
      <p class="portal-muted" style="margin-bottom:16px;">Receipt No: ${receiptNumber(item, installment)}</p>
      <div class="doc-list">
        <div class="doc-row"><strong>Student</strong><span>${item.student_name}</span></div>
        <div class="doc-row"><strong>Fee</strong><span>${item.title} - ${installment.title}</span></div>
        <div class="doc-row"><strong>Amount</strong><span>${money(installment.amount)}</span></div>
        <div class="doc-row"><strong>Status</strong>${badge(installment.status)}</div>
        <div class="doc-row"><strong>Date</strong><span>${installment.paid_at ? new Date(installment.paid_at).toLocaleString('en-IN') : '-'}</span></div>
      </div>
    </div>
  `, { showFooter: false, width: '620px' });
}

export async function renderPayments(el) {
  const role = userRole();
  let items = [];

  try {
    items = await fetchPayments();
  } catch (error) {
    const isMissingEndpoint = /not found/i.test(error.message || '');
    el.innerHTML = `
      <div class="ops-shell">
        <div class="ops-header">
          <div>
            <span class="eyebrow">Fee Desk</span>
            <h1>${role === 'student' ? 'My Payments' : 'Payment Manager'}</h1>
            <p>Track fee dues, receipts, confirmation status, and admission payments.</p>
          </div>
        </div>
        <div class="error-state">
          <h3>${isMissingEndpoint ? 'Payments API is not available' : 'Could not load payments'}</h3>
          <p>${isMissingEndpoint ? 'The frontend is running, but the backend on port 3001 does not expose /api/payments right now. Restart the API server so the latest routes are loaded.' : error.message}</p>
          <button class="btn btn-primary" id="payments-retry">Retry</button>
        </div>
      </div>`;

    el.querySelector('#payments-retry')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('rbmi:refresh'));
    });
    return;
  }

  const due = items.filter(i => i.status === 'due').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paid = items.filter(i => i.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);

  el.innerHTML = `
    <div class="ops-shell">
      <div class="ops-header">
        <div><span class="eyebrow">Fee Desk</span><h1>${role === 'student' ? 'My Payments' : 'Payment Manager'}</h1><p>Track fee dues, receipts, confirmation status, and admission payments.</p></div>
        <div class="ops-actions">
          ${role !== 'student' ? '<button class="btn btn-secondary" id="export-pay-btn"><i data-lucide="download"></i> Export CSV</button>' : ''}
          ${role !== 'student' ? '<button class="btn btn-primary" id="new-payment">Add Fee</button>' : ''}
        </div>
      </div>
      <div class="ops-stats"><div><strong>${money(due)}</strong><span>Due</span></div><div><strong>${money(paid)}</strong><span>Collected</span></div><div><strong>${items.length}</strong><span>Records</span></div></div>
      <div class="ops-table-wrap">
        <table class="data-table"><thead><tr><th>Student</th><th>Fee</th><th>Amount</th><th>Status</th><th>Due date</th><th>Receipt</th><th>Action</th></tr></thead><tbody>
          ${items.length ? items.map(item => {
            const installments = normalizeInstallments(item);
            const nextDue = installments.find(inst => inst.status !== 'paid') || installments[0];
            const paidCount = installments.filter(inst => inst.status === 'paid').length;
            return `<tr><td><strong>${item.student_name}</strong><small>${paidCount}/${installments.length} installments paid</small></td><td>${item.title}</td><td>${money(item.amount)}</td><td>${badge(item.status)}</td><td>${nextDue?.due_date || item.due_date || '-'}</td><td>${item.receipt_no || installments.find(i => i.receipt_no)?.receipt_no || '-'}</td><td><button class="btn btn-secondary btn-sm pay-action" data-id="${item.id}">${item.status === 'paid' ? 'Receipt' : role === 'student' ? 'Pay Now' : 'Manage'}</button></td></tr>`;
          }).join('') : '<tr><td colspan="7" class="ops-empty">No payments yet</td></tr>'}
        </tbody></table>
      </div>
    </div>`;

  window.renderIcons();

  el.querySelector('#export-pay-btn')?.addEventListener('click', exportPaymentsCSV);

  el.querySelector('#new-payment')?.addEventListener('click', () => {
    openModal('Add Fee Record', `
      <div class="form-group"><label class="form-label">Student name</label><input id="p-name" class="form-input"></div>
      <div class="form-group"><label class="form-label">Title</label><input id="p-title" class="form-input" value="Admission fee"></div>
      <div class="form-group"><label class="form-label">Amount</label><input id="p-amount" type="number" class="form-input" value="25000"></div>
      <div class="form-group"><label class="form-label">Installments</label><input id="p-installments" type="number" min="1" max="12" class="form-input" value="1"></div>
      <div class="form-group"><label class="form-label">Due date</label><input id="p-date" type="date" class="form-input"></div>
    `, { submitLabel: 'Create', onSubmit: async (body) => {
      await createPayment({ student_name: body.querySelector('#p-name').value, title: body.querySelector('#p-title').value, amount: body.querySelector('#p-amount').value, due_date: body.querySelector('#p-date').value, installment_count: body.querySelector('#p-installments').value });
      window.dispatchEvent(new CustomEvent('rbmi:refresh'));
    }});
  });

  el.querySelectorAll('.pay-action').forEach(button => button.addEventListener('click', async () => {
    const item = items.find(payment => payment.id === button.dataset.id);
    const installments = normalizeInstallments(item);
    if (item.status === 'paid') {
      showReceipt(item);
      return;
    }
    openModal(role === 'student' ? 'Pay Fee' : 'Manage Fee', `
      <div class="doc-list">
        ${installments.map(inst => `
          <div class="doc-row">
            <div>
              <strong>${inst.title}</strong>
              <small>Due ${inst.due_date || '-'} - ${money(inst.amount)}</small>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              ${badge(inst.status)}
              ${inst.status === 'paid' ? `<button class="btn btn-secondary btn-sm receipt-inst" data-id="${inst.id}" type="button">Receipt</button>` : `<button class="btn btn-primary btn-sm pay-inst" data-id="${inst.id}" type="button">${role === 'student' ? 'Pay' : 'Mark paid'}</button>`}
            </div>
          </div>
        `).join('')}
      </div>
    `, {
      showFooter: false,
      width: '680px',
      onOpen: (body) => {
        body.querySelectorAll('.pay-inst').forEach(btn => {
          btn.onclick = async () => {
            btn.disabled = true;
            await markInstallmentPaid(item, btn.dataset.id);
            window.dispatchEvent(new CustomEvent('rbmi:refresh'));
          };
        });
        body.querySelectorAll('.receipt-inst').forEach(btn => {
          btn.onclick = () => showReceipt(item, installments.find(inst => inst.id === btn.dataset.id));
        });
      }
    });
  }));
}

