-- ==========================================
-- 0. 激活 PostGIS 空间几何扩展（关键步骤）
-- ==========================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ==========================================
-- 1. 创建用户与特工主表 (game_user)
-- ==========================================
CREATE TABLE game_user (
    user_id SERIAL PRIMARY KEY,                        -- 用户唯一 ID
    username VARCHAR(50) UNIQUE NOT NULL,             -- 特工代号 / 登录账号
    password VARCHAR(100) NOT NULL,                    -- 加密存储的密码
    user_role VARCHAR(20) DEFAULT 'student'           -- 角色划分：guest/student/admin
);

-- ==========================================
-- 2. 创建校园设施空间主表 (campus_places)
-- ==========================================
CREATE TABLE campus_places (
    place_id SERIAL PRIMARY KEY,                       -- 地点唯一自增 ID
    name VARCHAR(100) NOT NULL,                        -- 设施/店铺名称
    category VARCHAR(20) NOT NULL,                     -- 六大类别之一
    geom GEOMETRY(Point, 4326) NOT NULL,               -- WGS84经纬度空间点
    description TEXT,                                  -- 地点的详细文字位置描述
    open_hours VARCHAR(50),                            -- 营业时间或开放时间段
    status_tag VARCHAR(20) DEFAULT '正在营业',          -- 实时状态标签
    is_approved BOOLEAN DEFAULT FALSE                  -- 众包审核状态
);

-- ==========================================
-- 3. 创建深度定制攻略表 (place_strategies)
-- ==========================================
CREATE TABLE place_strategies (
    strategy_id SERIAL PRIMARY KEY,                    -- 攻略唯一自增 ID
    place_id INT NOT NULL,                             -- 关联空间主表外键
    content_json JSONB NOT NULL,                       -- JSONB 格式存储的定制化特色数据
    contributor VARCHAR(50) DEFAULT '匿名同学',         -- 攻略贡献者的署名
    FOREIGN KEY (place_id) REFERENCES campus_places(place_id) ON DELETE CASCADE
);

-- ==========================================
-- 4. 创建用户收藏夹关联表 (user_favorites)
-- ==========================================
CREATE TABLE user_favorites (
    favorite_id SERIAL PRIMARY KEY,                    -- 收藏记录唯一 ID
    user_id INT NOT NULL,                              -- 关联用户表外键
    place_id INT NOT NULL,                             -- 关联地点表外键
    create_time TIMESTAMP DEFAULT NOW(),               -- 收藏时间
    FOREIGN KEY (user_id) REFERENCES game_user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (place_id) REFERENCES campus_places(place_id) ON DELETE CASCADE
);

-- ==========================================
-- 5. 性能与空间优化：创建核心索引
-- ==========================================
CREATE INDEX idx_campus_places_geom ON campus_places USING gist(geom);
CREATE INDEX idx_campus_places_cat_app ON campus_places(category, is_approved);
CREATE INDEX idx_strategies_place_id ON place_strategies(place_id);
CREATE INDEX idx_favorites_user_id ON user_favorites(user_id);
