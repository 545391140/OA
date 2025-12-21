# 酒店预订 v2 API 成功测试报告

## 测试时间
2025-12-21

## 重要发现

### ✅ v2 API 权限已生效
- **端点**: `POST /v2/booking/hotel-orders`
- **Base URL**: `test.api.amadeus.com/v2`
- **状态**: ✅ **成功**（HTTP 201 Created）

### v2 API 请求格式

根据官方文档和测试，v2 API 的请求格式与 v1 不同：

```json
{
  "data": {
    "type": "hotel-order",
    "guests": [
      {
        "tid": 1,
        "title": "MR",
        "firstName": "BOB",
        "lastName": "SMITH",
        "phone": "+33679278416",
        "email": "bob.smith@email.com"
      }
    ],
    "travelAgent": {
      "contact": {
        "email": "bob.smith@email.com"
      }
    },
    "roomAssociations": [
      {
        "guestReferences": [
          {
            "guestReference": "1"
          }
        ],
        "hotelOfferId": "4L8PRJPEN7"
      }
    ],
    "payment": {
      "method": "CREDIT_CARD",
      "paymentCard": {
        "paymentCardInfo": {
          "vendorCode": "VI",
          "cardNumber": "4151289722471370",
          "expiryDate": "2026-08",
          "holderName": "BOB SMITH"
        }
      }
    }
  }
}
```

### 关键差异

1. **`tid` 参数**：在 `guests` 数组中，每个 guest 需要 `tid`（Transaction ID），从 1 开始
2. **`roomAssociations`**：使用 `roomAssociations` 而不是 `offerId`
3. **`payment` 必填**：v2 API 要求必须提供支付信息
4. **`travelAgent`**：需要提供旅行社联系信息
5. **电话号码格式**：使用完整电话号码字符串（包含国家代码），如 `+11234567890`

## 测试结果

### API Key 1: `bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2`
- ✅ Token 获取成功
- ✅ 报价获取成功
- ✅ **预订 API v2 调用成功**（HTTP 201）

### 响应示例

```json
{
  "data": {
    "type": "hotel-order",
    "id": "Nzc0RDlMLzIwMjUtMTItMjE=",
    "hotel": {
      "hotelId": "ALNYC647",
      "chainCode": "AL",
      "name": "ALOFT MANHATTAN DOWNTOWN FINANCIAL DIST"
    },
    "guests": [
      {
        "tid": 1,
        "id": 1,
        "title": "MR",
        "firstName": "TEST",
        "lastName": "USER",
        "phone": "+11234567890",
        "email": "test@example.com"
      }
    ],
    "associatedRecords": [
      {
        "reference": "774D9L",
        "originSystemCode": "GDS"
      }
    ]
  }
}
```

## 代码更新

已更新 `backend/services/amadeus/hotelBookingSdk.js` 以支持 v2 API：

1. ✅ 更新请求格式以匹配 v2 API
2. ✅ 添加 `tid` 参数处理
3. ✅ 添加 `roomAssociations` 构建逻辑
4. ✅ 添加电话号码格式化函数
5. ✅ 使用 HTTP 直接调用（因为 SDK 可能不支持 v2）

## 下一步

1. ✅ 更新前端代码以传递 `payment` 参数
2. ✅ 更新数据库模型以存储 v2 API 返回的数据格式
3. ✅ 测试完整的预订流程

---

**测试完成时间**: 2025-12-21  
**API 版本**: v2  
**状态**: ✅ 成功

