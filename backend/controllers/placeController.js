const pool = require('../config/db');

// 新增地点的核心逻辑
exports.addPlace = async (req, res) => {
  // 接收前端发来的数据，新增了 strategy_data (多楼层/子店铺数据)
  const { name, category, lng, lat, description, open_hours, role, strategy_data } = req.body;

  if (role !== 'admin') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  if (!name || !category || !lng || !lat) {
    return res.status(400).json({ success: false, message: '缺失必要参数' });
  }

  try {
    // 1. 插入主空间表
    const insertSql = `
      INSERT INTO campus_places (name, category, geom, description, open_hours, status_tag, is_approved)
      VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, '正在营业', true)
      RETURNING place_id;
    `;
    const geomText = `POINT(${lng} ${lat})`;
    const result = await pool.query(insertSql, [name, category, geomText, description || '', open_hours || '']);
    const newPlaceId = result.rows[0].place_id;

    // 2. 如果这栋建筑有子楼层/店铺，直接利用 PostgreSQL 的 JSONB 存入攻略表
    if (strategy_data && strategy_data.floors && strategy_data.floors.length > 0) {
      const strategySql = `INSERT INTO place_strategies (place_id, content_json, contributor) VALUES ($1, $2, $3)`;
      await pool.query(strategySql, [newPlaceId, strategy_data, 'admin']);
    }

    res.status(201).json({ success: true, message: '录入成功' });
  } catch (error) {
    console.error('写入失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

// 获取地点列表（左连接策略表，把楼层数据一并拿出来）
exports.getPlaces = async (req, res) => {
  const { category, keyword } = req.query;

  try {
    let querySql = `
      SELECT p.place_id, p.name, p.category, p.description, p.open_hours, p.status_tag,
             ST_X(p.geom) as lng, ST_Y(p.geom) as lat,
             s.content_json as strategy_data
      FROM campus_places p
      LEFT JOIN place_strategies s ON p.place_id = s.place_id
      WHERE p.is_approved = true
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    if (category) {
      querySql += ` AND p.category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (keyword) {
      querySql += ` AND p.name ILIKE $${paramIndex}`;
      queryParams.push(`%${keyword}%`);
      paramIndex++;
    }

    querySql += ` ORDER BY p.place_id DESC`;
    const result = await pool.query(querySql, queryParams);

    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ success: false, message: '读取失败' });
  }
};