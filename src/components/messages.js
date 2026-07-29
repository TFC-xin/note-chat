// 渲染消息列表时：把自己发出的消息默认展开，兼容 class/aria 与 data 属性
// messages: array of {id, senderId, senderName, content, timestamp, ...}
// currentUserId 从 settings 或登录状态取得
export function renderMessages(messages, currentUserId) {
  const container = document.getElementById('messages');
  if (!container) return;
  container.innerHTML = '';

  // convert currentUserId to string for robust comparison
  const meId = currentUserId != null ? String(currentUserId) : null;

  messages.forEach(msg => {
    const el = document.createElement('div');
    el.className = 'note';

    // normalize sender id too
    const senderId = msg.senderId != null ? String(msg.senderId) : null;
    const isMine = meId !== null && senderId === meId;

    if (isMine) {
      el.classList.add('mine', 'expanded');      // add expanded class (widely used pattern)
      el.setAttribute('aria-expanded', 'true');  // accessible hint
      el.dataset.expanded = 'true';
    } else {
      el.setAttribute('aria-expanded', 'false');
      el.dataset.expanded = 'false';
    }

    el.innerHTML = `
      <div class="meta">${escapeHtml(msg.senderName)} · ${new Date(msg.timestamp).toLocaleTimeString()}</div>
      <div class="content">${escapeHtml(msg.content)}</div>
    `;
    container.appendChild(el);
  });
}
function escapeHtml(s){return (s+'').replace(/[&<>\"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c]));}
