const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')

// 创建评价
router.post('/',
  auth,
  validate.required(['order_id', 'to_user_id', 'rating']),
  validate.rating,
  validate.stringLength('content', 0, 500),
  validate.sanitize(['content']),
  async (req, res) => {
  try {
    const { order_id, to_user_id, rating, content } = req.body

    // 验证订单是否存在且已完成
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND (buyer_id = ? OR seller_id = ?) AND status = ?',
      [order_id, req.userId, req.userId, 'completed']
    )

    if (orders.length === 0) {
      return res.json({ code: 400, message: '订单不存在或未完成' })
    }

    // 检查是否已评价
    const [existing] = await db.query(
      'SELECT id FROM reviews WHERE order_id = ? AND from_user_id = ?',
      [order_id, req.userId]
    )

    if (existing.length > 0) {
      return res.json({ code: 400, message: '已评价过该订单' })
    }

    // 创建评价
    const [result] = await db.query(
      'INSERT INTO reviews (order_id, from_user_id, to_user_id, rating, content, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [order_id, req.userId, to_user_id, rating, content]
    )

    // 更新被评价用户的信用分
    // 5星+2分，4星+1分，3星不变，2星-1分，1星-2分
    const scoreChange = (rating - 3) * 1
    if (scoreChange !== 0) {
      await db.query(
        'UPDATE users SET credit_score = GREATEST(0, LEAST(100, credit_score + ?)) WHERE id = ?',
        [scoreChange, to_user_id]
      )
    }

    res.json({ code: 0, data: { id: result.insertId }, message: '评价成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '评价失败' })
  }
})

// 获取用户收到的评价列表
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const [reviews] = await db.query(`
      SELECT r.*, u.nickname as from_nickname, u.avatar as from_avatar,
             o.item_type, o.item_id
      FROM reviews r
      LEFT JOIN users u ON r.from_user_id = u.id
      LEFT JOIN orders o ON r.order_id = o.id
      WHERE r.to_user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), offset])

    // 统计评分分布
    const [stats] = await db.query(`
      SELECT
        COUNT(*) as total,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews
      WHERE to_user_id = ?
    `, [userId])

    res.json({
      code: 0,
      data: {
        list: reviews,
        stats: stats[0],
        page,
        limit
      }
    })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

// 获取订单的评价
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params

    const [reviews] = await db.query(`
      SELECT r.*,
             from_user.nickname as from_nickname, from_user.avatar as from_avatar,
             to_user.nickname as to_nickname, to_user.avatar as to_avatar
      FROM reviews r
      LEFT JOIN users from_user ON r.from_user_id = from_user.id
      LEFT JOIN users to_user ON r.to_user_id = to_user.id
      WHERE r.order_id = ?
    `, [orderId])

    res.json({ code: 0, data: reviews })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

module.exports = router
