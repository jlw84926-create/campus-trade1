const express = require('express')
const router = express.Router()
const axios = require('axios')
const jwt = require('jsonwebtoken')
const db = require('../utils/db')
const auth = require('../middleware/auth')

// 用于缓存已使用的code（简单防重用，生产环境建议用Redis）
const usedCodes = new Set()

// 微信登录
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.json({ code: 400, message: '缺少code参数' })
    }

    // 防止code重用
    if (usedCodes.has(code)) {
      return res.json({ code: 400, message: 'code已被使用' })
    }

    console.log('开始微信登录，code:', code.substring(0, 10) + '...')

    // 调用微信接口获取openid（设置5秒超时）
    const wxRes = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WX_APPID,
        secret: process.env.WX_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      },
      timeout: 5000 // 5秒超时
    })

    console.log('微信API响应:', wxRes.data)

    const { openid, session_key, errcode, errmsg } = wxRes.data

    if (errcode) {
      console.error('微信登录失败:', errcode, errmsg)
      return res.json({ code: 400, message: errmsg || '登录失败' })
    }

    if (!openid) {
      return res.json({ code: 400, message: '登录失败' })
    }

    // 标记code已使用（5分钟后自动清理）
    usedCodes.add(code)
    setTimeout(() => usedCodes.delete(code), 5 * 60 * 1000)

    // 查询或创建用户
    let [users] = await db.query('SELECT * FROM users WHERE openid = ?', [openid])

    if (users.length === 0) {
      // 新用户
      const [result] = await db.query(
        'INSERT INTO users (openid, credit_score, created_at) VALUES (?, 100, NOW())',
        [openid]
      )
      users = [{ id: result.insertId, openid, credit_score: 100 }]
    }

    const user = users[0]

    // 生成token（7天有效期）
    const token = jwt.sign(
      { userId: user.id, openid },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // 生成refresh token（30天有效期）
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      code: 0,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          credit_score: user.credit_score,
          is_shop_owner: user.is_shop_owner || 0,
          is_admin: user.is_admin || 0,
          building_id: user.building_id,
          room_number: user.room_number,
          campus: user.campus,
          building: user.building
        }
      }
    })
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.error('微信API超时:', error.message)
      return res.json({ code: 500, message: '微信服务响应超时，请重试' })
    }
    console.error('登录错误:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 刷新token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.json({ code: 400, message: '缺少refreshToken' })
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)

    if (decoded.type !== 'refresh') {
      return res.json({ code: 400, message: '无效的refreshToken' })
    }

    // 查询用户
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.userId])

    if (users.length === 0) {
      return res.json({ code: 404, message: '用户不存在' })
    }

    const user = users[0]

    // 生成新token
    const token = jwt.sign(
      { userId: user.id, openid: user.openid },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      code: 0,
      data: { token }
    })
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.json({ code: 401, message: 'refreshToken已过期，请重新登录' })
    }
    console.error('刷新token错误:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取用户信息（需要登录）
router.get('/userinfo', auth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, nickname, avatar, phone, campus, building, credit_score, balance, commission FROM users WHERE id = ?',
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

module.exports = router
