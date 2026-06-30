const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');

// 1. 引入地点路由
const placeRoutes = require('./routes/placeRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置中间件
app.use(cors());
app.use(express.json());

// 基础测试路由
app.get('/', (req, res) => {
  res.send('河海大学便民活地图后端服务正在运行中...');
});

// 2. 挂载地点相关的 API 接口（给接口加上统一前缀 /api/places）
app.use('/api/places', placeRoutes);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 后端服务器已成功在 http://localhost:${PORT} 启动`);
});