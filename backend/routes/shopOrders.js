const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')
const shopOwner = require('../middleware/shopOwner')

function generateOrderNo() {
  const now = new Date()
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
  const rand = Math.random().toString(36).substr(2, 6).toUpperCase()
  return 'S' + ts + rand
}

// 创建超市订单
router.post('/', auth, async (req, res) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const { items, address, building_id, room_number, delivery_time, remark } = req.body
    if (!items || items.length === 0) {
      await connection.rollback()
      return res.json({ code: 400, message: '请选择商品' })
    }
    if (!address) {
      await connection.rollback()
      return res.json({ code: 400, message: '请填写收货地址' })
    }

    let totalAmount = 0
    let shopId = null
    let sellerId = null
    let agentId = null
    const orderItems = []

    for (const item of items) {
      const [products] = await connection.query(
        'SELECT id, shop_id, user_id, name, price, stock, status FROM shop_products WHERE id = ? FOR UPDATE',
        [item.product_id]
      )
      if (products.length === 0) {
        await connection.rollback()
        return res.json({ code: 400, message: `商品 ${item.product_id} 不存在` })
      }
      const p = products[0]
      if (p.status !== 'active') {
        await connection.rollback()
        return res.json({ code: 400, message: `${p.name} 已下架` })
      }
      if (p.stock < item.quantity) {
        await connection.rollback()
        return res.json({ code: 400, message: `${p.name} 库存不足` })
      }

      if (!shopId) {
        shopId = p.shop_id
        sellerId = p.user_id
      }

      const subtotal = parseFloat(p.price) * item.quantity
      totalAmount += subtotal
      orderItems.push({
        product_id: p.id,
        name: p.name,
        spec: item.spec || '',
        price: parseFloat(p.price),
        quantity: item.quantity
      })

      await connection.query(
        'UPDATE shop_products SET stock = stock - ?, sales = sales + ? WHERE id = ?',
        [item.quantity, item.quantity, p.id]
      )
    }

    const platformFee = (totalAmount * 0.05).toFixed(2)
    const sellerAmount = (totalAmount * 0.95).toFixed(2)
    const orderNo = generateOrderNo()

    // 查找负责该楼栋的代理
    if (building_id) {
      const [agents] = await connection.query(
        'SELECT id FROM agents WHERE building_id = ? AND status = "active" LIMIT 1',
        [building_id]
      )
      if (agents.length > 0) {
        agentId = agents[0].id
      }
    }

    const [result] = await connection.query(`
      INSERT INTO shop_orders (order_no, buyer_id, shop_id, seller_id, building_id, room_number, agent_id, items, total_amount, platform_fee, seller_amount, address, delivery_time, remark, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [orderNo, req.userId, shopId, sellerId, building_id || null, room_number || null, agentId || null, JSON.stringify(orderItems), totalAmount.toFixed(2), platformFee, sellerAmount, address, delivery_time || '尽快送达', remark])

    const orderId = result.insertId

    // 清除已下单的购物车商品
    const productIds = items.map(i => i.product_id)
    await connection.query('DELETE FROM cart WHERE user_id = ? AND product_id IN (?)', [req.userId, productIds])

    await connection.commit()
    res.json({ code: 0, data: { id: orderId, order_no: orderNo, total_amount: totalAmount.toFixed(2) } })
  } catch (error) {
    await connection.rollback()
    console.error(error)
    res.json({ code: 500, message: '创建订单失败' })
  } finally {
    connection.release()
  }
})

// 买家订单列表
router.get('/my', auth, async (req, res) => {
  try {
    const { status } = req.query
    let sql = `
      SELECT o.*, s.name as shop_name
      FROM shop_orders o
      LEFT JOIN shops s ON o.shop_id = s.id
      WHERE o.buyer_id = ?
    `
    const params = [req.userId]
    if (status) { sql += ' AND o.status = ?'; params.push(status) }
    sql += ' ORDER BY o.created_at DESC'

    const [orders] = await db.query(sql, params)
    orders.forEach(o => { o.items = JSON.parse(o.items || '[]') })
    res.json({ code: 0, data: orders })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

// 卖家订单列表
router.get('/seller', shopOwner, async (req, res) => {
  try {
    const { status } = req.query
    let sql = `
      SELECT o.*, s.name as shop_name, u.nickname as buyer_nickname, u.avatar as buyer_avatar
      FROM shop_orders o
      LEFT JOIN shops s ON o.shop_id = s.id
      LEFT JOIN users u ON o.buyer_id = u.id
      WHERE o.seller_id = ?
    `
    const params = [req.userId]
    if (status) { sql += ' AND o.status = ?'; params.push(status) }
    sql += ' ORDER BY o.created_at DESC'

    const [orders] = await db.query(sql, params)
    orders.forEach(o => { o.items = JSON.parse(o.items || '[]') })
    res.json({ code: 0, data: orders })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

// 接单
router.put('/:id/accept', shopOwner, async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT id FROM shop_orders WHERE id = ? AND seller_id = ? AND status = "pending"',
      [req.params.id, req.userId]
    )
    if (orders.length === 0) return res.json({ code: 404, message: '订单不存在或状态异常' })
    await db.query('UPDATE shop_orders SET status = "accepted", accept_time = NOW() WHERE id = ?', [req.params.id])
    res.json({ code: 0, message: '接单成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '接单失败' })
  }
})

// 开始配送
router.put('/:id/deliver', shopOwner, async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT id FROM shop_orders WHERE id = ? AND seller_id = ? AND status = "accepted"',
      [req.params.id, req.userId]
    )
    if (orders.length === 0) return res.json({ code: 404, message: '订单不存在或状态异常' })
    await db.query('UPDATE shop_orders SET status = "delivering", deliver_time = NOW() WHERE id = ?', [req.params.id])
    res.json({ code: 0, message: '已开始配送' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '操作失败' })
  }
})

// 确认收货（结算）
router.put('/:id/complete', auth, async (req, res) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const [orders] = await connection.query(
      'SELECT * FROM shop_orders WHERE id = ? AND buyer_id = ? AND status = "delivering"',
      [req.params.id, req.userId]
    )
    if (orders.length === 0) {
      await connection.rollback()
      return res.json({ code: 404, message: '订单不存在或状态异常' })
    }

    const order = orders[0]
    await connection.query('UPDATE shop_orders SET status = "completed", complete_time = NOW() WHERE id = ?', [req.params.id])
    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [order.seller_amount, order.seller_id])
    await connection.query(
      'INSERT INTO platform_revenue (order_id, amount, fee, fee_rate, created_at) VALUES (?, ?, ?, 5.00, NOW())',
      [req.params.id, order.total_amount, order.platform_fee]
    )

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

// 拒绝接单
router.put('/:id/cancel', shopOwner, async (req, res) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const { reason } = req.body
    const [orders] = await connection.query(
      'SELECT * FROM shop_orders WHERE id = ? AND seller_id = ? AND status = "pending"',
      [req.params.id, req.userId]
    )
    if (orders.length === 0) {
      await connection.rollback()
      return res.json({ code: 404, message: '订单不存在或状态异常' })
    }

    const order = orders[0]
    await connection.query(
      'UPDATE shop_orders SET status = "cancelled", cancel_reason = ? WHERE id = ?',
      [reason || '卖家拒绝接单', req.params.id]
    )

    // 恢复库存
    const items = JSON.parse(order.items || '[]')
    for (const item of items) {
      await connection.query(
        'UPDATE shop_products SET stock = stock + ?, sales = GREATEST(0, sales - ?) WHERE id = ?',
        [item.quantity, item.quantity, item.product_id]
      )
    }

    await connection.commit()
    res.json({ code: 0, message: '已拒绝订单' })
  } catch (error) {
    await connection.rollback()
    console.error(error)
    res.json({ code: 500, message: '操作失败' })
  } finally {
    connection.release()
  }
})

module.exports = router
