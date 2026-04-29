const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')
const shopOwner = require('../middleware/shopOwner')
const { msgSecCheck } = require('../utils/security')

// 获取超市商品列表
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, keyword, building_id, shop_id, sort } = req.query
    const offset = (page - 1) * limit

    console.log('查询超市商品参数:', { page, limit, category, keyword, building_id, shop_id, sort })

    let sql = `
      SELECT p.*, s.name as shop_name, s.status as shop_status
      FROM shop_products p
      LEFT JOIN shops s ON p.shop_id = s.id
      WHERE p.status = 'active'
    `
    const params = []

    // 按楼栋过滤（核心功能）
    if (building_id) {
      sql += ' AND p.building_id = ?'
      params.push(building_id)
    }

    if (shop_id) {
      sql += ' AND p.shop_id = ?'
      params.push(shop_id)
    }

    if (category && category !== 'recommend') {
      sql += ' AND p.category = ?'
      params.push(category)
    }

    if (keyword) {
      sql += ' AND p.name LIKE ?'
      params.push(`%${keyword}%`)
    }

    if (sort === 'sales') {
      sql += ' ORDER BY p.sales DESC'
    } else if (sort === 'price_asc') {
      sql += ' ORDER BY p.price ASC'
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY p.price DESC'
    } else {
      sql += ' ORDER BY p.created_at DESC'
    }

    sql += ' LIMIT ? OFFSET ?'
    params.push(parseInt(limit), offset)

    console.log('执行SQL:', sql)
    console.log('参数:', params)

    const [products] = await db.query(sql, params)

    console.log('查询到商品数量:', products.length)

    products.forEach(item => {
      try {
        // 处理 images 字段
        if (typeof item.images === 'string') {
          // 如果是云存储fileID（以cloud://开头），转为数组
          if (item.images.startsWith('cloud://')) {
            item.images = [item.images]
          } else {
            item.images = JSON.parse(item.images || '[]')
          }
        } else if (!Array.isArray(item.images)) {
          item.images = []
        }

        // 处理 specs 字段
        if (typeof item.specs === 'string') {
          item.specs = JSON.parse(item.specs || '[]')
        } else if (!Array.isArray(item.specs)) {
          item.specs = []
        }

        // 处理 delivery_buildings 字段
        if (typeof item.delivery_buildings === 'string') {
          item.delivery_buildings = JSON.parse(item.delivery_buildings || '[]')
        } else if (!Array.isArray(item.delivery_buildings)) {
          item.delivery_buildings = []
        }
      } catch (e) {
        console.error('解析JSON失败:', e.message, '商品ID:', item.id)
        // 设置默认值
        item.images = []
        item.specs = []
        item.delivery_buildings = []
      }
    })

    res.json({ code: 0, data: { list: products, page, limit } })
  } catch (error) {
    console.error('查询超市商品失败:', error)
    res.json({ code: 500, message: '服务器错误', error: error.message })
  }
})

// 获取商品详情
router.get('/products/:id', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, s.name as shop_name, s.status as shop_status, s.building as shop_building,
             u.nickname, u.avatar
      FROM shop_products p
      LEFT JOIN shops s ON p.shop_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [req.params.id])

    if (products.length === 0) {
      return res.json({ code: 404, message: '商品不存在' })
    }

    const item = products[0]

    try {
      // 处理 images 字段
      if (typeof item.images === 'string') {
        if (item.images.startsWith('cloud://')) {
          item.images = [item.images]
        } else {
          item.images = JSON.parse(item.images || '[]')
        }
      } else if (!Array.isArray(item.images)) {
        item.images = []
      }

      // 处理 specs 字段
      if (typeof item.specs === 'string') {
        item.specs = JSON.parse(item.specs || '[]')
      } else if (!Array.isArray(item.specs)) {
        item.specs = []
      }

      // 处理 delivery_buildings 字段
      if (typeof item.delivery_buildings === 'string') {
        item.delivery_buildings = JSON.parse(item.delivery_buildings || '[]')
      } else if (!Array.isArray(item.delivery_buildings)) {
        item.delivery_buildings = []
      }
    } catch (e) {
      console.error('解析JSON失败:', e.message, '商品ID:', item.id)
      item.images = []
      item.specs = []
      item.delivery_buildings = []
    }

    item.shop = {
      id: item.shop_id,
      name: item.shop_name,
      status: item.shop_status,
      building: item.shop_building
    }
    item.seller = { nickname: item.nickname, avatar: item.avatar }

    res.json({ code: 0, data: item })
  } catch (error) {
    console.error('查询商品详情失败:', error)
    res.json({ code: 500, message: '服务器错误', error: error.message })
  }
})

// 发布超市商品
router.post('/products', shopOwner, async (req, res) => {
  try {
    const { name, images, category, specs, price, original_price, stock, description, delivery_buildings, building_id } = req.body

    if (!name || !price || !images || images.length === 0) {
      return res.json({ code: 400, message: '请填写必要信息' })
    }

    const secResult = await msgSecCheck(`${name} ${description || ''}`)
    if (!secResult.safe) {
      return res.json({ code: 400, message: secResult.message || '内容包含敏感信息' })
    }

    // 获取卖家的店铺
    const [shops] = await db.query('SELECT id FROM shops WHERE owner_id = ?', [req.userId])
    if (shops.length === 0) {
      return res.json({ code: 400, message: '请先创建店铺' })
    }
    const shopId = shops[0].id

    const [result] = await db.query(`
      INSERT INTO shop_products (shop_id, building_id, user_id, name, images, category, specs, price, original_price, stock, description, delivery_buildings, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    `, [shopId, building_id || null, req.userId, name, JSON.stringify(images), category || 'other', JSON.stringify(specs || []), price, original_price, stock || 0, description, JSON.stringify(delivery_buildings || [])])

    res.json({ code: 0, data: { id: result.insertId } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '发布失败' })
  }
})

// 编辑超市商品
router.put('/products/:id', shopOwner, async (req, res) => {
  try {
    const { name, images, category, specs, price, original_price, stock, description, delivery_buildings, status } = req.body

    const [products] = await db.query('SELECT user_id FROM shop_products WHERE id = ?', [req.params.id])
    if (products.length === 0) return res.json({ code: 404, message: '商品不存在' })
    if (products[0].user_id !== req.userId) return res.json({ code: 403, message: '无权限' })

    await db.query(`
      UPDATE shop_products SET name = ?, images = ?, category = ?, specs = ?, price = ?,
      original_price = ?, stock = ?, description = ?, delivery_buildings = ?, status = ?
      WHERE id = ?
    `, [name, JSON.stringify(images), category, JSON.stringify(specs || []), price, original_price, stock, description, JSON.stringify(delivery_buildings || []), status || 'active', req.params.id])

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 下架超市商品
router.delete('/products/:id', shopOwner, async (req, res) => {
  try {
    const [products] = await db.query('SELECT user_id FROM shop_products WHERE id = ?', [req.params.id])
    if (products.length === 0) return res.json({ code: 404, message: '商品不存在' })
    if (products[0].user_id !== req.userId) return res.json({ code: 403, message: '无权限' })

    await db.query('UPDATE shop_products SET status = ? WHERE id = ?', ['deleted', req.params.id])
    res.json({ code: 0, message: '下架成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '下架失败' })
  }
})

// 获取店铺信息
router.get('/info', async (req, res) => {
  try {
    const { owner_id, building } = req.query
    let sql = 'SELECT * FROM shops WHERE 1=1'
    const params = []

    if (owner_id) {
      sql += ' AND owner_id = ?'
      params.push(owner_id)
    }
    if (building) {
      sql += ' AND building = ?'
      params.push(building)
    }

    const [shops] = await db.query(sql, params)
    if (shops.length === 0) return res.json({ code: 404, message: '店铺不存在' })

    const shop = shops[0]
    try {
      shop.delivery_buildings = typeof shop.delivery_buildings === 'string'
        ? JSON.parse(shop.delivery_buildings)
        : (shop.delivery_buildings || [])
    } catch (e) {
      console.error('解析 delivery_buildings 失败:', e.message, shop.delivery_buildings)
      shop.delivery_buildings = []
    }
    res.json({ code: 0, data: shop })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 切换营业状态
router.put('/status', shopOwner, async (req, res) => {
  try {
    const { status } = req.body
    if (!['open', 'closed'].includes(status)) {
      return res.json({ code: 400, message: '无效状态' })
    }

    await db.query('UPDATE shops SET status = ? WHERE owner_id = ?', [status, req.userId])
    res.json({ code: 0, message: status === 'open' ? '已开始营业' : '已暂停营业' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '操作失败' })
  }
})

module.exports = router
