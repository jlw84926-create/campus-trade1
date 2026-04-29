-- 楼栋系统数据库设计

-- 1. 楼栋表
CREATE TABLE IF NOT EXISTS `buildings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL UNIQUE COMMENT '楼栋名称，如：1号楼',
  `number` INT NOT NULL UNIQUE COMMENT '楼栋编号，如：1',
  `status` ENUM('open', 'closed') DEFAULT 'closed' COMMENT '营业状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (`status`),
  INDEX idx_number (`number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='楼栋表';

-- 初始化10栋楼，只有5号楼营业
INSERT INTO `buildings` (`name`, `number`, `status`) VALUES
('1号楼', 1, 'closed'),
('2号楼', 2, 'closed'),
('3号楼', 3, 'closed'),
('4号楼', 4, 'closed'),
('5号楼', 5, 'open'),
('6号楼', 6, 'closed'),
('7号楼', 7, 'closed'),
('8号楼', 8, 'closed'),
('9号楼', 9, 'closed'),
('10号楼', 10, 'closed');

-- 2. 修改用户表，添加楼栋绑定和门牌号
ALTER TABLE `users`
ADD COLUMN `building_id` INT DEFAULT NULL COMMENT '绑定的楼栋ID' AFTER `is_shop_owner`,
ADD COLUMN `room_number` VARCHAR(20) DEFAULT NULL COMMENT '门牌号，如：501' AFTER `building_id`,
ADD INDEX idx_building (`building_id`);

-- 3. 代理表（楼栋代理）
CREATE TABLE IF NOT EXISTS `agents` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '关联的用户ID',
  `building_id` INT NOT NULL COMMENT '负责的楼栋ID',
  `status` ENUM('active', 'disabled') DEFAULT 'active' COMMENT '代理状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_building (`user_id`, `building_id`),
  INDEX idx_building (`building_id`),
  INDEX idx_status (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='楼栋代理表';

-- 4. 修改商品表，添加楼栋关联
ALTER TABLE `shop_products`
ADD COLUMN `building_id` INT DEFAULT NULL COMMENT '所属楼栋ID' AFTER `shop_id`,
ADD INDEX idx_building (`building_id`);

-- 5. 修改订单表，添加楼栋和门牌号信息
ALTER TABLE `shop_orders`
ADD COLUMN `building_id` INT DEFAULT NULL COMMENT '配送楼栋ID' AFTER `seller_id`,
ADD COLUMN `room_number` VARCHAR(20) DEFAULT NULL COMMENT '门牌号' AFTER `building_id`,
ADD COLUMN `agent_id` INT DEFAULT NULL COMMENT '负责代理ID' AFTER `room_number`,
ADD INDEX idx_building (`building_id`),
ADD INDEX idx_agent (`agent_id`);

-- 6. 修改店铺表，添加楼栋关联
ALTER TABLE `shops`
ADD COLUMN `building_id` INT DEFAULT NULL COMMENT '所属楼栋ID' AFTER `owner_id`,
ADD INDEX idx_building (`building_id`);

-- 更新现有5号楼店铺
UPDATE `shops` SET `building_id` = 5 WHERE `id` = 1;
