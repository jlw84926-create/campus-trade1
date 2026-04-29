const WebSocket = require('ws')
const jwt = require('jsonwebtoken')
const { msgSecCheck } = require('./security')

let wss
const clients = new Map() // userId -> ws
const offlineMessages = new Map() // userId -> messages[]

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    let userId = null

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message)

        // 认证
        if (data.type === 'auth') {
          const decoded = jwt.verify(data.token, process.env.JWT_SECRET)
          userId = decoded.userId
          clients.set(userId, ws)
          ws.send(JSON.stringify({ type: 'auth', success: true }))
          return
        }

        // 发送消息
        if (data.type === 'message' && userId) {
          const { to_user_id, content, message_type, item_id } = data

          // 文本消息安全检测
          if (message_type === 'text' && content) {
            const secResult = await msgSecCheck(content)
            if (!secResult.safe) {
              ws.send(JSON.stringify({
                type: 'error',
                message: secResult.message || '消息包含敏感信息'
              }))
              return
            }
          }

          // 保存到数据库
          try {
            const db = require('./db')
            await db.query(
              'INSERT INTO messages (from_user_id, to_user_id, content, type, item_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
              [userId, to_user_id, content, message_type || 'text', item_id]
            )
          } catch (dbErr) {
            console.error('保存消息失败:', dbErr.message)
          }

          // 推送给接收方
          const targetWs = clients.get(to_user_id)
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'message',
              message_type: message_type || 'text',
              from_user_id: userId,
              content,
              item_id,
              created_at: Date.now()
            }))
          } else {
            // 离线消息存内存
            if (!offlineMessages.has(to_user_id)) {
              offlineMessages.set(to_user_id, [])
            }
            offlineMessages.get(to_user_id).push({
              from_user_id: userId,
              content,
              created_at: Date.now()
            })
          }
        }
      } catch (error) {
        console.error('WebSocket error:', error)
      }
    })

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId)
      }
    })
  })
}

module.exports = { initWebSocket }
