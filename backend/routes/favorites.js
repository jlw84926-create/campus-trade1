const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')

// 收藏商品
router.post('/', auth, async (req, res) => {
  try {
    const { goods_id } = req.body

    // 检查商品是否存在
    const [goods] = await db.query('SELECT id FROM goods WHERE id = ? AND status = ?', [goods_id, 'active'])
    if (goods.length === 0) {
      return res.json({ code: 404, message: '商品不存在' })
    }

    // 检查是否已收藏
    const [existing] = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND goods_id = ?',
      [req.userId, goods_id]
    )

    if (existing.length > 0) {
      return res.json({ code: 400, message: '已收藏过该商品' })
    }

    // 添加收藏
    await db.query(
      'INSERT INTO favorites (user_id, goods_id, created_at) VALUES (?, ?, NOW())',
      [req.userId, goods_id]
    )

    res.json({ code: 0, message: '收藏成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '收藏失败' })
  }
})

// 取消收藏
router.delete('/:goodsId', auth, async (req, res) => {
  try {
    const { goodsId } = req.params

    await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND goods_id = ?',
      [req.userId, goodsId]
    )

    res.json({ code: 0, message: '取消收藏成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '取消收藏失败' })
  }
})

// 获取收藏列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const [favorites] = await db.query(`
      SELECT f.created_at as favorite_time,
             g.*, u.nickname, u.avatar, u.building
      FROM favorites f
      LEFT JOIN goods g ON f.goods_id = g.id
      LEFT JOIN users u ON g.user_id = u.id
      WHERE f.user_id = ? AND g.status = 'active'
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.userId, parseInt(limit), offset])

    // 处理图片字段
    favorites.forEach(item => {
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
        console.error('解析收藏商品图片失败:', e.message, '商品ID:', item.goods_id)
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

    res.json({ code: 0, data: { list: favorites, page, limit } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

// 检查是否已收藏
router.get('/check/:goodsId', auth, async (req, res) => {
  try {
    const { goodsId } = req.params

    const [result] = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND goods_id = ?',
      [req.userId, goodsId]
    )

    res.json({ code: 0, data: { is_favorited: result.length > 0 } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

module.exports = router
