const express = require('express')
const router = express.Router()
const db = require('../utils/db')

// 获取所有楼栋列表
router.get('/', async (req, res) => {
  try {
    const [buildings] = await db.query(
      'SELECT id, name, number, status FROM buildings ORDER BY number ASC'
    )
    res.json({ code: 0, data: buildings })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取单个楼栋详情
router.get('/:id', async (req, res) => {
  try {
    const [buildings] = await db.query(
      'SELECT id, name, number, status FROM buildings WHERE id = ?',
      [req.params.id]
    )

    if (buildings.length === 0) {
      return res.json({ code: 404, message: '楼栋不存在' })
    }

    res.json({ code: 0, data: buildings[0] })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

module.exports = router
