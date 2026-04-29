const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')

// 获取用户信息
router.get('/profile', auth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, nickname, avatar, campus, building, credit_score, balance, commission FROM users WHERE id = ?',
      [req.userId]
    )

    if (users.length === 0) {
      return res.json({ code: 404, message: '用户不存在' })
    }

    res.json({ code: 0, data: users[0] })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 更新用户信息
router.put('/profile', auth, async (req, res) => {
  try {
    const { nickname, avatar, campus, building } = req.body

    await db.query(
      'UPDATE users SET nickname = ?, avatar = ?, campus = ?, building = ? WHERE id = ?',
      [nickname, avatar, campus, building, req.userId]
    )

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 更新用户楼栋绑定
router.put('/building', auth, async (req, res) => {
  try {
    const { building_id } = req.body

    if (!building_id) {
      return res.json({ code: 400, message: '缺少楼栋ID' })
    }

    await db.query(
      'UPDATE users SET building_id = ? WHERE id = ?',
      [building_id, req.userId]
    )

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 更新用户门牌号
router.put('/room', auth, async (req, res) => {
  try {
    const { room_number } = req.body

    if (!room_number) {
      return res.json({ code: 400, message: '缺少门牌号' })
    }

    await db.query(
      'UPDATE users SET room_number = ? WHERE id = ?',
      [room_number, req.userId]
    )

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取用户统计数据
router.get('/stats', auth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT balance, commission, credit_score FROM users WHERE id = ?',
      [req.userId]
    )

    if (users.length === 0) {
      return res.json({ code: 404, message: '用户不存在' })
    }

    // 获取关注数、粉丝数（暂时返回0）
    const stats = {
      balance: users[0].balance,
      commission: users[0].commission,
      credit_score: users[0].credit_score,
      followers: 0,
      following: 0,
      rating: 5.0
    }

    res.json({ code: 0, data: stats })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取其他用户信息
router.get('/:id', auth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, nickname, avatar, campus, building, credit_score FROM users WHERE id = ?',
      [req.params.id]
    )

    if (users.length === 0) {
      return res.json({ code: 404, message: '用户不存在' })
    }

    res.json({ code: 0, data: users[0] })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

module.exports = router
