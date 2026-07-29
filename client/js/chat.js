/**
 * chat.js - 聊天核心
 * Socket.IO 通信 + 房间管理 + 在线列表 + 发送状态
 */

const Chat = (() => {
  let socket = null;
  let user = null;
  let currentRoom = "lobby"; // "lobby" 或 "private:<userId>"
  let isConnected = false;
  let callbacks = {};
  let onlineUsers = []; // [{id, name, color}]
  let sentStatus = new Map(); // noteId -> { status, to }
  let readByPeer = new Set();

  function on(event, fn) { callbacks[event] = fn; }

  function emit(event, data) {
    if (socket) socket.emit(event, data);
  }

  function init(userInfo) {
    user = userInfo;
    const url = location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "http://localhost:3000" : location.origin;
    socket = io(url, { transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      isConnected = true;
      socket.emit("join", { name: user.name, room: "lobby" });
      callbacks["connect"]?.();
    });

    socket.on("disconnect", () => {
      isConnected = false;
      callbacks["disconnect"]?.();
    });

    socket.on("welcome", data => {
      if (data.users) onlineUsers = data.users;
      callbacks["welcome"]?.(data);
    });

    socket.on("online-update", users => {
      onlineUsers = users;
      callbacks["online-update"]?.(users);
    });

    socket.on("new-note", note => {
      callbacks["new-note"]?.(note);
    });

    socket.on("note-sent", data => {
      callbacks["note-sent"]?.(data);
    });

    socket.on("note-read", data => {
      readByPeer.add(data.id);
      callbacks["note-read"]?.(data);
    });

    socket.on("note-failed", data => {
      callbacks["note-failed"]?.(data);
    });

    socket.on("room-history", data => {
      callbacks["room-history"]?.(data);
    });

    socket.on("room-switched", data => {
      callbacks["room-switched"]?.(data);
    });
  }

  function getOnline() { return onlineUsers.filter(u => u.id !== user.id); }
  function getAll() { return onlineUsers; }
  function isOnline() { return isConnected; }
  function getRoom() { return currentRoom; }
  function getUser() { return user; }

  function sendNote(note) {
    if (!isConnected) return false;
    const target = currentRoom.startsWith("private:") ? currentRoom.slice(8) : null;
    const payload = Object.assign({}, note, {
      room: currentRoom,
      to: target,
      from: user.id,
      fromName: user.name
    });
    sentStatus.set(note.id, { status: "sending", to: target });
    socket.emit("send-note", payload);
    sentStatus.set(note.id, { status: "sent", to: target });
    return true;
  }

  function markRead(noteId, peerId) {
    socket.emit("mark-read", { id: noteId, to: peerId });
  }

  function switchRoom(room) {
    currentRoom = room;
    Note.clearAll();
    socket.emit("switch-room", { room });
  }

  function getSentStatus(noteId) { return sentStatus.get(noteId); }
  function isReadByPeer(noteId) { return readByPeer.has(noteId); }

  return {
    init, on, emit, sendNote, markRead, switchRoom,
    getOnline, getAll, isOnline, getRoom, getUser,
    getSentStatus, isReadByPeer
  };
})();