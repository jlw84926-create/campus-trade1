const axios = require('axios')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// 微信支付配置
const APPID = process.env.WX_APPID
const MCHID = process.env.WX_MCHID
const PAY_KEY = process.env.WX_PAY_KEY

// 生成随机字符串
function generateNonceStr() {
  return crypto.randomBytes(16).toString('hex')
}

// 生成签名
function generateSign(params, key) {
  const sortedKeys = Object.keys(params).sort()
  const stringA = sortedKeys.map(k => `${k}=${params[k]}`).join('&')
  const stringSignTemp = `${stringA}&key=${key}`
  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase()
}

// 统一下单（JSAPI支付）
async function unifiedOrder(orderData) {
  const {
    openid,
    order_no,
    total_amount,
    description,
    notify_url
  } = orderData

  const params = {
    appid: APPID,
    mch_id: MCHID,
    nonce_str: generateNonceStr(),
    body: description || '宿舍超市订单',
    out_trade_no: order_no,
    total_fee: Math.round(total_amount * 100), // 转换为分
    spbill_create_ip: '127.0.0.1',
    notify_url: notify_url || `${process.env.API_BASE_URL}/api/payment/notify`,
    trade_type: 'JSAPI',
    openid: openid
  }

  params.sign = generateSign(params, PAY_KEY)

  // 转换为XML
  const xml = `<xml>
    ${Object.keys(params).map(key => `<${key}>${params[key]}</${key}>`).join('\n')}
  </xml>`

  try {
    const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xml, {
      headers: { 'Content-Type': 'application/xml' }
    })

    // 解析XML响应
    const result = parseXML(response.data)

    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      // 生成小程序支付参数
      const payParams = {
        appId: APPID,
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: generateNonceStr(),
        package: `prepay_id=${result.prepay_id}`,
        signType: 'MD5'
      }

      payParams.paySign = generateSign(payParams, PAY_KEY)

      return {
        success: true,
        data: payParams
      }
    } else {
      return {
        success: false,
        message: result.err_code_des || result.return_msg || '支付失败'
      }
    }
  } catch (error) {
    console.error('微信支付统一下单失败:', error)
    return {
      success: false,
      message: '支付服务异常'
    }
  }
}

// 简单的XML解析
function parseXML(xml) {
  const result = {}
  const regex = /<(\w+)>([^<]*)<\/\1>/g
  let match
  while ((match = regex.exec(xml)) !== null) {
    result[match[1]] = match[2]
  }
  return result
}

// 查询订单
async function queryOrder(order_no) {
  const params = {
    appid: APPID,
    mch_id: MCHID,
    out_trade_no: order_no,
    nonce_str: generateNonceStr()
  }

  params.sign = generateSign(params, PAY_KEY)

  const xml = `<xml>
    ${Object.keys(params).map(key => `<${key}>${params[key]}</${key}>`).join('\n')}
  </xml>`

  try {
    const response = await axios.post('https://api.mch.weixin.qq.com/pay/orderquery', xml, {
      headers: { 'Content-Type': 'application/xml' }
    })

    const result = parseXML(response.data)
    return result
  } catch (error) {
    console.error('查询订单失败:', error)
    return null
  }
}

// 申请退款
async function refund(refundData) {
  const {
    order_no,
    refund_no,
    total_amount,
    refund_amount,
    reason
  } = refundData

  const params = {
    appid: APPID,
    mch_id: MCHID,
    nonce_str: generateNonceStr(),
    out_trade_no: order_no,
    out_refund_no: refund_no,
    total_fee: Math.round(total_amount * 100),
    refund_fee: Math.round(refund_amount * 100),
    refund_desc: reason || '用户申请退款'
  }

  params.sign = generateSign(params, PAY_KEY)

  const xml = `<xml>
    ${Object.keys(params).map(key => `<${key}>${params[key]}</${key}>`).join('\n')}
  </xml>`

  try {
    // 退款需要证书
    const certPath = process.env.WX_PAY_CERT_PATH
    const keyPath = process.env.WX_PAY_KEY_PATH

    const response = await axios.post('https://api.mch.weixin.qq.com/secapi/pay/refund', xml, {
      headers: { 'Content-Type': 'application/xml' },
      httpsAgent: new (require('https').Agent)({
        cert: fs.existsSync(certPath) ? fs.readFileSync(certPath) : null,
        key: fs.existsSync(keyPath) ? fs.readFileSync(keyPath) : null
      })
    })

    const result = parseXML(response.data)

    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      return { success: true, data: result }
    } else {
      return { success: false, message: result.err_code_des || '退款失败' }
    }
  } catch (error) {
    console.error('申请退款失败:', error)
    return { success: false, message: '退款服务异常' }
  }
}

// 验证支付回调签名
function verifyNotifySign(data) {
  const sign = data.sign
  delete data.sign
  const calculatedSign = generateSign(data, PAY_KEY)
  return sign === calculatedSign
}

module.exports = {
  unifiedOrder,
  queryOrder,
  refund,
  verifyNotifySign,
  parseXML
}
