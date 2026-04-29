// 腾讯定位服务配置
const TENCENT_LOCATION_CONFIG = {
  // 腾讯位置服务API密钥
  key: 'your_tencent_location_key',
  // 腾讯定位SDK版本
  version: '1.2.1',
  // 定位选项
  options: {
    accuracy: 'high', // 定位精度：high, medium, low
    timeout: 10000, // 定位超时时间（毫秒）
    needAddress: true // 是否需要地址信息
  }
}

export default TENCENT_LOCATION_CONFIG