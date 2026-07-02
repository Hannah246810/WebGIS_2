const pool = require('../config/db');

// 获取待审核的地点列表
exports.getPendingPlaces = async (req, res) => {
  try {
    const sql = `
      SELECT p.place_id, p.name, p.category, 
             ST_X(p.geom) as lng, ST_Y(p.geom) as lat,
             p.description, p.open_hours, p.created_at,
             u.username AS submitted_by
      FROM campus_places p
      LEFT JOIN game_user u ON p.submitted_by = u.user_id
      WHERE p.is_approved = false
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(sql);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取待审核列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 批准地点上线
exports.approvePlace = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE campus_places SET is_approved = true WHERE place_id = $1 RETURNING place_id',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '地点不存在' });
    }
    res.status(200).json({ success: true, message: '已批准上线' });
  } catch (error) {
    console.error('批准失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 驳回并删除地点（仅限待审核状态）
exports.rejectPlace = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM campus_places WHERE place_id = $1 AND is_approved = false RETURNING place_id',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '地点不存在或已审核' });
    }
    res.status(200).json({ success: true, message: '已驳回删除' });
  } catch (error) {
    console.error('驳回失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// ========== 新增：删除已上线地点（管理员专用） ==========
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

// 获取所有已上线地点（管理员用）
exports.getApprovedPlaces = async (req, res) => {
  try {
    const sql = `
      SELECT p.place_id, p.name, p.category, 
             ST_X(p.geom) as lng, ST_Y(p.geom) as lat,
             p.description, p.open_hours, p.created_at,
             u.username AS submitted_by
      FROM campus_places p
      LEFT JOIN game_user u ON p.submitted_by = u.user_id
      WHERE p.is_approved = true
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(sql);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取已上线列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};