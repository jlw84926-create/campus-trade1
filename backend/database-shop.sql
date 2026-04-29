-- 宿舍超市模块数据库迁移

-- users 表新增超市卖家标识
ALTER TABLE `users` ADD COLUMN `is_shop_owner` TINYINT DEFAULT 0 AFTER `is_admin`;

-- 超市店铺表
CREATE TABLE `shops` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `owner_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `avatar` VARCHAR(255),
  `building` VARCHAR(50),
  `delivery_buildings` JSON COMMENT '配送楼栋范围',
  `status` ENUM('open','closed') DEFAULT 'open',
  `created_at` DATETIME,
  INDEX idx_owner (`owner_id`),
  INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宿舍超市店铺表';

-- 超市商品表
CREATE TABLE `shop_products` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `shop_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `images` JSON,
  `category` ENUM('recommend','snack','drink','noodle','daily','other') DEFAULT 'other',
  `specs` JSON COMMENT '[{"name":"口味","options":["原味","香辣"]}]',
  `price` DECIMAL(10,2) NOT NULL,
  `original_price` DECIMAL(10,2) COMMENT '划线价',
  `stock` INT DEFAULT 0,
  `sales` INT DEFAULT 0,
  `description` TEXT,
  `delivery_buildings` JSON,
  `status` ENUM('active','inactive','deleted') DEFAULT 'active',
  `created_at` DATETIME,
  INDEX idx_shop (`shop_id`),
  INDEX idx_category (`category`),
  INDEX idx_status_created (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='超市商品表';

-- 超市订单表
CREATE TABLE `shop_orders` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_no` VARCHAR(32) UNIQUE NOT NULL,
  `buyer_id` INT NOT NULL,
  `shop_id` INT NOT NULL,
  `seller_id` INT NOT NULL,
  `items` JSON COMMENT '[{"product_id":1,"name":"可乐","spec":"330ml","price":3,"quantity":2}]',
  `total_amount` DECIMAL(10,2) NOT NULL,
  `platform_fee` DECIMAL(10,2) NOT NULL,
  `seller_amount` DECIMAL(10,2) NOT NULL,
  `address` VARCHAR(200) NOT NULL COMMENT '楼栋+寝室号',
  `delivery_time` VARCHAR(50) DEFAULT '尽快送达',
  `remark` TEXT,
  `status` ENUM('pending','accepted','delivering','completed','cancelled','refund') DEFAULT 'pending',
  `cancel_reason` VARCHAR(200),
  `pay_time` DATETIME,
  `accept_time` DATETIME,
  `deliver_time` DATETIME,
  `complete_time` DATETIME,
  `created_at` DATETIME,
  INDEX idx_buyer (`buyer_id`),
  INDEX idx_seller (`seller_id`),
  INDEX idx_shop (`shop_id`),
  INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='超市订单表';

-- 购物车表
CREATE TABLE `cart` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `shop_id` INT NOT NULL,
  `spec` VARCHAR(100) COMMENT '选中的规格',
  `quantity` INT DEFAULT 1,
  `created_at` DATETIME,
  UNIQUE KEY `uk_user_product_spec` (`user_id`, `product_id`, `spec`),
  INDEX idx_user (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车表';
