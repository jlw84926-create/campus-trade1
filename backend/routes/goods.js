const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { msgSecCheck } = require('../utils/security')

// 获取商品列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category, keyword, sort } = req.query
    const offset = (page - 1) * limit

    let sql = `
      SELECT g.*, u.nickname, u.avatar, u.building
      FROM goods g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE g.status = 'active'
    `
    const params = []

    if (type) {
      sql += ' AND g.type = ?'
      params.push(type)
    }

    if (category) {
      sql += ' AND g.category = ?'
      params.push(category)
    }

    if (keyword) {
      sql += ' AND (g.title LIKE ? OR g.description LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    // 排序
    if (sort === 'price_asc') {
      sql += ' ORDER BY g.price ASC'
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY g.price DESC'
    } else {
      sql += ' ORDER BY g.created_at DESC'
    }

    sql += ' LIMIT ? OFFSET ?'
    params.push(parseInt(limit), offset)

    const [goods] = await db.query(sql, params)

    // 处理图片字段
    goods.forEach(item => {
      try {
        if (typeof item.images === 'string') {
          if (item.images.startsWith('cloud://')) {
            item.images = [item.images]
          } else {
            item.images = JSON.parse(item.images || '[]')
          }
        } else if (!Array.isArray(item.images)) {
          item.images = []
        }
      } catch (e) {
        console.error('解析商品图片失败:', e.message, '商品ID:', item.id)
        item.images = []
      }

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
    })

    res.json({ code: 0, data: { list: goods, page, limit } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取商品详情
router.get('/:id', async (req, res) => {
  try {
    const [goods] = await db.query(`
      SELECT g.*, u.nickname, u.avatar, u.building, u.credit_score,
             (SELECT COUNT(*) FROM orders WHERE seller_id = u.id AND status = 'completed') as sold_count
      FROM goods g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE g.id = ?
    `, [req.params.id])

    if (goods.length === 0) {
      return res.json({ code: 404, message: '商品不存在' })
    }

    const item = goods[0]

    try {
      if (typeof item.images === 'string') {
        if (item.images.startsWith('cloud://')) {
          item.images = [item.images]
        } else {
          item.images = JSON.parse(item.images || '[]')
        }
      } else if (!Array.isArray(item.images)) {
        item.images = []
      }
    } catch (e) {
      console.error('解析商品详情图片失败:', e.message, '商品ID:', item.id)
      item.images = []
    }

    item.user = {
      id: item.user_id,
      nickname: item.nickname,
      avatar: item.avatar,
      building: item.building,
      credit_score: item.credit_score,
      sold_count: item.sold_count
    }

    // 增加浏览量
    await db.query('UPDATE goods SET views = views + 1 WHERE id = ?', [req.params.id])

    res.json({ code: 0, data: item })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 发布商品
router.post('/',
  auth,
  validate.required(['type', 'title', 'price', 'images']),
  validate.enum('type', ['book', 'item']),
  validate.stringLength('title', 1, 100),
  validate.numberRange('price', 0, 999999),
  validate.array('images', 1, 9),
  validate.sanitize(['title', 'description']),
  async (req, res) => {
  try {
    const { type, title, price, negotiable, images, category, condition, description, trade_method, location } = req.body

    // 内容安全检测
    const textToCheck = `${title} ${description || ''}`
    const secResult = await msgSecCheck(textToCheck)
    if (!secResult.safe) {
      return res.json({ code: 400, message: secResult.message || '内容包含敏感信息，请修改后重试' })
    }

    const [result] = await db.query(`
      INSERT INTO goods (user_id, type, title, price, negotiable, images, category, \`condition\`, description, trade_method, location, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    `, [req.userId, type, title, price, negotiable, JSON.stringify(images), category, condition, description, trade_method, location])

    res.json({ code: 0, data: { id: result.insertId } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '发布失败' })
  }
})

// 编辑商品
router.put('/:id',
  auth,
  validate.required(['type', 'title', 'price', 'images']),
  validate.enum('type', ['book', 'item']),
  validate.stringLength('title', 1, 100),
  validate.numberRange('price', 0, 999999),
  validate.array('images', 1, 9),
  validate.sanitize(['title', 'description']),
  async (req, res) => {
  try {
    const { id } = req.params
    const { type, title, price, negotiable, images, category, condition, description, trade_method, location } = req.body

    // 验证商品所有权
    const [goods] = await db.query('SELECT user_id FROM goods WHERE id = ?', [id])
    if (goods.length === 0) {
      return res.json({ code: 404, message: '商品不存在' })
    }
    if (goods[0].user_id !== req.userId) {
      return res.json({ code: 403, message: '无权限编辑' })
    }

    await db.query(`
      UPDATE goods SET type = ?, title = ?, price = ?, negotiable = ?, images = ?,
      category = ?, \`condition\` = ?, description = ?, trade_method = ?, location = ?
      WHERE id = ?
    `, [type, title, price, negotiable, JSON.stringify(images), category, condition, description, trade_method, location, id])

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 删除商品（软删除）
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params

    // 验证商品所有权
    const [goods] = await db.query('SELECT user_id FROM goods WHERE id = ?', [id])
    if (goods.length === 0) {
      return res.json({ code: 404, message: '商品不存在' })
    }
    if (goods[0].user_id !== req.userId) {
      return res.json({ code: 403, message: '无权限删除' })
    }

    await db.query('UPDATE goods SET status = ? WHERE id = ?', ['deleted', id])

    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router

