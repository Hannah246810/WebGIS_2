const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireRole } = require('../middleware/auth');

// 我的贡献（需要登录，student 或 admin）
router.get('/contributions', requireRole('student'), userController.getMyContributions);

// 收藏（需要登录）
router.get('/favorites', requireRole('student'), userController.getFavorites);
router.post('/favorites', requireRole('student'), userController.addFavorite);
router.delete('/favorites/:placeId', requireRole('student'), userController.removeFavorite);

module.exports = router;