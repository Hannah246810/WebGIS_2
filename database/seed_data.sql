-- ==========================================================
-- 河海大学江宁校区·校园攻略 种子数据（真实校园信息版）
-- 用法：在 db_scheam_sql 建表完成后执行本文件，即可获得一批
--      来自同学实测/投稿的真实攻略点位，可直接联调/演示。
-- 坐标以 App.vue 中地图初始中心 (31.9242, 118.7905) 为基准做了
-- 小幅示意偏移，请在正式上线前用实测 GPS/拾取坐标替换。
-- ==========================================================

-- 1. 菜鸟驿站（8舍旁，西北角）—— 快递 · 分区/公司/流程/高峰 + 提醒
WITH p AS (
  INSERT INTO campus_places (name, category, geom, description, open_hours, status_tag, is_approved)
  VALUES (
    '菜鸟驿站(8舍旁)', '快递', ST_GeomFromText('POINT(118.78780 31.92610)', 4326),
    '西北角，靠近8舍宿舍楼，与宿舍区域距离都比较近',
    '08:00-22:00', '正在营业', true
  ) RETURNING place_id
)
INSERT INTO place_strategies (place_id, content_json, contributor)
SELECT place_id, $${
  "highlights": ["按取件码分架好找", "顺丰独立分区", "开学请提前开通身份码"],
  "companies": ["顺丰", "中通", "圆通", "韵达(校外)", "极兔"],
  "process": "驿站内按取件码分置了不同的架子，方便寻找包裹；顺丰有专门独立区域，靠近进口位置，小件一个架子、大件另一个架子。点开小程序/APP里的“我的驿站”可一目了然查看包裹状态。开学取快递前记得提前开通身份码，否则可能无法验证取件。",
  "peak_hours": "开学季/购物节前后为高峰，建议错峰前往",
  "tips": "⚠️ 韵达快递不在驿站内，需要出南门到马路对面的白色集装箱自取；周边还有一些小市场、小吃可以顺便逛逛，天气凉快的时候还挺惬意。寄件的话比较推荐顺丰，尤其是寄远途件，包装很到位。"
}$$::jsonb, '同学投稿'
FROM p;

-- 2. 韵达快递点（南门外）—— 快递 · 单独校外点位，方便地图直接标注引导
WITH p AS (
  INSERT INTO campus_places (name, category, geom, description, open_hours, status_tag, is_approved)
  VALUES (
    '韵达快递点(南门外)', '快递', ST_GeomFromText('POINT(118.79320 31.91980)', 4326),
    '南门出校后，马路对面的白色集装箱内',
    '09:00-21:00', '正在营业', true
  ) RETURNING place_id
)
INSERT INTO place_strategies (place_id, content_json, contributor)
SELECT place_id, $${
  "highlights": ["需出校门", "仅韵达"],
  "companies": ["韵达"],
  "process": "韵达快递不在校内驿站派送，需从南门出校，马路对面的白色集装箱内自取，凭取件码即可。",
  "tips": "出门取件顺路可以逛逛周边的小市场和小吃摊，天气好的时候很适合散步过去。"
}$$::jsonb, '同学投稿'
FROM p;

-- 3. 河海大学江宁校区图书馆 —— 学习 · 各楼层分区评测（真实测评+星级）
WITH p AS (
  INSERT INTO campus_places (name, category, geom, description, open_hours, status_tag, is_approved)
  VALUES (
    '河海大学江宁校区图书馆', '学习', ST_GeomFromText('POINT(118.79155 31.92480)', 4326),
    '校园核心位置，共有多个功能分区，桌上有二维码但无需预约',
    '周一至周日 07:00-22:30', '正在营业', true
  ) RETURNING place_id
)
INSERT INTO place_strategies (place_id, content_json, contributor)
SELECT place_id, $${
  "highlights": ["座位无需预约", "分区风格差异大", "同学实测评分"],
  "tips": "以下评分为同学纯个人向测评，按楼层排序，仅供参考，欢迎大家继续补充自己的座位测评～",
  "study_zones": [
    { "zone": "P2 一楼两侧学习区", "rating": 4, "desc": "桌面上有插座，充电方便；人少的时候基本一人一间隔，空间足够大，桌上还配台灯。不过也是情侣自习高发地点。" },
    { "zone": "P3 1.5层", "rating": 2.5, "desc": "从一楼两侧楼梯上去，网络信号较差，电源只有靠墙和柱子的位置才有，不太方便；层高较低，略显压抑，但也算是强制自律的好地方。" },
    { "zone": "P4 低声朗读区", "rating": 4, "desc": "个人认为景观最好的地方，学累了可以盯着池子里的锦鲤发呆。电源在桌子两侧，台灯装在玻璃挡板上方，整体暖光氛围很惬意，就是空间偏小；桌子间有金属挡板，不小心踢到声音很大，容易尴尬。" },
    { "zone": "P5 外文借阅区", "rating": 5, "desc": "电源在桌子下面，座椅是实木圈椅，坐感很舒服，空间足够大，人多也不挤，属于宝藏小众地点。" },
    { "zone": "P6 2-4楼借阅区", "rating": 3, "desc": "插座都在墙面和柱子上，充电不太方便，能看到不少人拉了很长的接线板；好在空间够大，白天光线也不错。" },
    { "zone": "P7/P11 2-5层中心学习区", "rating": 2, "desc": "电源同样在墙和柱子上，数量比较少；桌子容易晃，曾遇到邻座用橡皮擦图纸时整张桌子都在晃的情况。" },
    { "zone": "P8 三楼水文化空间", "rating": 4.5, "desc": "座椅是办公椅，部分座位旁还配小沙发，电源就在桌面上，体验很好；唯一的问题是空调有点“变态”，冬天穿短袖、夏天能把人吹感冒。" },
    { "zone": "P10 四楼学习区", "rating": 4, "desc": "去得不多，因为桌面左右空间不算大，沿用低声朗读区同款桌子，环境安静，比较能让人专心。" }
  ]
}$$::jsonb, '同学投稿(图书馆座位测评)'
FROM p;

-- 4. 快乐食间 / 叠翠山食堂 / 三新食堂（7-8舍与思源楼旁）—— 餐饮 · 两层窗口详情
WITH p AS (
  INSERT INTO campus_places (name, category, geom, description, open_hours, status_tag, is_approved)
  VALUES (
    '快乐食间(叠翠山食堂/三新食堂)', '餐饮', ST_GeomFromText('POINT(118.78760 31.92580)', 4326),
    '位于7-8舍和思源楼旁边，共两层',
    '06:30-20:30', '正在营业', true
  ) RETURNING place_id
)
INSERT INTO place_strategies (place_id, content_json, contributor)
SELECT place_id, $${
  "highlights": ["个位数管饱窗口多", "现炸薯条巨好吃", "2楼自选称重"],
  "floors": [
    {
      "floorName": "1楼",
      "shops": [
        { "shopName": "中基本伙窗口", "price": "个位数", "recommend": true, "desc": "主打便宜实惠，个位数就能吃饱，菜品也说得过去。" },
        { "shopName": "渝味小碟", "price": "1-6元/碟", "recommend": true, "desc": "主打精致，菜碟数量众多、种类丰富，可自由组合搭配。" },
        { "shopName": "老卤面", "price": "面价约10元", "recommend": true, "desc": "各种拌面、汤面，吃起来很劲道，个人觉得味道不错。" },
        { "shopName": "汉堡窗口", "price": "10元起", "recommend": true, "desc": "价格便宜，最经典的是现炸薯条，外焦里嫩非常好吃；巨无霸双层牛肉汉堡肉量拉满，也很不错。" },
        { "shopName": "水饺/牛肉汤/麻辣烫", "price": "10元起", "recommend": false, "desc": "一楼还有水饺、牛肉汤、麻辣烫等窗口，选择比较丰富。" }
      ]
    },
    {
      "floorName": "2楼",
      "shops": [
        { "shopName": "我选我味(自选称重)", "price": "米饭1元管饱", "recommend": true, "desc": "自选菜、称重结算，米饭1元管饱，还有免费饮品，凉菜/炒菜/炸物种类非常丰富。" },
        { "shopName": "牛肉米线", "price": "实惠", "recommend": true, "desc": "可加各种菜料，价格实惠，味道好吃。" },
        { "shopName": "意面窗口", "price": "按份加料计价", "recommend": true, "desc": "各种意面和能量碗，可单点鸡胸肉、牛排、卤蛋等，减肥人士狂喜。" },
        { "shopName": "重庆小面/黄焖鸡", "price": "经典价位", "recommend": false, "desc": "也比较经典，喜欢重口味的可以试试。" }
      ]
    }
  ]
}$$::jsonb, '同学投稿'
FROM p;

-- 5. 新新食堂 / 将军山食堂（配电梯）—— 餐饮 · 三层学生食堂详情
WITH p AS (
  INSERT INTO campus_places (name, category, geom, description, open_hours, status_tag, is_approved)
  VALUES (
    '新新食堂(将军山食堂)', '餐饮', ST_GeomFromText('POINT(118.79040 31.92330)', 4326),
    '配有电梯，1-3楼为学生食堂，4楼为教职工食堂',
    '06:30-20:30', '正在营业', true
  ) RETURNING place_id
)
INSERT INTO place_strategies (place_id, content_json, contributor)
SELECT place_id, $${
  "highlights": ["3楼最好吃", "配电梯", "1楼有蜜雪冰城"],
  "floors": [
    {
      "floorName": "1楼",
      "shops": [
        { "shopName": "快餐窗口", "price": "经济实惠", "recommend": false, "desc": "主要是快餐类窗口，出餐快，适合赶时间。" },
        { "shopName": "杂粮煎饼/板面", "price": "8-15元", "recommend": true, "desc": "杂粮煎饼和板面窗口，日常首选之一。" },
        { "shopName": "民族餐厅", "price": "视菜品而定", "recommend": false, "desc": "右侧单独分离出的民族餐厅，照顾不同饮食习惯的同学。" },
        { "shopName": "蜜雪冰城", "price": "奶茶饮品", "recommend": true, "desc": "1楼就有蜜雪冰城，饭后奶茶很方便。" }
      ]
    },
    {
      "floorName": "2楼",
      "shops": [
        { "shopName": "水饺窗口", "price": "10元起", "recommend": false, "desc": "现包现煮，皮薄馅大。" },
        { "shopName": "炸鸡汉堡", "price": "10-20元", "recommend": true, "desc": "炸鸡汉堡套餐选择多。" },
        { "shopName": "瑞幸咖啡", "price": "咖啡饮品", "recommend": true, "desc": "2楼配有瑞幸咖啡，学习提神很方便。" }
      ]
    },
    {
      "floorName": "3楼",
      "shops": [
        { "shopName": "麻辣烫", "price": "按重计价", "recommend": true, "desc": "3楼是公认最好吃的一层，麻辣烫人气很高。" },
        { "shopName": "拉面", "price": "12-16元", "recommend": true, "desc": "汤头浓郁，面条劲道。" },
        { "shopName": "卤鸭饭", "price": "15元左右", "recommend": true, "desc": "卤味香浓，饭量给得足。" },
        { "shopName": "米粉", "price": "12元左右", "recommend": false, "desc": "口味清爽，配菜可选。" },
        { "shopName": "黄焖鸡", "price": "14-16元", "recommend": true, "desc": "3楼的黄焖鸡同样值得一试，各个品类基本都有覆盖。" }
      ]
    }
  ]
}$$::jsonb, '同学投稿'
FROM p;

-- 6. 牛首山食堂（新开业）—— 餐饮 · 简介型条目
WITH p AS (
  INSERT INTO campus_places (name, category, geom, description, open_hours, status_tag, is_approved)
  VALUES (
    '牛首山食堂', '餐饮', ST_GeomFromText('POINT(118.79280 31.92700)', 4326),
    '新开业食堂，人均消费适中',
    '待补充', '正在营业', true
  ) RETURNING place_id
)
INSERT INTO place_strategies (place_id, content_json, contributor)
SELECT place_id, $${
  "highlights": ["新开业", "药膳鸡人均约40元"],
  "tips": "新开业不久，可以尝试招牌药膳鸡，人均消费约40元左右，具体菜品和窗口信息欢迎同学们继续补充完善。"
}$$::jsonb, '同学投稿'
FROM p;

-- ==========================================================
-- content_json 统一字段说明（前端 App.vue 已按此结构解析渲染）：
--   highlights   string[]   卡片/详情顶部的亮点标签
--   tips         string     小贴士（单条文本，含提醒类信息）
--   floors       [{ floorName, shops:[{ shopName, price, recommend, desc }] }]
--                           适用于食堂等有楼层/多窗口、且每个窗口需要文字点评的场所
--                           desc 为该窗口的点评文字（选填）
--   price_list   [{ item, price }]
--                           适用于理发店、打印店等标准价目表场景
--   companies    string[]   适用于快递点，支持的快递公司
--   process      string     快递取件流程说明
--   peak_hours   string     快递取件高峰时段提示
--   study_zones  [{ zone, rating(0-5,支持half), desc }]
--                           适用于图书馆等需要"分区+星级+点评"的场所
-- 以上字段均为可选，按地点实际情况自由组合即可。
-- ==========================================================
