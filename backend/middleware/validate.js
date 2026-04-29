// 数据验证工具函数
const validate = {
  // 验证必填字段
  required: (fields) => (req, res, next) => {
    const missing = []
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field)
      }
    }
    if (missing.length > 0) {
      return res.json({ code: 400, message: `缺少必填字段: ${missing.join(', ')}` })
    }
    next()
  },

  // 验证字符串长度
  stringLength: (field, min, max) => (req, res, next) => {
    const value = req.body[field]
    if (value && typeof value === 'string') {
      if (value.length < min || value.length > max) {
        return res.json({ code: 400, message: `${field} 长度必须在 ${min}-${max} 之间` })
      }
    }
    next()
  },

  // 验证数字范围
  numberRange: (field, min, max) => (req, res, next) => {
    const value = req.body[field]
    if (value !== undefined) {
      const num = parseFloat(value)
      if (isNaN(num) || num < min || num > max) {
        return res.json({ code: 400, message: `${field} 必须在 ${min}-${max} 之间` })
      }
    }
    next()
  },

  // 验证枚举值
  enum: (field, values) => (req, res, next) => {
    const value = req.body[field]
    if (value && !values.includes(value)) {
      return res.json({ code: 400, message: `${field} 必须是以下值之一: ${values.join(', ')}` })
    }
    next()
  },

  // 验证数组
  array: (field, minLength = 0, maxLength = Infinity) => (req, res, next) => {
    const value = req.body[field]
    if (value !== undefined) {
      if (!Array.isArray(value)) {
        return res.json({ code: 400, message: `${field} 必须是数组` })
      }
      if (value.length < minLength || value.length > maxLength) {
        return res.json({ code: 400, message: `${field} 数组长度必须在 ${minLength}-${maxLength} 之间` })
      }
    }
    next()
  },

  // 验证评分
  rating: (req, res, next) => {
    const rating = req.body.rating
    if (rating !== undefined) {
      const num = parseInt(rating)
      if (isNaN(num) || num < 1 || num > 5) {
        return res.json({ code: 400, message: '评分必须在 1-5 之间' })
      }
      req.body.rating = num
    }
    next()
  },

  // 防止 XSS 攻击 - 清理 HTML 标签
  sanitize: (fields) => (req, res, next) => {
    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // 移除 HTML 标签
        req.body[field] = req.body[field].replace(/<[^>]*>/g, '')
        // 移除 script 标签内容
        req.body[field] = req.body[field].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      }
    }
    next()
  }
}

module.exports = validate
