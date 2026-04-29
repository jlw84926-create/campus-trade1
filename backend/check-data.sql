-- 检查超市商品数据
SELECT id, name, building_id, shop_id, status, sales, created_at
FROM shop_products
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- 检查用户信息
SELECT id, nickname, building_id, is_shop_owner
FROM users
WHERE id = 1;

-- 检查店铺信息
SELECT id, owner_id, name, building, status
FROM shops
WHERE owner_id = 1;
