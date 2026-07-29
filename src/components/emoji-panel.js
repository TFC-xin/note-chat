import { loadSettings } from '../utils/settings.js';

const emojiPanel = document.getElementById('emojiPanel');
const settings = loadSettings();
const presets = settings.emojiPreset || ['(＾▽＾)', '(≧▽≦)', '(￣▽￣)', '٩(˘◡˘)۶', '(╯°□°）╯︵ ┻━┻'];

function createEmojiButton(emo) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'emoji-btn';
  btn.textContent = emo;
  btn.addEventListener('click', () => {
    sendNoteWithAnimation(emo);
  });
  return btn;
}

function fillPanel() {
  if (!emojiPanel) return;
  emojiPanel.innerHTML = '';
  presets.forEach(e => emojiPanel.appendChild(createEmojiButton(e)));
}
fillPanel();

function sendNoteWithAnimation(content) {
  // 触发发送事件，实际发送逻辑替换这里
  const note = {
    senderId: 'local',
    content,
    timestamp: Date.now()
  };
  // dispatch 事件给消息模块
  window.dispatchEvent(new CustomEvent('notechat:send', { detail: note }));
  // 简单动画：在屏幕右下角显示飞入效果
  const anim = document.createElement('div');
  anim.className = 'emoji-fly';
  anim.textContent = content;
  document.body.appendChild(anim);
  // CSS 动画结束后移除
  anim.addEventListener('animationend', () => anim.remove());
}
