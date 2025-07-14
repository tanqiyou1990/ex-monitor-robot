# 加密货币套利监控系统

这是一个基于WebSocket的加密货币套利监控系统，支持Bitmart、Hotcoin、Mexc三个平台的价差监控和自动交易。

## 功能特性

- 🔍 **实时价差监控**：通过WebSocket实时监控三个平台的ETH-USDT价格
- 📊 **智能分析**：计算价差率、预估收益、流动性分析
- 🤖 **自动交易**：使用Playwright实现自动化交易（可选）
- 📈 **价格波动分析**：分析价差产生的原因和主要波动平台
- ⚙️ **灵活配置**：支持多种平台组合和交易参数配置

## 安装依赖

```bash
npm install
npx playwright install
```

## 使用方法

### 1. 价差监控（推荐）

```bash
# 监控 Bitmart vs Hotcoin（默认）
npm start

# 监控 Mexc vs Hotcoin
npm run start:mexc-hotcoin

# 监控 Bitmart vs Mexc
npm run start:bitmart-mexc
```

### 2. 测试交易功能

```bash
# 运行交易功能测试
npm run test:trading
```

## 配置说明

### 交易配置 (`src/config.js`)

```javascript
{
  trading: {
    enabled: false, // 是否启用自动交易
    minProfit: 0.5, // 最小收益阈值（USDT）
    minDiffRatio: 0.15, // 最小价差率阈值（%）
    maxQuantity: 1.0, // 最大交易数量
    symbol: 'ETHUSDT' // 交易对
  }
}
```

### 启用自动交易

1. 修改 `src/config.js` 中的 `trading.enabled` 为 `true`
2. 根据实际平台页面结构，完善 `src/trading.js` 中的页面元素选择器
3. 确保已登录各交易平台账户

## 输出示例

```
出现下单机会: Bitmart做多 Hotcoin做空
当前价差: 2.50 USDT
价差率: 0.2000%
扣除手续费后预估收益率: 0.1800%
Bitmart可下单数量：0.5
Hotcoin可下单数量：0.3
可下单数量（取较小值）：0.3
流动性更多的平台: Bitmart
预估实际收益: 0.5400 USDT
本次价差主要由 Bitmart askPrice 波动导致（最新: 2500.00, 均值: 2498.50, 偏离: 1.5000）
当前时间: 2024/1/15 13:30:45
```

## 文件结构

```
src/
├── index.js              # 主入口文件
├── config.js             # 配置文件
├── trading.js            # 交易机器人
├── example_with_trading.js # 交易功能示例
├── bitmart_hotcoin_ws.js # Bitmart vs Hotcoin 监控
├── mexc_hotcoin_ws.js    # Mexc vs Hotcoin 监控
└── bitmart_mexc_ws.js    # Bitmart vs Mexc 监控
```

## 注意事项

⚠️ **重要提醒**：
- 自动交易功能需要根据实际平台页面结构进行调整
- 建议先在测试环境中验证交易逻辑
- 请确保了解交易风险，谨慎使用自动交易功能
- 建议设置合理的止损和风险控制参数

## 开发计划

- [ ] 完善各平台的页面元素选择器
- [ ] 添加更多风险控制功能
- [ ] 支持更多交易对
- [ ] 添加交易历史记录
- [ ] 实现Web界面管理

## 许可证

ISC License