const express = require('express');
const router = express.Router();
const placeController = require('../controllers/placeController');

// 1. 定义新增地点的 POST 接口
router.post('/', placeController.addPlace);

// 2. 新增：定义获取地点列表的 GET 接口（支持筛选和搜索）
router.get('/', placeController.getPlaces);

module.exports = router;