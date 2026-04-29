-- 用户表
CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `openid` VARCHAR(100) UNIQUE NOT NULL,
  `nickname` VARCHAR(50),
  `avatar` VARCHAR(255),
  `campus` VARCHAR(50),
  `building` VARCHAR(50),
  `credit_score` INT DEFAULT 100,
  `balance` DECIMAL(10,2) DEFAULT 0,
  `commission` DECIMAL(10,2) DEFAULT 0,
  `created_at` DATETIME,
  INDEX idx_openid (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品表
CREATE TABLE `goods` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `type` ENUM('book', 'item') NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `negotiable` TINYINT DEFAULT 0,
  `images` JSON,
  `category` VARCHAR(50),
  `condition` VARCHAR(20),
  `description` TEXT,
  `trade_method` VARCHAR(50),
  `location` VARCHAR(100),
  `status` ENUM('active', 'sold', 'deleted') DEFAULT 'active',
  `views` INT DEFAULT 0,
  `created_at` DATETIME,
  INDEX idx_user (`user_id`),
  INDEX idx_status (`status`),
  INDEX idx_created (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 服务表
CREATE TABLE `services` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `type` ENUM('express', 'food', 'help', 'other') NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `reward` DECIMAL(10,2) NOT NULL,
  `deadline` DATETIME,
  `location` VARCHAR(100),
  `pickup_code` VARCHAR(50),
  `platform` VARCHAR(50),
  `description` TEXT,
  `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  `taker_id` INT,
  `created_at` DATETIME,
  INDEX idx_user (`user_id`),
  INDEX idx_status (`status`),
  INDEX idx_taker (`taker_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单表
CREATE TABLE `orders` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `buyer_id` INT NOT NULL,
  `seller_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `item_type` ENUM('goods', 'service') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL COMMENT '买家支付金额',
  `platform_fee` DECIMAL(10,2) NOT NULL COMMENT '平台佣金(5%)',
  `seller_amount` DECIMAL(10,2) NOT NULL COMMENT '卖家实际到账(95%)',
  `status` ENUM('pending', 'paid', 'shipped', 'completed', 'refund') DEFAULT 'pending',
  `pay_time` DATETIME,
  `confirm_time` DATETIME,
  `created_at` DATETIME,
  INDEX idx_buyer (`buyer_id`),
  INDEX idx_seller (`seller_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 消息表
CREATE TABLE `messages` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `from_user_id` INT NOT NULL,
  `to_user_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `type` ENUM('text', 'image', 'system') DEFAULT 'text',
  `item_id` INT,
  `is_read` TINYINT DEFAULT 0,
  `created_at` DATETIME,
  INDEX idx_from (`from_user_id`),
  INDEX idx_to (`to_user_id`),
  INDEX idx_created (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 评价表
CREATE TABLE `reviews` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `from_user_id` INT NOT NULL,
  `to_user_id` INT NOT NULL,
  `rating` TINYINT NOT NULL,
  `content` TEXT,
  `created_at` DATETIME,
  INDEX idx_order (`order_id`),
  INDEX idx_to_user (`to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 平台收入表
CREATE TABLE `platform_revenue` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL COMMENT '订单金额',
  `fee` DECIMAL(10,2) NOT NULL COMMENT '平台佣金',
  `fee_rate` DECIMAL(5,2) DEFAULT 5.00 COMMENT '佣金比例(%)',
  `created_at` DATETIME,
  INDEX idx_order (`order_id`),
  INDEX idx_created (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台收入记录表';
