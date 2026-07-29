import { loadSettings, saveSettings, avatarFromFileAndSave } from '../utils/settings.js';
import { saveDirectoryHandle, getDirectoryHandle, verifyPermission } from '../utils/idb.js';

const nicknameInput = document.getElementById('nickname');
const avatarFile = document.getElementById('avatarFile');
const avatarPreview = document.getElementById('avatarPreview');
const chooseFolderBtn = document.getElementById('chooseFolderBtn');
const enterBtn = document.getElementById('enterBtn');
const resetAvatarBtn = document.getElementById('resetAvatarBtn');

let settings = loadSettings();

async function applySettingsToUI() {
  settings = loadSettings();
  nicknameInput.value = settings.nickname || '';
  if (settings.avatar) {
    avatarPreview.src = settings.avatar; // assume dataURL or blobURL
  } else {
    avatarPreview.src = '/assets/default-avatar.png';
  }

  // if directory persisted, try to recover a sample image to preview
  if (settings.directoryPersisted && 'showDirectoryPicker' in window) {
    try {
      const handle = await getDirectoryHandle();
      if (handle) {
        const ok = await verifyPermission(handle, false);
        if (ok) {
          for await (const [name, entry] of handle.entries()) {
            if (entry.kind === 'file' && name.match(/\.(png|jpe?g|gif)$/i)) {
              const file = await entry.getFile();
              const dataUrl = await fileToDataURL(file);
              settings.avatar = dataUrl;
              saveSettings(settings);
              avatarPreview.src = dataUrl;
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn('recover directory image failed', err);
    }
  }
}

applySettingsToUI();

nicknameInput.addEventListener('input', () => {
  settings.nickname = nicknameInput.value;
  saveSettings(settings);
});

// 选择头像
avatarFile.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const dataUrl = await avatarFromFileAndSave(file);
    avatarPreview.src = dataUrl;
  } catch (err) {
    console.error('avatar save failed', err);
  }
});

resetAvatarBtn.addEventListener('click', async () => {
  settings.avatar = null;
  settings.directoryPersisted = false;
  saveSettings(settings);
  avatarPreview.src = '/assets/default-avatar.png';
  try { await import('../utils/idb.js').then(m=>m.removeDirectoryHandle()); } catch(e){/* ignore */}
});

// 连接相册/文件夹（File System Access API）
chooseFolderBtn.addEventListener('click', async () => {
  if ('showDirectoryPicker' in window) {
    try {
      const handle = await window.showDirectoryPicker();
      // request permission
      const ok = await verifyPermission(handle, false);
      if (!ok) {
        alert('需要读取权限以访问相册/文件夹');
        return;
      }
      await saveDirectoryHandle(handle);
      settings.directoryPersisted = true;
      // find first image file to use as avatar preview
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind === 'file' && name.match(/\.(png|jpe?g|gif)$/i)) {
          const file = await entry.getFile();
          const dataUrl = await fileToDataURL(file);
          settings.avatar = dataUrl;
          saveSettings(settings);
          avatarPreview.src = dataUrl;
          break;
        }
      }
    } catch (err) {
      console.warn('Directory pick cancelled or failed', err);
    }
  } else {
    alert('当前浏览器不支持选择文件夹，将使用文件选择作为替代。');
    avatarFile.click();
  }
});

// 入席：点击入席时保存并触发现有聊天组件（不跳转页面）
enterBtn.addEventListener('click', () => {
  settings.nickname = nicknameInput.value;
  saveSettings(settings);
  window.dispatchEvent(new CustomEvent('notechat:enter', { detail: settings }));
});

// helper to convert a File to dataURL
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
