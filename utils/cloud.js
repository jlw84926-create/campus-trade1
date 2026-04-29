const ENV_ID = 'cloud1-d0goib6mz48e198b6'
const SERVICE = 'wanjialin-4'

const callContainer = (path, method, data) => {
  return new Promise((resolve) => {
    const token = wx.getStorageSync('token')
    const headers = {
      'X-WX-SERVICE': SERVICE,
      'content-type': 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    wx.cloud.callContainer({
      config: { env: ENV_ID },
      path,
      method: method || 'POST',
      header: headers,
      data,
      timeout: 30000, // 30秒超时
      success: res => {
        if (res.data && res.data.code === 0) {
          resolve(res.data)
        } else {
          resolve(res.data || { code: 500, message: '服务器错误' })
        }
      },
      fail: (err) => {
        console.error('调用失败:', err)
        resolve({ code: 500, message: '服务器错误' })
      }
    })
  })
}

const goodsApi = {
  list: (data = {}) => callContainer('/api/goods', 'GET', data),
  detail: (id) => callContainer(`/api/goods/${id}`, 'GET'),
  create: (data) => callContainer('/api/goods', 'POST', data),
  update: (id, data) => callContainer(`/api/goods/${id}`, 'PUT', data),
  delete: (id) => callContainer(`/api/goods/${id}`, 'DELETE')
}

const userApi = {
  login: (code) => callContainer('/api/auth/login', 'POST', { code }),
  profile: (user_id) => callContainer(`/api/user/${user_id}`, 'GET'),
  update: (data) => callContainer('/api/user/update', 'PUT', data),
  updateBuilding: (data) => callContainer('/api/user/building', 'PUT', data),
  updateRoom: (data) => callContainer('/api/user/room', 'PUT', data),
  stats: (user_id) => callContainer(`/api/user/${user_id}/stats`, 'GET')
}

const buildingApi = {
  list: () => callContainer('/api/buildings', 'GET'),
  detail: (id) => callContainer(`/api/buildings/${id}`, 'GET')
}

const servicesApi = {
  list: (data = {}) => callContainer('/api/services/list', 'GET', data),
  detail: (id) => callContainer(`/api/services/${id}`, 'GET'),
  create: (data) => callContainer('/api/services', 'POST', data),
  take: (id, user_id) => callContainer(`/api/services/${id}/take`, 'POST', { user_id }),
  updateStatus: (id, status, user_id) => callContainer(`/api/services/${id}/status`, 'PUT', { status, user_id })
}

const ordersApi = {
  create: (data) => callContainer('/api/orders', 'POST', data),
  my: (data) => callContainer('/api/orders/my', 'GET', data),
  confirm: (id, user_id) => callContainer(`/api/orders/${id}/confirm`, 'POST', { user_id })
}

const messagesApi = {
  conversations: (user_id) => callContainer('/api/messages/conversations', 'GET', { user_id }),
  list: (user_id, other_user_id) => callContainer('/api/messages/list', 'GET', { user_id, other_user_id }),
  send: (data) => callContainer('/api/messages/send', 'POST', data)
}

const reviewsApi = {
  create: (data) => callContainer('/api/reviews', 'POST', data),
  getUserReviews: (userId, page, limit) => callContainer(`/api/reviews/user/${userId}`, 'GET', { page, limit }),
  getOrderReviews: (orderId) => callContainer(`/api/reviews/order/${orderId}`, 'GET')
}

const favoritesApi = {
  add: (goods_id) => callContainer('/api/favorites', 'POST', { goods_id }),
  remove: (goodsId) => callContainer(`/api/favorites/${goodsId}`, 'DELETE'),
  list: (page, limit) => callContainer('/api/favorites', 'GET', { page, limit }),
  check: (goodsId) => callContainer(`/api/favorites/check/${goodsId}`, 'GET')
}

const shopApi = {
  products: (data) => callContainer('/api/shop/products', 'GET', data),
  productDetail: (id) => callContainer(`/api/shop/products/${id}`, 'GET'),
  createProduct: (data) => callContainer('/api/shop/products', 'POST', data),
  updateProduct: (id, data) => callContainer(`/api/shop/products/${id}`, 'PUT', data),
  deleteProduct: (id) => callContainer(`/api/shop/products/${id}`, 'DELETE'),
  info: (data) => callContainer('/api/shop/info', 'GET', data),
  setStatus: (data) => callContainer('/api/shop/status', 'PUT', data)
}

const cartApi = {
  list: () => callContainer('/api/cart', 'GET'),
  add: (data) => callContainer('/api/cart', 'POST', data),
  update: (id, data) => callContainer(`/api/cart/${id}`, 'PUT', data),
  remove: (id) => callContainer(`/api/cart/${id}`, 'DELETE'),
  clear: () => callContainer('/api/cart/clear', 'DELETE')
}

const shopOrdersApi = {
  create: (data) => callContainer('/api/shop-orders', 'POST', data),
  myOrders: (data) => callContainer('/api/shop-orders/my', 'GET', data),
  sellerOrders: (data) => callContainer('/api/shop-orders/seller', 'GET', data),
  accept: (id) => callContainer(`/api/shop-orders/${id}/accept`, 'PUT'),
  deliver: (id) => callContainer(`/api/shop-orders/${id}/deliver`, 'PUT'),
  complete: (id) => callContainer(`/api/shop-orders/${id}/complete`, 'PUT'),
  cancel: (id, data) => callContainer(`/api/shop-orders/${id}/cancel`, 'PUT', data)
}

const paymentApi = {
  create: (data) => callContainer('/api/payment/create', 'POST', data),
  query: (order_id) => callContainer(`/api/payment/query/${order_id}`, 'GET'),
  refund: (data) => callContainer('/api/payment/refund', 'POST', data)
}

module.exports = { goodsApi, userApi, buildingApi, servicesApi, ordersApi, messagesApi, reviewsApi, favoritesApi, shopApi, cartApi, shopOrdersApi, paymentApi }
