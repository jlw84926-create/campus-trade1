const jwt = require('jsonwebtoken')
const db = require('../utils/db')

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.json({ code: 401, message: '未登录' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    req.openid = decoded.openid

    // 检查是否为管理员
    const [users] = await db.query('SELECT is_admin FROM users WHERE id = ?', [decoded.userId])

    if (users.length === 0 || !users[0].is_admin) {
      return res.json({ code: 403, message: '无权限访问' })
    }

    next()
  } catch (error) {
    res.json({ code: 401, message: '登录已过期' })
  }
}
