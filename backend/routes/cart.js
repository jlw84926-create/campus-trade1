const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')

// 获取购物车列表（按店铺分组）
router.get('/', auth, async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT c.*, p.name, p.images, p.price, p.stock, p.status as product_status,
             s.name as shop_name, s.status as shop_status
      FROM cart c
      LEFT JOIN shop_products p ON c.product_id = p.id
      LEFT JOIN shops s ON c.shop_id = s.id
      WHERE c.user_id = ?
      ORDER BY c.shop_id, c.created_at DESC
    `, [req.userId])

    const groups = {}
    items.forEach(item => {
      // 处理 images 字段
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
        console.error('解析购物车商品图片失败:', e.message, '商品ID:', item.product_id)
        item.images = []
      }

      const key = item.shop_id
      if (!groups[key]) {
        groups[key] = {
          shop_id: item.shop_id,
          shop_name: item.shop_name,
          shop_status: item.shop_status,
          items: []
        }
      }
      groups[key].items.push(item)
    })

    res.json({ code: 0, data: Object.values(groups) })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 加入购物车
router.post('/', auth, async (req, res) => {
  try {
    const { product_id, spec, quantity = 1 } = req.body

    const [products] = await db.query('SELECT shop_id, stock, status FROM shop_products WHERE id = ?', [product_id])
    if (products.length === 0) return res.json({ code: 404, message: '商品不存在' })
    if (products[0].status !== 'active') return res.json({ code: 400, message: '商品已下架' })
    if (products[0].stock < quantity) return res.json({ code: 400, message: '库存不足' })

    const shopId = products[0].shop_id
    const [existing] = await db.query(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ? AND spec <=> ?',
      [req.userId, product_id, spec || null]
    )

    if (existing.length > 0) {
      const nextQuantity = existing[0].quantity + quantity
      if (products[0].stock < nextQuantity) {
        return res.json({ code: 400, message: '库存不足' })
      }
      await db.query('UPDATE cart SET quantity = ? WHERE id = ?', [nextQuantity, existing[0].id])
      return res.json({ code: 0, message: '已更新购物车数量' })
    }

    await db.query(
      'INSERT INTO cart (user_id, product_id, shop_id, spec, quantity, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [req.userId, product_id, shopId, spec || null, quantity]
    )

    res.json({ code: 0, message: '加入购物车成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '加入购物车失败' })
  }
})

// 修改数量
router.put('/:id', auth, async (req, res) => {
  try {
    const { quantity } = req.body
    if (!quantity || quantity < 1) return res.json({ code: 400, message: '数量无效' })

    const [items] = await db.query(`
      SELECT c.id, c.user_id, p.stock
      FROM cart c
      LEFT JOIN shop_products p ON c.product_id = p.id
      WHERE c.id = ? AND c.user_id = ?
    `, [req.params.id, req.userId])

    if (items.length === 0) return res.json({ code: 404, message: '购物车商品不存在' })
    if (items[0].stock < quantity) return res.json({ code: 400, message: '库存不足' })

    await db.query('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, req.params.id])
    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 删除单项
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '删除失败' })
  }
})

// 清空购物车
router.delete('/clear', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM cart WHERE user_id = ?', [req.userId])
    res.json({ code: 0, message: '已清空购物车' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '清空失败' })
  }
})

module.exports = router
