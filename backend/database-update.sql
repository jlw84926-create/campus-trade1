-- 添加管理员字段
ALTER TABLE `users` ADD COLUMN `is_admin` TINYINT DEFAULT 0 AFTER `commission`;

-- 添加收藏表
CREATE TABLE `favorites` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `goods_id` INT NOT NULL,
  `created_at` DATETIME,
  UNIQUE KEY `uk_user_goods` (`user_id`, `goods_id`),
  INDEX idx_user (`user_id`),
  INDEX idx_goods (`goods_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收藏表';

-- 添加关注表
CREATE TABLE `follows` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `follower_id` INT NOT NULL COMMENT '关注者ID',
  `followee_id` INT NOT NULL COMMENT '被关注者ID',
  `created_at` DATETIME,
  UNIQUE KEY `uk_follower_followee` (`follower_id`, `followee_id`),
  INDEX idx_follower (`follower_id`),
  INDEX idx_followee (`followee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户关注表';

-- 添加复合索引优化查询
ALTER TABLE `goods` ADD INDEX `idx_status_created` (`status`, `created_at`);
ALTER TABLE `messages` ADD INDEX `idx_to_read` (`to_user_id`, `is_read`);
