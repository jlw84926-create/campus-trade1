const mysql = require('mysql2/promise')

const mysqlAddress = process.env.MYSQL_ADDRESS || ''
const dbHost = process.env.DB_HOST || 'localhost'

let host = 'localhost'
let port = 3306

if (mysqlAddress) {
  const [parsedHost, parsedPort] = mysqlAddress.split(':')
  host = parsedHost || 'localhost'
  port = parseInt(parsedPort, 10) || 3306
} else if (dbHost.includes(':')) {
  const [parsedHost, parsedPort] = dbHost.split(':')
  host = parsedHost || 'localhost'
  port = parseInt(parsedPort, 10) || parseInt(process.env.DB_PORT, 10) || 3306
} else {
  host = dbHost
  port = parseInt(process.env.DB_PORT, 10) || 3306
}

const pool = mysql.createPool({
  host,
  port,
  user: process.env.MYSQL_USERNAME || process.env.DB_USER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'campus_trade',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timezone: '+08:00'
})

pool.getConnection()
  .then(conn => {
    console.log('MySQL 连接成功')
    conn.release()
  })
  .catch(err => {
    console.error('MySQL 连接失败:', err.message)
  })

module.exports = pool
