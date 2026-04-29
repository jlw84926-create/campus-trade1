const express = require('express')
const app = express()
const path = require('path')
const authRoutes = require('./routes/auth')
const goodsRoutes = require('./routes/goods')
const serviceRoutes = require('./routes/services')
const orderRoutes = require('./routes/orders')
const messageRoutes = require('./routes/messages')
const uploadRoutes = require('./routes/upload')
const userRoutes = require('./routes/user')
const adminRoutes = require('./routes/admin')
const reviewRoutes = require('./routes/reviews')
const favoriteRoutes = require('./routes/favorites')
const shopRoutes = require('./routes/shop')
const cartRoutes = require('./routes/cart')
const shopOrderRoutes = require('./routes/shopOrders')
const buildingRoutes = require('./routes/buildings')
const dashboardRoutes = require('./routes/dashboard')
const paymentRoutes = require('./routes/payment')
const debugRoutes = require('./routes/debug')
const { initWebSocket } = require('./utils/websocket')
const { initSchedule } = require('./utils/schedule')

require('dotenv').config()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// CORS - 限制为微信小程序域名
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://servicewechat.com',
    'https://cloud1-d0goib6mz48e198b6.service.tcloudbase.com'
  ]
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.header('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 健康检查（云托管用）
app.get('/', (req, res) => {
  res.json({ code: 0, message: 'ok' })
})

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/goods', goodsRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/user', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/shop', shopRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/shop-orders', shopOrderRoutes)
app.use('/api/buildings', buildingRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/debug', debugRoutes)

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ code: 500, message: '服务器错误' })
})

const PORT = process.env.PORT || 80
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${PORT}`)
  console.log('环境变量检查:')
  console.log('- MYSQL_ADDRESS:', process.env.MYSQL_ADDRESS || '未设置')
  console.log('- MYSQL_USERNAME:', process.env.MYSQL_USERNAME || '未设置')
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '已设置' : '未设置')
})

// 初始化WebSocket（不阻塞启动）
try {
  initWebSocket(server)
} catch (err) {
  console.error('WebSocket 初始化失败:', err.message)
}

// 初始化定时任务（不阻塞启动）
try {
  initSchedule()
} catch (err) {
  console.error('定时任务初始化失败:', err.message)
}

module.exports = app
