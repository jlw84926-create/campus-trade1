#!/bin/bash

# 接口测试脚本
BASE_URL="http://localhost:3000/api"
TOKEN=""

echo "=========================================="
echo "校园交易所后端接口测试"
echo "=========================================="
echo ""

# 1. 测试登录接口
echo "1. 测试登录接口..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code"}')

echo "响应: $LOGIN_RESPONSE"

# 提取token（需要jq工具）
if command -v jq &> /dev/null; then
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
  echo "Token: $TOKEN"
else
  echo "提示: 安装jq工具可自动提取token (brew install jq 或 apt-get install jq)"
  echo "请手动复制token并设置: export TOKEN='your_token_here'"
fi

echo ""
echo "=========================================="
echo ""

# 2. 测试商品列表
echo "2. 测试商品列表..."
curl -s "$BASE_URL/goods" | head -n 20
echo ""
echo "=========================================="
echo ""

# 3. 测试服务列表
echo "3. 测试服务列表..."
curl -s "$BASE_URL/services" | head -n 20
echo ""
echo "=========================================="
echo ""

# 如果有token，测试需要认证的接口
if [ ! -z "$TOKEN" ]; then
  echo "4. 测试用户信息接口..."
  curl -s "$BASE_URL/user/profile" \
    -H "Authorization: Bearer $TOKEN" | head -n 20
  echo ""
  echo "=========================================="
  echo ""

  echo "5. 测试用户统计接口..."
  curl -s "$BASE_URL/user/stats" \
    -H "Authorization: Bearer $TOKEN" | head -n 20
  echo ""
  echo "=========================================="
  echo ""

  echo "6. 测试我的订单接口..."
  curl -s "$BASE_URL/orders/my?type=buy" \
    -H "Authorization: Bearer $TOKEN" | head -n 20
  echo ""
  echo "=========================================="
  echo ""

  echo "7. 测试会话列表接口..."
  curl -s "$BASE_URL/messages/conversations" \
    -H "Authorization: Bearer $TOKEN" | head -n 20
  echo ""
  echo "=========================================="
  echo ""
else
  echo "提示: 设置TOKEN环境变量后可测试需要认证的接口"
  echo "export TOKEN='your_token_here'"
fi

echo ""
echo "测试完成！"
echo ""
echo "如需测试其他接口，请参考 BACKEND_SETUP.md"
