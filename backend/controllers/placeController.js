const pool = require('../config/db');

// ---------- 新增地点（区分学生/管理员）----------
exports.addPlace = async (req, res) => {
  const { name, category, lng, lat, description, open_hours, strategy_data } = req.body;
  
  // 从 JWT 中间件获取当前登录用户信息（需要提前挂载 attachUser）
  const { user_id, user_role } = req.user || { user_id: null, user_role: 'student' };

  // 判断是否自动审核通过：管理员直接上线，学生需审核
  const isApproved = user_role === 'admin' ? true : false;

  // 参数校验
  if (!name || !category || lng === undefined || lat === undefined) {
    return res.status(400).json({ success: false, message: '缺失必要参数' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. 插入主空间表（含 submitted_by）
    const insertPlaceSql = `
      INSERT INTO campus_places 
      (name, category, geom, description, open_hours, status_tag, is_approved, submitted_by)
      VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, '正在营业', $6, $7)
      RETURNING place_id;
    `;
    const geomText = `POINT(${lng} ${lat})`;
    const placeResult = await client.query(insertPlaceSql, [
      name, category, geomText, description || '', open_hours || '', 
      isApproved, user_id
    ]);
    const newPlaceId = placeResult.rows[0].place_id;

    // 2. 如果有攻略数据（floors / highlights / tips 等），存入 place_strategies
    if (strategy_data && Object.keys(strategy_data).length > 0) {
      const strategySql = `
        INSERT INTO place_strategies (place_id, content_json, contributor) 
        VALUES ($1, $2, $3)
      `;
      const contributor = user_role === 'admin' ? '管理员' : '同学投稿';
      await client.query(strategySql, [newPlaceId, strategy_data, contributor]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      is_approved: isApproved,
      place_id: newPlaceId,
      message: isApproved ? '录入成功，已上线' : '提交成功，等待管理员审核通过后将显示在地图上'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('写入失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  } finally {
    client.release();
  }
};

// ---------- 获取地点列表（只返回已审核通过的地点）----------
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
    console.error('读取失败:', error);
    res.status(500).json({ success: false, message: '读取失败' });
  }
};