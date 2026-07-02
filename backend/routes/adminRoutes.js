const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');

// 测试路由 - 验证 adminRoutes 是否被加载
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'adminRoutes 已加载！' });
});

// 所有审核路由都需要管理员权限
router.get('/pending', requireRole('admin'), adminController.getPendingPlaces);
router.put('/approve/:id', requireRole('admin'), adminController.approvePlace);
router.delete('/reject/:id', requireRole('admin'), adminController.rejectPlace);
router.delete('/places/:id', requireRole('admin'), adminController.deletePlace);
router.get('/approved', requireRole('admin'), adminController.getApprovedPlaces);

module.exports = router;