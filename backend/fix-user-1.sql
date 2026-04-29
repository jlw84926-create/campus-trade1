-- 1. 开通超市卖家权限
UPDATE users SET is_shop_owner = 1 WHERE id = 1;

-- 2. 检查是否已有店铺（如果没有则创建）
INSERT INTO shops (owner_id, name, building, status, delivery_buildings, created_at)
SELECT 1, CONCAT(nickname, '的超市'), CONCAT(IFNULL(building_id, 5), '号楼'), 'open', '["5号楼"]', NOW()
FROM users
WHERE id = 1
AND NOT EXISTS (SELECT 1 FROM shops WHERE owner_id = 1);

-- 3. 验证结果
SELECT '用户信息:' as info;
SELECT id, nickname, is_shop_owner, building_id FROM users WHERE id = 1;

SELECT '店铺信息:' as info;
SELECT id, owner_id, name, building, status FROM shops WHERE owner_id = 1;
