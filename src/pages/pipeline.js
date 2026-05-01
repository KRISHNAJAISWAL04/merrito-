// ===== PIPELINE / KANBAN PAGE — API-connected =====
import { fetchPipeline, updateLead } from '../lib/api.js';
import { getAvatarColor } from '../components/utils.js';

const STAGES = [
  { id: 'enquiry', label: 'Enquiry', color: '#8b5cf6' },
  { id: 'counseling_scheduled', label: 'Counseling Scheduled', color: '#3b82f6' },
  { id: 'counseling_done', label: 'Counseling Done', color: '#06b6d4' },
  { id: 'application_submitted', label: 'Application Submitted', color: '#f59e0b' },
  { id: 'documents_verified', label: 'Documents Verified', color: '#f97316' },
  { id: 'admitted', label: 'Admitted', color: '#10b981' },
  { id: 'enrolled', label: 'Enrolled', color: '#059669' }
];

let draggedCard = null;

export async function renderPipeline(container) {
  container.innerHTML = `
    <div class="pipeline-page">
      <div class="page-header"><div><h1 class="page-title">Admissions Pipeline</h1><p class="page-subtitle">Loading pipeline...</p></div></div>
      <div class="kanban-board" id="kanban-board">
        ${STAGES.map(s => `<div class="kanban-column skeleton-card"><div class="skeleton-block" style="height:300px;"></div></div>`).join('')}
      </div>
    </div>
  `;

  try {
    const pipeline = await fetchPipeline();
    renderBoard(container, pipeline);
  } catch (err) {
    container.innerHTML = `
      <div class="pipeline-page">
        <div class="page-header"><div><h1 class="page-title">Admissions Pipeline</h1></div></div>
        <div class="error-state"><p>Failed to load pipeline: ${err.message}</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div>
      </div>
    `;
  }
}

function renderBoard(container, pipeline) {
  container.innerHTML = `
    <div class="pipeline-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Admissions Pipeline</h1>
          <p class="page-subtitle">Drag and drop leads across stages to update their status.</p>
        </div>
        <div class="pipeline-legend">
          ${STAGES.map(s => `
            <span class="legend-item">
              <span class="legend-dot" style="background:${s.color};"></span>
              ${s.label} (${(pipeline[s.id] || []).length})
            </span>
          `).join('')}
        </div>
      </div>

      <div class="kanban-board" id="kanban-board">
        ${STAGES.map(s => {
          const leads = pipeline[s.id] || [];
          return `
          <div class="kanban-column" data-stage="${s.id}">
            <div class="kanban-col-header">
              <div class="kanban-col-title">
                <span class="kanban-col-dot" style="background:${s.color};"></span>
                <span>${s.label}</span>
              </div>
              <span class="kanban-col-count">${leads.length}</span>
            </div>
            <div class="kanban-cards" data-stage="${s.id}">
              ${leads.slice(0, 10).map(lead => renderKanbanCard(lead)).join('')}
              ${leads.length > 10 ? `<div class="kanban-more">+${leads.length - 10} more</div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;

  window.renderIcons();
  initDragAndDrop(container);
}

function renderKanbanCard(lead) {
  const daysAgo = Math.floor((Date.now() - new Date(lead.updated_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const initials = lead.name.split(' ').map(n => n[0]).join('');
  return `
    <div class="kanban-card" draggable="true" data-lead-id="${lead.id}">
      <div class="kanban-card-header">
        <div class="table-user">
          <div class="avatar-xs" style="background:${getAvatarColor(lead.name)}">${initials}</div>
          <span class="kanban-card-name">${lead.name}</span>
        </div>
        <span class="kanban-priority priority-${lead.priority}"></span>
      </div>
      <div class="kanban-card-body">
        <div class="kanban-card-course"><i data-lucide="graduation-cap" style="width:13px;height:13px;"></i> ${lead.course_name}</div>
        <div class="kanban-card-meta">
          <span class="kanban-card-counselor"><i data-lucide="user" style="width:12px;height:12px;"></i> ${(lead.counselor_name || '').split(' ')[0]}</span>
          <span class="kanban-card-days">${daysAgo}d ago</span>
        </div>
      </div>
    </div>
  `;
}

function initDragAndDrop(container) {
  const board = container.querySelector('#kanban-board');
  if (!board) return;

  board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.kanban-card');
    if (!card) return;
    draggedCard = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  board.addEventListener('dragend', (e) => {
    const card = e.target.closest('.kanban-card');
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
    draggedCard = null;
  });

  board.querySelectorAll('.kanban-cards').forEach(col => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => { col.classList.remove('drag-over'); });

    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      if (!draggedCard) return;

      const leadId = draggedCard.dataset.leadId;
      const newStage = col.dataset.stage;

      try {
        await updateLead(leadId, { stage: newStage });
        // Re-fetch and re-render
        const pipeline = await fetchPipeline();
        renderBoard(container, pipeline);
      } catch (err) {
        console.error('Failed to update stage:', err);
      }
    });
  });
}
