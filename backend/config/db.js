// 引入 pg 驱动的 Pool（连接池）模块
const { Pool } = require('pg');
// 引入 dotenv 插件，自动读取刚刚写的 .env 配置文件
require('dotenv').config();

// 创建数据库连接池配置
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// 测试数据库是否连接成功
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ 数据库连接失败，请检查密码或 PostgreSQL 服务是否启动:', err.stack);
  }
  console.log('✅ 成功连接至 PostgreSQL (hhu_map) 数据库，空间大动脉已打通！');
  release();
});

// 导出连接池，供后面的 API 接口使用
module.exports = pool;