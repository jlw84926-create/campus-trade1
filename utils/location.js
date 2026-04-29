// utils/location.js
// 定位工具函数

/**
 * 获取当前位置
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02', // 返回可以用于wx.openLocation的经纬度
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          speed: res.speed,
          accuracy: res.accuracy
        })
      },
      fail: (err) => {
        console.error('获取位置失败:', err)
        reject(err)
      }
    })
  })
}

/**
 * 打开地图选择位置
 */
export function chooseLocation() {
  return new Promise((resolve, reject) => {
    wx.chooseLocation({
      success: (res) => {
        resolve({
          name: res.name,
          address: res.address,
          latitude: res.latitude,
          longitude: res.longitude
        })
      },
      fail: (err) => {
        console.error('选择位置失败:', err)
        reject(err)
      }
    })
  })
}

/**
 * 打开地图查看位置
 */
export function openLocation(latitude, longitude, name, address) {
  return new Promise((resolve, reject) => {
    wx.openLocation({
      latitude,
      longitude,
      name: name || '位置',
      address: address || '',
      scale: 18,
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 计算两点之间的距离（单位：米）
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // 地球半径（米）
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees) {
  return degrees * Math.PI / 180
}

/**
 * 格式化距离显示
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return Math.round(meters) + 'm'
  } else if (meters < 10000) {
    return (meters / 1000).toFixed(1) + 'km'
  } else {
    return Math.round(meters / 1000) + 'km'
  }
}

/**
 * 检查定位权限
 */
export function checkLocationAuth() {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          resolve(true)
        } else {
          resolve(false)
        }
      },
      fail: reject
    })
  })
}

/**
 * 请求定位权限
 */
export function requestLocationAuth() {
  return new Promise((resolve, reject) => {
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => resolve(true),
      fail: () => {
        // 用户拒绝授权，引导用户打开设置
        wx.showModal({
          title: '需要定位权限',
          content: '为了更好地为您提供服务，需要获取您的位置信息',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.userLocation']) {
                    resolve(true)
                  } else {
                    reject(new Error('用户拒绝授权'))
                  }
                }
              })
            } else {
              reject(new Error('用户拒绝授权'))
            }
          }
        })
      }
    })
  })
}

/**
 * 获取位置（带权限检查）
 * 简化版本：直接调用wx.getLocation，让微信自己处理权限
 */
export async function getLocationWithAuth() {
  return getCurrentLocation()
}
