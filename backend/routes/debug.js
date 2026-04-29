const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')

// 诊断接口：检查用户状态
router.get('/check-user', auth, async (req, res) => {
  try {
    // 1. 检查用户信息
    const [users] = await db.query(
      'SELECT id, nickname, is_shop_owner, building_id FROM users WHERE id = ?',
      [req.userId]
    )

    // 2. 检查店铺信息
    const [shops] = await db.query(
      'SELECT id, name, status, building FROM shops WHERE owner_id = ?',
      [req.userId]
    )

    // 3. 检查发布的商品
    const [products] = await db.query(
      'SELECT id, name, building_id, shop_id, status FROM shop_products WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [req.userId]
    )

    res.json({
      code: 0,
      data: {
        user: users[0] || null,
        shop: shops[0] || null,
        products: products || []
      }
    })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '查询失败' })
  }
})

// 一键修复：开通超市卖家权限 + 创建店铺
router.post('/fix-shop-owner', auth, async (req, res) => {
  try {
    // 1. 开通超市卖家权限
    await db.query(
      'UPDATE users SET is_shop_owner = 1 WHERE id = ?',
      [req.userId]
    )

    // 2. 检查是否已有店铺
    const [existingShops] = await db.query(
      'SELECT id FROM shops WHERE owner_id = ?',
      [req.userId]
    )

    if (existingShops.length === 0) {
      // 3. 创建店铺
      const [user] = await db.query(
        'SELECT nickname, building_id FROM users WHERE id = ?',
        [req.userId]
      )

      const shopName = `${user[0].nickname}的超市`
      const buildingId = user[0].building_id || 5

      await db.query(
        `INSERT INTO shops (owner_id, name, building, status, delivery_buildings, created_at)
         VALUES (?, ?, ?, 'open', '["5号楼"]', NOW())`,
        [req.userId, shopName, `${buildingId}号楼`]
      )
    }

    res.json({ code: 0, message: '修复成功' })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '修复失败' })
  }
})

module.exports = router
