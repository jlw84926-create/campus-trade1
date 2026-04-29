const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')

// 创建订单
router.post('/', auth, async (req, res) => {
  try {
    const { item_id, item_type } = req.body
    const buyer_id = req.userId

    // 获取商品/服务信息
    let price, seller_id
    if (item_type === 'goods') {
      const [goods] = await db.query('SELECT price, user_id FROM goods WHERE id = ?', [item_id])
      if (goods.length === 0) return res.json({ code: 404, message: '商品不存在' })
      price = goods[0].price
      seller_id = goods[0].user_id
    } else {
      const [services] = await db.query('SELECT reward, user_id FROM services WHERE id = ?', [item_id])
      if (services.length === 0) return res.json({ code: 404, message: '服务不存在' })
      price = services[0].reward
      seller_id = services[0].user_id
    }

    // 计算平台佣金（5%）
    const amount = parseFloat(price)
    const platform_fee = (amount * 0.05).toFixed(2)
    const seller_amount = (amount * 0.95).toFixed(2)

    // 创建订单
    const [result] = await db.query(`
      INSERT INTO orders (buyer_id, seller_id, item_id, item_type, amount, platform_fee, seller_amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [buyer_id, seller_id, item_id, item_type, amount, platform_fee, seller_amount])

    res.json({
      code: 0,
      data: {
        order_id: result.insertId,
        amount,
        platform_fee,
        seller_amount
      }
    })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '创建订单失败' })
  }
})

// 确认收货
router.put('/:id/confirm', auth, async (req, res) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const order_id = req.params.id
    const buyer_id = req.userId

    // 查询订单
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND buyer_id = ? AND status = "paid"',
      [order_id, buyer_id]
    )

    if (orders.length === 0) {
      await connection.rollback()
      return res.json({ code: 404, message: '订单不存在或状态异常' })
    }

    const order = orders[0]

    // 更新订单状态
    await connection.query(
      'UPDATE orders SET status = "completed", confirm_time = NOW() WHERE id = ?',
      [order_id]
    )

    // 卖家余额增加（95%）
    await connection.query(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [order.seller_amount, order.seller_id]
    )

    // 记录平台收入（5%）
    await connection.query(
      'INSERT INTO platform_revenue (order_id, amount, fee, fee_rate, created_at) VALUES (?, ?, ?, 5.00, NOW())',
      [order_id, order.amount, order.platform_fee]
    )

    // 更新商品/服务状态
    if (order.item_type === 'goods') {
      await connection.query('UPDATE goods SET status = "sold" WHERE id = ?', [order.item_id])
    } else {
      await connection.query('UPDATE services SET status = "completed" WHERE id = ?', [order.item_id])
    }

    await connection.commit()

    res.json({ code: 0, message: '确认收货成功' })
  } catch (error) {
    await connection.rollback()
    console.error(error)
    res.json({ code: 500, message: '确认收货失败' })
  } finally {
    connection.release()
  }
})

// 我的订单
router.get('/my', auth, async (req, res) => {
  try {
    const { type = 'buy', status } = req.query
    const userId = req.userId

    let sql = `
      SELECT o.*,
             buyer.nickname as buyer_nickname, buyer.avatar as buyer_avatar,
             seller.nickname as seller_nickname, seller.avatar as seller_avatar
      FROM orders o
      LEFT JOIN users buyer ON o.buyer_id = buyer.id
      LEFT JOIN users seller ON o.seller_id = seller.id
      WHERE ${type === 'buy' ? 'o.buyer_id' : 'o.seller_id'} = ?
    `
    const params = [userId]

    if (status) {
      sql += ' AND o.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY o.created_at DESC'

    const [orders] = await db.query(sql, params)
    res.json({ code: 0, data: orders })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

module.exports = router

