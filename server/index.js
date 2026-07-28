/**
 * 手写小纸条聊天服务器
 * Node.js + Express + Socket.IO + Redis
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Redis 客户端配置
const redis = require('redis');
let redisClient;

// 初始化 Redis 连接
async function initRedis() {
  try {
    // 使用环境变量或默认本地连接
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.log('Redis 重连次数过多，禁用 Redis 功能');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.log('Redis 连接错误:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('✓ Redis 连接成功');
    });

    await redisClient.connect();
    return true;
  } catch (error) {
    console.log('⚠ Redis 连接失败，功能将受限:', error.message);
    return false;
  }
}

// 存储活跃用户和消息
const users = new Map(); // socketId -> { id, name, color }
const messages = []; // 内存中存储最近消息

// 随机用户颜色
const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22'];
function getRandomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

// 生成随机用户名
function generateUsername() {
  const adjectives = ['快乐', '开心', '阳光', '星星', '梦想', '云朵', '微风', '彩虹'];
  const nouns = ['小纸条', '纸飞机', '小熊', '猫咪', '兔子', '狐狸', '小鸟', '小鱼'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return adj + noun;
}

const app = express();
const server = http.createServer(app);

// CORS 配置
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST']
}));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../client')));

// Socket.IO 配置
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// API: 获取历史消息
app.get('/api/messages', async (req, res) => {
  try {
    // 优先从 Redis 获取
    if (redisClient && redisClient.isOpen) {
      const cachedMessages = await redisClient.get('chat:messages');
      if (cachedMessages) {
        return res.json(JSON.parse(cachedMessages));
      }
    }
    // 否则返回内存中的消息
    res.json(messages.slice(-50)); // 返回最近50条
  } catch (error) {
    console.error('获取消息失败:', error);
    res.json(messages.slice(-50));
  }
});

// API: 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    redis: redisClient?.isOpen || false,
    users: users.size,
    uptime: process.uptime()
  });
});

// Socket.IO 事件处理
io.on('connection', (socket) => {
  console.log(`[连接] 新用户连接: ${socket.id}`);

  // 用户加入
  socket.on('join', async (data) => {
    const user = {
      id: socket.id,
      name: data?.name || generateUsername(),
      color: getRandomColor(),
      joinedAt: Date.now()
    };
    users.set(socket.id, user);

    // 发送欢迎消息和用户信息
    socket.emit('welcome', {
      user,
      users: Array.from(users.values()),
      message: '欢迎加入小纸条世界！'
    });

    // 广播用户加入
    socket.broadcast.emit('user-joined', {
      user,
      message: `${user.name} 加入聊天`
    });

    // 如果有 Redis，保存用户会话
    if (redisClient?.isOpen) {
      try {
        await redisClient.set(`user:${socket.id}`, JSON.stringify(user), { EX: 3600 });
      } catch (e) {
        // 忽略 Redis 错误
      }
    }

    console.log(`[加入] ${user.name} (${socket.id})`);
  });

  // 笔迹数据实时同步（逐帧传输）
  socket.on('stroke-data', (data) => {
    // 实时转发笔迹数据给其他用户
    socket.broadcast.emit('stroke-update', {
      userId: socket.id,
      ...data
    });
  });

  // 笔迹完成（单笔）
  socket.on('stroke-end', (data) => {
    socket.broadcast.emit('stroke-complete', {
      userId: socket.id,
      ...data
    });
  });

  // 发送纸条
  socket.on('send-note', async (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const noteData = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: socket.id,
      userName: user.name,
      userColor: user.color,
      strokes: data.strokes || [],
      timestamp: Date.now(),
      delivered: false
    };

    messages.push(noteData);

    // 限制内存中消息数量
    if (messages.length > 200) {
      messages.shift();
    }

    // 保存到 Redis
    if (redisClient?.isOpen) {
      try {
        await redisClient.set('chat:messages', JSON.stringify(messages.slice(-50)));
      } catch (e) {
        // 忽略
      }
    }

    // 确认发送成功
    socket.emit('note-sent', {
      ...noteData,
      delivered: true
    });

    // 广播给其他用户
    socket.broadcast.emit('new-note', noteData);

    console.log(`[纸条] ${user.name} 发送了新纸条`);
  });

  // 用户断开
  socket.on('disconnect', async () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);

      // 从 Redis 删除
      if (redisClient?.isOpen) {
        try {
          await redisClient.del(`user:${socket.id}`);
        } catch (e) {
          // 忽略
        }
      }

      io.emit('user-left', {
        user,
        message: `${user.name} 离开了`
      });

      console.log(`[离开] ${user.name}`);
    }
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

async function start() {
  console.log('🚀 启动手写小纸条服务器...');

  // 初始化 Redis
  await initRedis();

  server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║     📝 手写小纸条聊天服务器已启动          ║
╠═══════════════════════════════════════════╣
║  端口: ${PORT}                              ║
║  地址: http://localhost:${PORT}              ║
╚═══════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);
