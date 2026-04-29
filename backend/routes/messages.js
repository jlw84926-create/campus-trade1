const express = require('express')
const router = express.Router()
const db = require('../utils/db')
const auth = require('../middleware/auth')
const { msgSecCheck } = require('../utils/security')

// 获取会话列表
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.userId

    const [conversations] = await db.query(`
      SELECT
        CASE
          WHEN m.from_user_id = ? THEN m.to_user_id
          ELSE m.from_user_id
        END as user_id,
        u.nickname,
        u.avatar,
        u.building,
        m.content as last_message,
        m.created_at as last_time,
        (SELECT COUNT(*) FROM messages
         WHERE to_user_id = ? AND from_user_id = user_id AND is_read = 0) as unread
      FROM messages m
      LEFT JOIN users u ON (
        CASE
          WHEN m.from_user_id = ? THEN m.to_user_id
          ELSE m.from_user_id
        END = u.id
      )
      WHERE m.from_user_id = ? OR m.to_user_id = ?
      GROUP BY user_id
      ORDER BY m.created_at DESC
    `, [userId, userId, userId, userId, userId])

    res.json({ code: 0, data: conversations })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取聊天记录
router.get('/:userId', auth, async (req, res) => {
  try {
    const myId = req.userId
    const otherId = req.params.userId

    const [messages] = await db.query(`
      SELECT
        id,
        from_user_id,
        to_user_id,
        content,
        type,
        created_at,
        CASE WHEN from_user_id = ? THEN 1 ELSE 0 END as from_me
      FROM messages
      WHERE (from_user_id = ? AND to_user_id = ?)
         OR (from_user_id = ? AND to_user_id = ?)
      ORDER BY created_at ASC
    `, [myId, myId, otherId, otherId, myId])

    // 标记为已读
    await db.query(
      'UPDATE messages SET is_read = 1 WHERE to_user_id = ? AND from_user_id = ?',
      [myId, otherId]
    )

    res.json({ code: 0, data: messages })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 发送消息（HTTP备用）
router.post('/', auth, async (req, res) => {
  try {
    const { to_user_id, content, type = 'text', item_id } = req.body

    // 文本消息安全检测
    if (type === 'text' && content) {
      const secResult = await msgSecCheck(content)
      if (!secResult.safe) {
        return res.json({ code: 400, message: secResult.message || '消息包含敏感信息' })
      }
    }

    const [result] = await db.query(
      'INSERT INTO messages (from_user_id, to_user_id, content, type, item_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [req.userId, to_user_id, content, type, item_id]
    )

    res.json({ code: 0, data: { id: result.insertId } })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '发送失败' })
  }
})

module.exports = router
