const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const admin = require('../middleware/admin')
const path = require('path')

// 管理后台登录页面
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'))
})

// 管理后台页面
router.get('/page', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'))
})

// 获取楼栋列表
router.get('/buildings', admin, async (req, res) => {
  try {
    const [buildings] = await db.query(`
      SELECT
        id AS '楼栋ID',
        name AS '楼栋名称',
        number AS '楼栋编号',
        CASE status
          WHEN 'open' THEN '营业中'
          WHEN 'closed' THEN '已关闭'
        END AS '营业状态',
        created_at AS '创建时间'
      FROM buildings
      ORDER BY number ASC
    `)
    res.json({ code: 0, data: buildings })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取用户列表
router.get('/users', admin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const [users] = await db.query(`
      SELECT
        u.id AS '用户ID',
        u.nickname AS '昵称',
        b.name AS '绑定楼栋',
        u.room_number AS '门牌号',
        u.credit_score AS '信用分',
        u.balance AS '余额',
        CASE u.is_shop_owner
          WHEN 1 THEN '是'
          ELSE '否'
        END AS '是否卖家',
        u.created_at AS '注册时间'
      FROM users u
      LEFT JOIN buildings b ON u.building_id = b.id
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset])

    const [total] = await db.query('SELECT COUNT(*) as count FROM users')

    res.json({ code: 0, data: { list: users, total: total[0].count } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取商品列表
router.get('/products', admin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const [products] = await db.query(`
      SELECT
        p.id AS '商品ID',
        p.name AS '商品名称',
        b.name AS '所属楼栋',
        p.price AS '价格',
        p.stock AS '库存',
        p.sales AS '销量',
        CASE p.status
          WHEN 'active' THEN '上架'
          WHEN 'inactive' THEN '下架'
        END AS '状态',
        p.created_at AS '创建时间'
      FROM shop_products p
      LEFT JOIN buildings b ON p.building_id = b.id
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset])

    const [total] = await db.query('SELECT COUNT(*) as count FROM shop_products')

    res.json({ code: 0, data: { list: products, total: total[0].count } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取订单列表
router.get('/orders', admin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const [orders] = await db.query(`
      SELECT
        o.id AS '订单ID',
        o.order_no AS '订单号',
        buyer.nickname AS '买家',
        b.name AS '配送楼栋',
        o.room_number AS '门牌号',
        o.total_amount AS '订单金额',
        CASE o.status
          WHEN 'pending' THEN '待接单'
          WHEN 'accepted' THEN '待配送'
          WHEN 'delivering' THEN '配送中'
          WHEN 'completed' THEN '已完成'
          WHEN 'cancelled' THEN '已取消'
        END AS '订单状态',
        o.created_at AS '下单时间'
      FROM shop_orders o
      LEFT JOIN users buyer ON o.buyer_id = buyer.id
      LEFT JOIN buildings b ON o.building_id = b.id
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset])

    const [total] = await db.query('SELECT COUNT(*) as count FROM shop_orders')

    res.json({ code: 0, data: { list: orders, total: total[0].count } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取代理列表
router.get('/agents', admin, async (req, res) => {
  try {
    const [agents] = await db.query(`
      SELECT
        a.id AS '代理ID',
        u.nickname AS '代理昵称',
        b.name AS '负责楼栋',
        CASE a.status
          WHEN 'active' THEN '启用'
          WHEN 'disabled' THEN '禁用'
        END AS '状态',
        a.created_at AS '创建时间'
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN buildings b ON a.building_id = b.id
      ORDER BY a.id DESC
    `)
    res.json({ code: 0, data: agents })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取统计数据
router.get('/stats', admin, async (req, res) => {
  try {
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users')
    const [productCount] = await db.query('SELECT COUNT(*) as count FROM shop_products WHERE status = "active"')
    const [orderCount] = await db.query('SELECT COUNT(*) as count FROM shop_orders')
    const [todayOrders] = await db.query('SELECT COUNT(*) as count FROM shop_orders WHERE DATE(created_at) = CURDATE()')
    const [totalAmount] = await db.query('SELECT SUM(total_amount) as total FROM shop_orders WHERE status = "completed"')
    const [agentCount] = await db.query('SELECT COUNT(*) as count FROM agents WHERE status = "active"')
    const [openBuildings] = await db.query('SELECT COUNT(*) as count FROM buildings WHERE status = "open"')

    res.json({
      code: 0,
      data: {
        userCount: userCount[0].count,
        productCount: productCount[0].count,
        orderCount: orderCount[0].count,
        todayOrders: todayOrders[0].count,
        totalAmount: totalAmount[0].total || 0,
        agentCount: agentCount[0].count,
        openBuildings: openBuildings[0].count
      }
    })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// ========== 管理操作接口 ==========

// 切换楼栋营业状态
router.put('/buildings/:id/toggle', admin, async (req, res) => {
  try {
    const [buildings] = await db.query('SELECT status FROM buildings WHERE id = ?', [req.params.id])
    if (buildings.length === 0) return res.json({ code: 404, message: '楼栋不存在' })

    const newStatus = buildings[0].status === 'open' ? 'closed' : 'open'
    await db.query('UPDATE buildings SET status = ? WHERE id = ?', [newStatus, req.params.id])

    res.json({ code: 0, message: newStatus === 'open' ? '已开启营业' : '已关闭营业' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '操作失败' })
  }
})

// 新增代理
router.post('/agents', admin, async (req, res) => {
  try {
    const { user_id, building_id } = req.body
    if (!user_id || !building_id) return res.json({ code: 400, message: '缺少参数' })

    const [existing] = await db.query('SELECT id FROM agents WHERE user_id = ? AND building_id = ?', [user_id, building_id])
    if (existing.length > 0) return res.json({ code: 400, message: '该用户已是该楼栋代理' })

    await db.query('INSERT INTO agents (user_id, building_id, status, created_at) VALUES (?, ?, "active", NOW())', [user_id, building_id])
    await db.query('UPDATE users SET is_shop_owner = 1 WHERE id = ?', [user_id])

    res.json({ code: 0, message: '代理添加成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '操作失败' })
  }
})

// 切换代理状态
router.put('/agents/:id/toggle', admin, async (req, res) => {
  try {
    const [agents] = await db.query('SELECT status FROM agents WHERE id = ?', [req.params.id])
    if (agents.length === 0) return res.json({ code: 404, message: '代理不存在' })

    const newStatus = agents[0].status === 'active' ? 'disabled' : 'active'
    await db.query('UPDATE agents SET status = ? WHERE id = ?', [newStatus, req.params.id])

    res.json({ code: 0, message: newStatus === 'active' ? '已启用' : '已禁用' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '操作失败' })
  }
})

// 删除代理
router.delete('/agents/:id', admin, async (req, res) => {
  try {
    await db.query('DELETE FROM agents WHERE id = ?', [req.params.id])
    res.json({ code: 0, message: '已删除' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '操作失败' })
  }
})

// 按楼栋筛选订单
router.get('/orders-by-building', admin, async (req, res) => {
  try {
    const { building_id, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    let sql = `
      SELECT
        o.id AS '订单ID',
        o.order_no AS '订单号',
        buyer.nickname AS '买家',
        b.name AS '配送楼栋',
        o.room_number AS '门牌号',
        o.address AS '完整地址',
        o.total_amount AS '订单金额',
        o.remark AS '备注',
        CASE o.status
          WHEN 'pending' THEN '待接单'
          WHEN 'accepted' THEN '待配送'
          WHEN 'delivering' THEN '配送中'
          WHEN 'completed' THEN '已完成'
          WHEN 'cancelled' THEN '已取消'
        END AS '订单状态',
        o.created_at AS '下单时间'
      FROM shop_orders o
      LEFT JOIN users buyer ON o.buyer_id = buyer.id
      LEFT JOIN buildings b ON o.building_id = b.id
    `
    const params = []

    if (building_id) {
      sql += ' WHERE o.building_id = ?'
      params.push(building_id)
    }

    sql += ' ORDER BY o.id DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), offset)

    const [orders] = await db.query(sql, params)
    res.json({ code: 0, data: { list: orders } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

module.exports = router
