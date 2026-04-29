const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')

// 获取服务列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status = 'pending' } = req.query
    const offset = (page - 1) * limit

    let sql = `
      SELECT s.*, u.nickname, u.avatar, u.building
      FROM services s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `
    const params = []

    if (type) {
      sql += ' AND s.type = ?'
      params.push(type)
    }

    if (status) {
      sql += ' AND s.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), offset)

    const [services] = await db.query(sql, params)

    // 处理数据
    services.forEach(item => {
      item.user = {
        id: item.user_id,
        nickname: item.nickname,
        avatar: item.avatar,
        building: item.building
      }
      delete item.user_id
      delete item.nickname
      delete item.avatar
      delete item.building

      // 添加类型文本
      const typeMap = {
        express: '代拿快递',
        food: '代拿外卖',
        help: '学习互助',
        other: '其他代办'
      }
      item.typeText = typeMap[item.type] || item.type
    })

    res.json({ code: 0, data: { list: services, page, limit } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取服务详情
router.get('/:id', async (req, res) => {
  try {
    const [services] = await db.query(`
      SELECT s.*, u.nickname, u.avatar, u.building, u.credit_score
      FROM services s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [req.params.id])

    if (services.length === 0) {
      return res.json({ code: 404, message: '服务不存在' })
    }

    const item = services[0]
    item.user = {
      id: item.user_id,
      nickname: item.nickname,
      avatar: item.avatar,
      building: item.building,
      credit_score: item.credit_score
    }

    const typeMap = {
      express: '代拿快递',
      food: '代拿外卖',
      help: '学习互助',
      other: '其他代办'
    }
    item.typeText = typeMap[item.type] || item.type

    res.json({ code: 0, data: item })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 发布服务
router.post('/', auth, async (req, res) => {
  try {
    const { type, title, reward, deadline, location, pickup_code, platform, description } = req.body

    const [result] = await db.query(`
      INSERT INTO services (user_id, type, title, reward, deadline, location, pickup_code, platform, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [req.userId, type, title, reward, deadline, location, pickup_code, platform, description])

    res.json({ code: 0, data: { id: result.insertId } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '发布失败' })
  }
})

// 接单
router.post('/:id/take', auth, async (req, res) => {
  try {
    const serviceId = req.params.id
    const takerId = req.userId

    // 检查服务状态
    const [services] = await db.query(
      'SELECT * FROM services WHERE id = ? AND status = "pending"',
      [serviceId]
    )

    if (services.length === 0) {
      return res.json({ code: 400, message: '服务不可接单' })
    }

    // 更新服务状态
    await db.query(
      'UPDATE services SET status = "in_progress", taker_id = ? WHERE id = ?',
      [takerId, serviceId]
    )

    res.json({ code: 0, message: '接单成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '接单失败' })
  }
})

// 更新服务状态
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body
    const serviceId = req.params.id

    await db.query(
      'UPDATE services SET status = ? WHERE id = ? AND taker_id = ?',
      [status, serviceId, req.userId]
    )

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '更新失败' })
  }
})

module.exports = router
