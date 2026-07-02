const pool = require('../config/db');

// ========== 我的贡献 ==========
exports.getMyContributions = async (req, res) => {
  const { user_id } = req.user;
  try {
    // 1. 我提交的地点
    const places = await pool.query(
      `SELECT place_id, name, category, description, is_approved
       FROM campus_places 
       WHERE submitted_by = $1 
       ORDER BY place_id DESC`,
      [user_id]
    );

    // 2. 我提交的纠错
    const edits = await pool.query(
      `SELECT e.edit_id, e.place_id, p.name AS place_name, e.changes, e.note, e.status
       FROM place_edits e
       JOIN campus_places p ON e.place_id = p.place_id
       WHERE e.submitted_by = $1
       ORDER BY e.edit_id DESC`,
      [user_id]
    );

    // 3. 我提交的攻略补充
    const notes = await pool.query(
      `SELECT n.note_id, n.place_id, p.name AS place_name, n.content, n.status
       FROM strategy_notes n
       JOIN campus_places p ON n.place_id = p.place_id
       WHERE n.submitted_by = $1
       ORDER BY n.note_id DESC`,
      [user_id]
    );

    res.status(200).json({
      success: true,
      data: {
        places: places.rows,
        edits: edits.rows,
        notes: notes.rows,
      },
    });
  } catch (error) {
    console.error('获取贡献列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// ========== 收藏功能 ==========
exports.getFavorites = async (req, res) => {
  const { user_id } = req.user;
  try {
    const result = await pool.query(
      `SELECT f.favorite_id, f.place_id, f.create_time,
              p.name, p.category, p.description, p.open_hours,
              ST_X(p.geom) as lng, ST_Y(p.geom) as lat,
              s.content_json as strategy_data
       FROM user_favorites f
       JOIN campus_places p ON f.place_id = p.place_id
       LEFT JOIN place_strategies s ON p.place_id = s.place_id
       WHERE f.user_id = $1 AND p.is_approved = true
       ORDER BY f.create_time DESC`,
      [user_id]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 添加收藏
exports.addFavorite = async (req, res) => {
  const { user_id } = req.user;
  const { place_id } = req.body;
  if (!place_id) {
    return res.status(400).json({ success: false, message: '缺少地点ID' });
  }
  try {
    const exist = await pool.query(
      'SELECT 1 FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [user_id, place_id]
    );
    if (exist.rowCount > 0) {
      return res.status(409).json({ success: false, message: '已收藏该地点' });
    }
    await pool.query(
      'INSERT INTO user_favorites (user_id, place_id) VALUES ($1, $2)',
      [user_id, place_id]
    );
    res.status(201).json({ success: true, message: '收藏成功' });
  } catch (error) {
    console.error('添加收藏失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 取消收藏
exports.removeFavorite = async (req, res) => {
  const { user_id } = req.user;
  const { placeId } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND place_id = $2 RETURNING favorite_id',
      [user_id, placeId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '未收藏该地点' });
    }
    res.status(200).json({ success: true, message: '已取消收藏' });
  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 删除已上线地点（管理员专用）
exports.deletePlace = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM campus_places WHERE place_id = $1 RETURNING place_id',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '地点不存在' });
    }
    res.status(200).json({ success: true, message: '已删除地点' });
  } catch (error) {
    console.error('删除失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};