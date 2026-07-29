// settings.js - localStorage 为主，预置 15 条颜文字
export const SETTINGS_KEY = 'notechat_settings_v1';

export function defaultSettings() {
  return {
    nickname: '',
    // avatar: dataURL string (base64) or blob URL string
    avatar: null,
    // 标记是否曾保存过 directory handle（实际 handle 存 IndexedDB）
    directoryPersisted: false,
    // 15 条预置颜文字
    emojiPreset: [
      '(＾▽＾)', '(≧▽≦)', '(￣▽￣)', '٩(˘◡˘)۶', '(╯°□°）╯︵ ┻━┻',
      "(●'◡'●)", '(⌒‿⌒)', '(ʘ‿ʘ)', '(•‿•)', '(╥﹏╥)',
      '(｡◕‿◕｡)', '(¬_¬)', '(づ｡◕‿‿◕｡)づ', '(^_−)☆', '(´･_･`)'
    ]
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    // ensure missing keys filled
    const def = defaultSettings();
    return Object.assign(def, parsed);
  } catch (e) {
    console.error('loadSettings error', e);
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('saveSettings error', e);
  }
}

// helper: store avatar from File -> dataURL and save
export async function avatarFromFileAndSave(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const settings = loadSettings();
        settings.avatar = reader.result; // dataURL
        saveSettings(settings);
        resolve(reader.result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
