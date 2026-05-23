import { openModal } from './modal.js';
import { chatWithAI } from '../lib/api.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openAshaAI(initialQuestion = '') {
  let chatHistory = [
    { role: 'assistant', content: 'Hello! I am Asha AI, your admission assistant. How can I help you today?' }
  ];
  const suggestedQuestions = [
    'What documents are required?',
    'What are the course fees?',
    'Can I apply for MBA?',
    'How do I track my application?'
  ];

  function renderChat(body) {
    const wrap = body.querySelector('#ai-chat-history');
    if (!wrap) return;
    wrap.innerHTML = chatHistory.map(m => `
      <div class="ai-msg ${m.role === 'assistant' ? 'bot' : 'student'}">
        ${escapeHtml(m.content || m.text)}
      </div>
    `).join('');
    wrap.scrollTop = wrap.scrollHeight;
  }

  openModal(
    'Asha AI Assistant',
    `
    <div class="ai-modal">
      <div class="ai-chat-history" id="ai-chat-history" style="height:320px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px;background:var(--color-bg-alt);border-radius:8px;margin-bottom:12px;"></div>
      <div class="ai-suggestions-modal" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        ${suggestedQuestions.map(q => `<button class="ai-suggest-btn" style="border:1px solid var(--color-border);padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;background:var(--color-surface);color:var(--color-text-secondary);">${q}</button>`).join('')}
      </div>
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

        const handleSend = async (overrideText) => {
          const text = overrideText || input.value.trim();
          if (!text) return;
          chatHistory.push({ role: 'user', content: text });
          if (!overrideText) input.value = '';
          renderChat(body);

          // Add a temporary "typing" message
          const typingIdx = chatHistory.length;
          chatHistory.push({ role: 'assistant', content: '...', isTyping: true });
          renderChat(body);

          try {
            // Prepare history for API
            const apiHistory = chatHistory
              .filter(m => !m.isTyping)
              .map(m => ({
                role: m.role,
                content: m.content || m.text
              }));

            const res = await chatWithAI(apiHistory);
            
            // Replace typing message with real reply
            chatHistory[typingIdx] = { role: 'assistant', content: res.message };
            renderChat(body);
          } catch (err) {
            console.error('AI error:', err);
            chatHistory[typingIdx] = { role: 'assistant', content: 'I am sorry, I encountered an error: ' + err.message };
            renderChat(body);
          }
        };

        btn.onclick = () => handleSend();
        input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
        body.querySelectorAll('.ai-suggest-btn').forEach(sbtn => {
          sbtn.onclick = () => handleSend(sbtn.innerText);
        });

        if (initialQuestion) {
          handleSend(initialQuestion);
        }
      }
    }
  );
}
