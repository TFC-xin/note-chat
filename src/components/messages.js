// 渲染消息列表时：把自己发出的消息默认展开
// messages: array of {id, senderId, senderName, content, timestamp, ...}
// currentUserId 从 settings 或登录状态取得
export function renderMessages(messages, currentUserId) {
  const container = document.getElementById('messages');
  if (!container) return;
  container.innerHTML = '';
  messages.forEach(msg => {
    const el = document.createElement('div');
    el.className = 'note';
    if (msg.senderId === currentUserId) {
      el.classList.add('mine');
      el.dataset.expanded = 'true'; // 用 data 属性表明默认展开
    } else {
      el.dataset.expanded = 'false';
    }
    el.innerHTML = `
      <div class="meta">${escapeHtml(msg.senderName)} · ${new Date(msg.timestamp).toLocaleTimeString()}</div>
      <div class="content">${escapeHtml(msg.content)}</div>
    `;
    container.appendChild(el);
  });
}
function escapeHtml(s){return (s+'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));}
