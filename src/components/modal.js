// ===== MODAL COMPONENT =====

export function openModal(title, contentHTML, options = {}) {
  const root = document.getElementById('modal-root');
  const { width = '560px', onSubmit, submitLabel = 'Save', showFooter = true, cancelLabel = 'Cancel' } = options;

  root.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-container" style="max-width: ${width};">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="modal-close-btn" type="button">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body">
          ${contentHTML}
        </div>
        ${showFooter ? `
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn" type="button">${cancelLabel}</button>
          <button class="btn btn-primary" id="modal-submit-btn" type="button">${submitLabel}</button>
        </div>
        ` : ''}
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    root.querySelector('.modal-overlay')?.classList.add('active');
  });

  window.renderIcons();

  const close = () => {
    const overlay = root.querySelector('.modal-overlay');
    if (overlay) overlay.classList.remove('active');
    setTimeout(() => { root.innerHTML = ''; }, 200);
  };

  root.querySelector('#modal-close-btn')?.addEventListener('click', close);
  root.querySelector('#modal-cancel-btn')?.addEventListener('click', close);
  root.querySelector('#modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') close();
  });

  if (onSubmit) {
    root.querySelector('#modal-submit-btn')?.addEventListener('click', async () => {
      const btn = root.querySelector('#modal-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const result = await onSubmit(root.querySelector('.modal-body'));
        if (result !== false) close();
      } catch (err) {
        console.error('Modal submit error:', err);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = submitLabel;
        }
      }
    });
  }

  return { close };
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  const overlay = root.querySelector('.modal-overlay');
  if (overlay) overlay.classList.remove('active');
  setTimeout(() => { root.innerHTML = ''; }, 200);
}
