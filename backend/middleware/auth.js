const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.json({ code: 401, message: '未登录' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    req.openid = decoded.openid
    next()
  } catch (error) {
    res.json({ code: 401, message: '登录已过期' })
  }
}
