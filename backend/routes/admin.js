const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const adminAuth = require('../middleware/admin')

// 平台收入统计（需要管理员权限）
router.get('/revenue/stats', adminAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query

    // 总收入
    let totalSql = 'SELECT SUM(fee) as total_revenue, COUNT(*) as total_orders FROM platform_revenue'
    const totalParams = []

    if (start_date && end_date) {
      totalSql += ' WHERE created_at BETWEEN ? AND ?'
      totalParams.push(start_date, end_date)
    }

    const [totalResult] = await db.query(totalSql, totalParams)

    // 今日收入
    const [todayResult] = await db.query(`
      SELECT SUM(fee) as today_revenue, COUNT(*) as today_orders
      FROM platform_revenue
      WHERE DATE(created_at) = CURDATE()
    `)

    // 本月收入
    const [monthResult] = await db.query(`
      SELECT SUM(fee) as month_revenue, COUNT(*) as month_orders
      FROM platform_revenue
      WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
    `)

    // 每日收入趋势（最近30天）
    const [dailyTrend] = await db.query(`
      SELECT DATE(created_at) as date, SUM(fee) as revenue, COUNT(*) as orders
      FROM platform_revenue
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)

    res.json({
      code: 0,
      data: {
        total: {
          revenue: totalResult[0].total_revenue || 0,
          orders: totalResult[0].total_orders || 0
        },
        today: {
          revenue: todayResult[0].today_revenue || 0,
          orders: todayResult[0].today_orders || 0
        },
        month: {
          revenue: monthResult[0].month_revenue || 0,
          orders: monthResult[0].month_orders || 0
        },
        daily_trend: dailyTrend
      }
    })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

// 收入明细列表
router.get('/revenue/list', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const [list] = await db.query(`
      SELECT pr.*, o.buyer_id, o.seller_id, o.item_type,
             buyer.nickname as buyer_nickname,
             seller.nickname as seller_nickname
      FROM platform_revenue pr
      LEFT JOIN orders o ON pr.order_id = o.id
      LEFT JOIN users buyer ON o.buyer_id = buyer.id
      LEFT JOIN users seller ON o.seller_id = seller.id
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset])

    res.json({ code: 0, data: { list, page, limit } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

module.exports = router
