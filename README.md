# 📝 手写小纸条实时聊天

复古纸质风格的实时手写纸条聊天应用，支持逐帧笔迹动画复现。

![预览](https://img.shields.io/badge/Node.js-18+-green) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-blue) ![Redis](https://img.shields.io/badge/Redis-6+-red)

## 功能特性

- ✍️ **手写输入** - Canvas 绘制，支持鼠标和触摸屏
- 🎬 **逐帧动画** - 点击纸条可复现书写过程
- 🔄 **实时同步** - Socket.IO 实时传输笔迹
- 📱 **响应式设计** - 支持手机和电脑
- 💾 **历史记录** - Redis 存储最近消息
- 🎨 **复古界面** - 纸张纹理、阴影效果

## 技术栈

| 前端 | 后端 | 部署 |
|------|------|------|
| HTML5 Canvas | Node.js | Railway |
| CSS3 (响应式) | Express | Render |
| Socket.IO Client | Socket.IO | |
| | Redis | Redis Labs |

## 本地运行

### 前置要求

- Node.js 18+
- Redis（可选，用于消息持久化）

### 安装步骤

```bash
# 克隆项目
git clone <your-repo-url>
cd handwritten-note

# 安装依赖
npm install

# 启动服务器
npm start

# 访问 http://localhost:3000
```

### 本地 Redis（可选）

如果你有本地 Redis：

```bash
# 使用 Docker
docker run -d -p 6379:6379 redis:latest

# 或设置环境变量
export REDIS_URL=redis://localhost:6379
```

## 部署到 Railway

### 1. 创建 Railway 项目

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init
```

### 2. 添加 Redis

在 Railway 仪表盘中：
1. New Project → Add Redis
2. 获取连接 URL

### 3. 配置环境变量

在 Railway 项目设置中添加：

```
REDIS_URL=redis://default:your-password@your-redis-host:6379
PORT=3000
CLIENT_URL=https://your-app.railway.app
```

### 4. 部署

```bash
# 关联项目
railway link

# 部署
railway up

# 获取访问地址
railway domain
```

## 部署到 Render

### 1. 创建 Web Service

1. 登录 [Render Dashboard](https://dashboard.render.com)
2. New → Web Service
3. 连接 GitHub 仓库

### 2. 配置

| 设置 | 值 |
|------|-----|
| Build Command | `npm install` |
| Start Command | `npm start` |
| Plan | Free |

### 3. 环境变量

在 Render Dashboard 添加：

```
REDIS_URL=redis://default:password@host:6379
PORT=3000
```

## Redis Labs（免费层）

1. 注册 [Redis Labs](https://redislabs.com/)
2. 创建 Free-tier 数据库
3. 获取连接 URL

格式：`redis://default:password@host:port`

## 项目结构

```
handwritten-note/
├── package.json          # 依赖配置
├── server/
│   └── index.js          # Express + Socket.IO 服务器
├── client/
│   ├── index.html        # 主页面
│   ├── css/
│   │   └── style.css     # 复古纸张样式
│   └── js/
│       └── app.js        # 前端核心逻辑
└── README.md             # 本文件
```

## API 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/messages` | GET | 获取最近50条消息 |

## Socket.IO 事件

### 客户端发送

| 事件 | 数据 | 描述 |
|------|------|------|
| `join` | `{ name }` | 加入聊天 |
| `stroke-data` | `{ type, point, width }` | 实时笔迹数据 |
| `stroke-end` | `{ stroke }` | 单笔结束 |
| `send-note` | `{ strokes, width, height }` | 发送纸条 |

### 服务器推送

| 事件 | 数据 | 描述 |
|------|------|------|
| `welcome` | `{ user, users }` | 欢迎消息 |
| `user-joined` | `{ user }` | 用户加入 |
| `user-left` | `{ user }` | 用户离开 |
| `stroke-update` | `{ userId, ...data }` | 笔迹更新 |
| `new-note` | `{ id, strokes, ... }` | 新纸条 |
| `note-sent` | `{ ...note, delivered: true }` | 送达确认 |

## 使用说明

1. **进入应用** - 设置昵称后加入聊天
2. **书写纸条** - 在底部画布上书写
3. **发送** - 点击发送按钮
4. **查看动画** - 点击任意纸条查看书写动画
5. **撤销** - 点击撤销删除上一笔
6. **清空** - 点击清空重置画布

## 自定义配置

在 `client/js/app.js` 中修改：

```javascript
const config = {
  strokeColor: '#2c2416',    // 墨水颜色
  strokeWidth: 3,             // 基础笔画粗细
  strokeWidthMax: 8,          // 最大笔画粗细
  animationSpeed: 1.5,       // 动画播放速度
  pointsPerFrame: 3           // 每帧绘制点数
};
```

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT
