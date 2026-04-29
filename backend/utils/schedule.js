const schedule = require('node-schedule')
const db = require('./db')

function initSchedule() {
  // 临时禁用定时任务，避免数据库连接失败时刷屏
  console.log('定时任务已禁用（调试模式）')
  return

  // 每分钟检查超时订单
  schedule.scheduleJob('*/1 * * * *', async () => {
    try {
      // 外卖订单超时自动取消（30分钟）
      await db.query(`
        UPDATE services
        SET status = 'cancelled'
        WHERE type = 'food'
          AND status = 'pending'
          AND deadline < NOW()
      `)

      // 已接单超时扣信用分
      const [timeoutOrders] = await db.query(`
        SELECT s.*, s.taker_id
        FROM services s
        WHERE s.status = 'in_progress'
          AND s.deadline < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
      `)

      for (const order of timeoutOrders) {
        // 扣除信用分
        await db.query(
          'UPDATE users SET credit_score = credit_score - 5 WHERE id = ?',
          [order.taker_id]
        )

        // 取消订单
        await db.query(
          'UPDATE services SET status = "cancelled" WHERE id = ?',
          [order.id]
        )
      }

      // 订单自动确认收货（7天）
      await db.query(`
        UPDATE orders
        SET status = 'completed', confirm_time = NOW()
        WHERE status = 'shipped'
          AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
      `)

      console.log('定时任务执行完成')
    } catch (error) {
      console.error('定时任务错误:', error)
    }
  })
}

module.exports = { initSchedule }
