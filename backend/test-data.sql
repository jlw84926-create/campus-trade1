-- 测试数据插入脚本
-- 使用方法: mysql -u root -p campus_trade < test-data.sql

-- 清空现有数据（可选）
-- TRUNCATE TABLE platform_revenue;
-- TRUNCATE TABLE reviews;
-- TRUNCATE TABLE messages;
-- TRUNCATE TABLE orders;
-- TRUNCATE TABLE services;
-- TRUNCATE TABLE goods;
-- TRUNCATE TABLE users;

-- 插入测试用户
INSERT INTO users (openid, nickname, avatar, campus, building, credit_score, balance, commission, created_at)
VALUES
('test_openid_001', '张同学', 'https://via.placeholder.com/100/07C160/FFFFFF?text=User1', '松江校区', '1号楼', 100, 50.00, 20.00, NOW()),
('test_openid_002', '李同学', 'https://via.placeholder.com/100/FF9800/FFFFFF?text=User2', '松江校区', '2号楼', 98, 30.00, 15.00, NOW()),
('test_openid_003', '王同学', 'https://via.placeholder.com/100/2196F3/FFFFFF?text=User3', '松江校区', '3号楼', 95, 80.00, 35.00, NOW()),
('test_openid_004', '赵同学', 'https://via.placeholder.com/100/9C27B0/FFFFFF?text=User4', '松江校区', '4号楼', 99, 120.00, 50.00, NOW());

-- 插入测试商品（二手书）
INSERT INTO goods (user_id, type, title, price, negotiable, images, category, `condition`, description, trade_method, location, status, views, created_at)
VALUES
(1, 'book', '高等数学教材（上册）', 30.00, 1,
 '["https://via.placeholder.com/400/07C160/FFFFFF?text=Math+Book"]',
 '教材', '九成新', '大一用的高数教材，保存完好，无笔记无划线。适合下学期使用。', '面交', '1号楼', 'active', 15, NOW()),

(1, 'book', '大学英语综合教程1-4册', 80.00, 1,
 '["https://via.placeholder.com/400/2196F3/FFFFFF?text=English+Books"]',
 '教材', '全新', '全新未拆封，四册打包出售。', '面交', '1号楼', 'active', 8, NOW()),

(2, 'book', '线性代数（第五版）', 25.00, 1,
 '["https://via.placeholder.com/400/FF9800/FFFFFF?text=Linear+Algebra"]',
 '教材', '九成新', '考研用书，有少量笔记。', '面交', '2号楼', 'active', 12, NOW()),

(3, 'book', 'C语言程序设计', 35.00, 0,
 '["https://via.placeholder.com/400/9C27B0/FFFFFF?text=C+Language"]',
 '教材', '微瑕', '有笔记和划线，但不影响阅读。', '面交', '3号楼', 'active', 20, NOW());

-- 插入测试商品（闲置物品）
INSERT INTO goods (user_id, type, title, price, negotiable, images, category, `condition`, description, trade_method, location, status, views, created_at)
VALUES
(2, 'item', 'iPhone 13 Pro 256G 远峰蓝', 4500.00, 1,
 '["https://via.placeholder.com/400/1E88E5/FFFFFF?text=iPhone+13+Pro"]',
 '数码', '九成新', '自用iPhone 13 Pro，无磕碰，电池健康度92%，配件齐全。', '面交', '2号楼', 'active', 45, NOW()),

(3, 'item', '自行车 捷安特ATX660', 800.00, 1,
 '["https://via.placeholder.com/400/4CAF50/FFFFFF?text=Bike"]',
 '交通工具', '九成新', '大一买的自行车，骑了一年，车况良好。毕业甩卖。', '面交', '3号楼', 'active', 28, NOW()),

(4, 'item', '台式机显示器 27寸 2K', 600.00, 1,
 '["https://via.placeholder.com/400/FF5722/FFFFFF?text=Monitor"]',
 '数码', '九成新', 'Dell 27寸2K显示器，IPS屏，色彩准确。', '面交', '4号楼', 'active', 18, NOW()),

(1, 'item', '电饭煲 美的4L', 80.00, 1,
 '["https://via.placeholder.com/400/795548/FFFFFF?text=Rice+Cooker"]',
 '生活用品', '九成新', '宿舍用的电饭煲，功能正常，搬家处理。', '面交', '1号楼', 'active', 10, NOW()),

(2, 'item', '羽毛球拍 尤尼克斯', 200.00, 1,
 '["https://via.placeholder.com/400/FFC107/FFFFFF?text=Badminton"]',
 '运动器材', '九成新', '尤尼克斯羽毛球拍，带拍套，很少用。', '面交', '2号楼', 'active', 6, NOW());

-- 插入测试服务（代拿快递）
INSERT INTO services (user_id, type, title, reward, deadline, location, pickup_code, platform, description, status, taker_id, created_at)
VALUES
(2, 'express', '帮拿菜鸟驿站快递', 3.00, DATE_ADD(NOW(), INTERVAL 2 HOUR),
 '菜鸟驿站（南门）', '12345678', NULL, '一个小包裹，不重。', 'pending', NULL, NOW()),

(3, 'express', '代取快递 中通', 4.00, DATE_ADD(NOW(), INTERVAL 3 HOUR),
 '中通快递点', '87654321', NULL, '两个包裹，稍微有点重。悬赏4元。', 'pending', NULL, NOW()),

(4, 'express', '帮拿圆通快递', 2.50, DATE_ADD(NOW(), INTERVAL 1 HOUR),
 '圆通快递柜', '11112222', NULL, '小件，很轻。', 'pending', NULL, NOW());

-- 插入测试服务（代拿外卖）
INSERT INTO services (user_id, type, title, reward, deadline, location, pickup_code, platform, description, status, taker_id, created_at)
VALUES
(1, 'food', '帮拿美团外卖', 4.00, DATE_ADD(NOW(), INTERVAL 30 MINUTE),
 '美团外卖柜', '8888', '美团', '麦当劳套餐，在外卖柜里。', 'pending', NULL, NOW()),

(3, 'food', '代取饿了么外卖', 3.50, DATE_ADD(NOW(), INTERVAL 25 MINUTE),
 '饿了么外卖柜', '6666', '饿了么', '肯德基，取餐码6666。', 'pending', NULL, NOW());

-- 插入测试服务（学习互助）
INSERT INTO services (user_id, type, title, reward, deadline, location, pickup_code, platform, description, status, taker_id, created_at)
VALUES
(2, 'help', '高数辅导 一对一', 50.00, DATE_ADD(NOW(), INTERVAL 1 DAY),
 '图书馆', NULL, NULL, '需要高数辅导，期末考试前突击。时薪50元。', 'pending', NULL, NOW()),

(4, 'help', '英语四级陪练', 30.00, DATE_ADD(NOW(), INTERVAL 2 DAY),
 '自习室', NULL, NULL, '找个英语好的同学陪练口语，准备四级考试。', 'pending', NULL, NOW());

-- 插入测试订单
INSERT INTO orders (buyer_id, seller_id, item_id, item_type, amount, platform_fee, seller_amount, status, pay_time, confirm_time, created_at)
VALUES
(2, 1, 1, 'goods', 30.00, 1.50, 28.50, 'completed', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 2, 5, 'goods', 4500.00, 225.00, 4275.00, 'paid', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 3, 6, 'goods', 800.00, 40.00, 760.00, 'shipped', DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- 插入测试消息
INSERT INTO messages (from_user_id, to_user_id, content, type, item_id, is_read, created_at)
VALUES
(2, 1, '你好，这本书还在吗？', 'text', 1, 1, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(1, 2, '在的，九成新', 'text', 1, 1, DATE_SUB(NOW(), INTERVAL 55 MINUTE)),
(2, 1, '可以便宜点吗？', 'text', 1, 1, DATE_SUB(NOW(), INTERVAL 50 MINUTE)),
(1, 2, '已经很便宜了，30块', 'text', 1, 1, DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(3, 2, 'iPhone还在吗？', 'text', 5, 0, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(4, 3, '自行车什么时候可以看？', 'text', 6, 0, DATE_SUB(NOW(), INTERVAL 5 MINUTE));

-- 插入平台收入记录
INSERT INTO platform_revenue (order_id, amount, fee, fee_rate, created_at)
VALUES
(1, 30.00, 1.50, 5.00, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- 插入评价
INSERT INTO reviews (order_id, from_user_id, to_user_id, rating, content, created_at)
VALUES
(1, 2, 1, 5, '书的质量很好，卖家人也很nice！', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- 查看插入结果
SELECT '用户数据:' as '';
SELECT id, nickname, campus, building, credit_score, balance FROM users;

SELECT '商品数据:' as '';
SELECT id, title, price, type, status FROM goods;

SELECT '服务数据:' as '';
SELECT id, title, reward, type, status FROM services;

SELECT '订单数据:' as '';
SELECT id, amount, status, created_at FROM orders;

SELECT '消息数据:' as '';
SELECT id, from_user_id, to_user_id, content FROM messages LIMIT 5;

SELECT '数据统计:' as '';
SELECT
  (SELECT COUNT(*) FROM users) as 用户数,
  (SELECT COUNT(*) FROM goods) as 商品数,
  (SELECT COUNT(*) FROM services) as 服务数,
  (SELECT COUNT(*) FROM orders) as 订单数,
  (SELECT COUNT(*) FROM messages) as 消息数;
