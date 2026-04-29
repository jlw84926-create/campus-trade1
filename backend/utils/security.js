const axios = require('axios')

// 获取微信access_token（缓存2小时）
let accessToken = null
let tokenExpireTime = 0

async function getAccessToken() {
  const now = Date.now()

  // 如果token还有效，直接返回
  if (accessToken && now < tokenExpireTime) {
    return accessToken
  }

  try {
    const res = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: process.env.WX_APPID,
        secret: process.env.WX_SECRET
      }
    })

    if (res.data.access_token) {
      accessToken = res.data.access_token
      // 提前5分钟过期
      tokenExpireTime = now + (res.data.expires_in - 300) * 1000
      return accessToken
    } else {
      throw new Error('获取access_token失败: ' + JSON.stringify(res.data))
    }
  } catch (error) {
    console.error('获取access_token错误:', error.message)
    throw error
  }
}

// 文本内容安全检测
async function msgSecCheck(content) {
  try {
    const token = await getAccessToken()

    const res = await axios.post(
      `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`,
      {
        content,
        version: 2,
        scene: 2, // 1:资料 2:评论 3:论坛 4:社交日志
        openid: 'default'
      }
    )

    // errcode=0 表示内容正常
    // errcode=87014 表示内容含有违法违规内容
    if (res.data.errcode === 0) {
      return { safe: true }
    } else if (res.data.errcode === 87014) {
      return { safe: false, message: '内容包含敏感信息' }
    } else {
      console.error('msgSecCheck错误:', res.data)
      // 检测接口异常时，为了不影响用户体验，允许通过
      return { safe: true, warning: '安全检测异常' }
    }
  } catch (error) {
    console.error('msgSecCheck异常:', error.message)
    // 异常时允许通过
    return { safe: true, warning: '安全检测异常' }
  }
}

// 图片内容安全检测
async function imgSecCheck(imageUrl) {
  try {
    const token = await getAccessToken()

    const res = await axios.post(
      `https://api.weixin.qq.com/wxa/img_sec_check?access_token=${token}`,
      {
        media_url: imageUrl,
        media_type: 2, // 1:音频 2:图片
        version: 2,
        scene: 2,
        openid: 'default'
      }
    )

    if (res.data.errcode === 0) {
      return { safe: true }
    } else if (res.data.errcode === 87014) {
      return { safe: false, message: '图片包含敏感内容' }
    } else {
      console.error('imgSecCheck错误:', res.data)
      return { safe: true, warning: '安全检测异常' }
    }
  } catch (error) {
    console.error('imgSecCheck异常:', error.message)
    return { safe: true, warning: '安全检测异常' }
  }
}

module.exports = {
  msgSecCheck,
  imgSecCheck
}
