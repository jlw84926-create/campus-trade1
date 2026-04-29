-- 开通超市卖家权限脚本

-- 1. 查看当前所有用户
SELECT id, nickname, openid, is_shop_owner FROM users;

-- 2. 给指定用户开通超市卖家权限（替换 USER_ID 为实际用户ID）
UPDATE users SET is_shop_owner = 1 WHERE id = USER_ID;

-- 3. 为该用户创建店铺（替换相应字段）
INSERT INTO shops (owner_id, name, description, building, delivery_buildings, status, created_at)
VALUES (
  USER_ID,                                    -- 用户ID
  '宿舍超市',                                  -- 店铺名称
  '提供零食、饮料、日用品等商品',              -- 店铺描述
  '1号楼',                                    -- 店铺所在楼栋
  JSON_ARRAY('1号楼', '2号楼', '3号楼'),      -- 配送楼栋范围
  'open',                                     -- 营业状态（open/closed）
  NOW()
);

-- 4. 验证是否开通成功
SELECT u.id, u.nickname, u.is_shop_owner, s.id as shop_id, s.name as shop_name, s.status
FROM users u
LEFT JOIN shops s ON u.id = s.owner_id
WHERE u.id = USER_ID;

-- ========================================
-- 示例：给第一个用户开通权限
-- ========================================

-- 查看第一个用户的ID
SELECT id, nickname FROM users LIMIT 1;

-- 假设第一个用户ID是1，执行以下语句：
-- UPDATE users SET is_shop_owner = 1 WHERE id = 1;
-- INSERT INTO shops (owner_id, name, description, building, delivery_buildings, status, created_at)
-- VALUES (1, '宿舍超市', '提供零食、饮料、日用品等商品', '1号楼', JSON_ARRAY('1号楼', '2号楼', '3号楼'), 'open', NOW());
