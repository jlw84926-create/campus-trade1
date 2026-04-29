const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const auth = require('../middleware/auth')

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('只支持图片格式'))
    }
  }
})

// 上传图片
router.post('/image', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.json({ code: 400, message: '请选择文件' })
    }

    // 返回文件URL（实际部署时应该返回完整的URL）
    const url = `/uploads/${req.file.filename}`

    res.json({
      code: 0,
      data: {
        url,
        filename: req.file.filename,
        size: req.file.size
      }
    })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '上传失败' })
  }
})

// 上传多张图片
router.post('/images', auth, upload.array('files', 9), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.json({ code: 400, message: '请选择文件' })
    }

    const urls = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size
    }))

    res.json({ code: 0, data: urls })
  } catch (error) {
    console.error(error)
    res.json({ code: 500, message: '上传失败' })
  }
})

// 错误处理
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.json({ code: 400, message: '文件大小不能超过5MB' })
    }
    return res.json({ code: 400, message: error.message })
  }
  res.json({ code: 500, message: error.message || '上传失败' })
})

module.exports = router
