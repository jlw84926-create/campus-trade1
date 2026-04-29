const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')
const { unifiedOrder, queryOrder, refund, verifyNotifySign, parseXML } = require('../utils/wxpay')

// 创建支付订单
router.post('/create', auth, async (req, res) => {
  try {
    const { order_id } = req.body

    if (!order_id) {
      return res.json({ code: 400, message: '缺少订单ID' })
    }

    // 查询订单
    const [orders] = await db.query(
      'SELECT * FROM shop_orders WHERE id = ? AND buyer_id = ?',
      [order_id, req.userId]
    )

    if (orders.length === 0) {
      return res.json({ code: 404, message: '订单不存在' })
    }

    const order = orders[0]

    // 检查订单状态
    if (order.status !== 'pending') {
      return res.json({ code: 400, message: '订单状态不正确' })
    }

    // 获取用户openid
    const [users] = await db.query('SELECT openid FROM users WHERE id = ?', [req.userId])
    if (users.length === 0 || !users[0].openid) {
      return res.json({ code: 400, message: '用户信息不完整' })
    }

    // 调用微信支付统一下单
    const payResult = await unifiedOrder({
      openid: users[0].openid,
      order_no: order.order_no,
      total_amount: parseFloat(order.total_amount),
      description: `宿舍超市订单-${order.order_no}`,
      notify_url: `${process.env.API_BASE_URL || 'https://cloud1-d0goib6mz48e198b6.service.tcloudbase.com/wanjialin-4'}/api/payment/notify`
    })

    if (payResult.success) {
      res.json({ code: 0, data: payResult.data })
    } else {
      res.json({ code: 500, message: payResult.message })
    }
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '创建支付失败' })
  }
})

// 支付回调
router.post('/notify', async (req, res) => {
  try {
    const xml = req.body
    const data = parseXML(xml)

    // 验证签名
    if (!verifyNotifySign(data)) {
      return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>')
    }

    // 验证支付结果
    if (data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS') {
      const order_no = data.out_trade_no
      const transaction_id = data.transaction_id

      // 更新订单状态
      await db.query(
        'UPDATE shop_orders SET status = ?, transaction_id = ?, paid_at = NOW() WHERE order_no = ? AND status = ?',
        ['accepted', transaction_id, order_no, 'pending']
      )

      // 返回成功
      res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>')
    } else {
      res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[支付失败]]></return_msg></xml>')
    }
  } catch (error) {
    console.error('支付回调处理失败:', error)
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>')
  }
})

// 查询支付状态
router.get('/query/:order_id', auth, async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT order_no, status FROM shop_orders WHERE id = ? AND buyer_id = ?',
      [req.params.order_id, req.userId]
    )

    if (orders.length === 0) {
      return res.json({ code: 404, message: '订单不存在' })
    }

    const order = orders[0]

    // 如果订单已支付，直接返回
    if (order.status !== 'pending') {
      return res.json({ code: 0, data: { paid: true, status: order.status } })
    }

    // 查询微信支付订单状态
    const result = await queryOrder(order.order_no)

    if (result && result.trade_state === 'SUCCESS') {
      // 更新订单状态
      await db.query(
        'UPDATE shop_orders SET status = ?, transaction_id = ?, paid_at = NOW() WHERE order_no = ?',
        ['accepted', result.transaction_id, order.order_no]
      )
      res.json({ code: 0, data: { paid: true, status: 'accepted' } })
    } else {
      res.json({ code: 0, data: { paid: false, status: 'pending' } })
    }
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

// 申请退款
router.post('/refund', auth, async (req, res) => {
  try {
    const { order_id, reason } = req.body

    const [orders] = await db.query(
      'SELECT * FROM shop_orders WHERE id = ? AND buyer_id = ?',
      [order_id, req.userId]
    )

    if (orders.length === 0) {
      return res.json({ code: 404, message: '订单不存在' })
    }

    const order = orders[0]

    // 只有已支付的订单才能退款
    if (order.status === 'pending') {
      return res.json({ code: 400, message: '订单未支付' })
    }

    if (order.status === 'cancelled') {
      return res.json({ code: 400, message: '订单已取消' })
    }

    // 生成退款单号
    const refund_no = `RF${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // 调用微信退款
    const refundResult = await refund({
      order_no: order.order_no,
      refund_no: refund_no,
      total_amount: parseFloat(order.total_amount),
      refund_amount: parseFloat(order.total_amount),
      reason: reason || '用户申请退款'
    })

    if (refundResult.success) {
      // 更新订单状态
      await db.query(
        'UPDATE shop_orders SET status = ?, cancel_reason = ?, refund_no = ? WHERE id = ?',
        ['cancelled', reason || '用户申请退款', refund_no, order_id]
      )

      res.json({ code: 0, message: '退款成功' })
    } else {
      res.json({ code: 500, message: refundResult.message })
    }
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '退款失败' })
  }
})

module.exports = router
