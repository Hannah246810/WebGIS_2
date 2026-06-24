# 📡 核心 RESTful API 接口定义文档

所有后端 API 请求根路径统一为：`http://localhost:3000/api`

### 1. 获取审核通过的设施列表（含分类筛选与搜索）
* **URL**: `/api/places`
* **Method**: `GET`
* **请求参数 (Query)**:
  | 参数名 | 类型 | 是否必填 | 说明 |
  | :--- | :--- | :--- | :--- |
  | `category` | String | 否 | 设施分类（餐饮/快递/学习/生活/交通/其他） |
  | `keyword` | String | 否 | 模糊搜索的关键词（匹配设施或店铺名称） |
* **返回参数 (Status 200 OK)**:
  ```json
  [
    {
      "place_id": 1,
      "name": "一食堂二楼黄焖鸡",
      "category": "餐饮",
      "lng": 118.82345,
      "lat": 32.11456,
      "description": "星巴克旁楼梯上二楼右转",
      "status_tag": "正在营业"
    }
  ]