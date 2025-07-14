module.exports = {
  // 交易配置
  trading: {
    enabled: false, // 是否启用自动交易
    minProfit: 50, // 最小收益阈值（USDT）
    minDiffRatio: 0.1, // 最小价差率阈值（%）
    maxQuantity: 15, // 最大交易数量
    symbol: 'ETHUSDT' // 交易对
  },

  // 平台手续费率
  fees: {
    bitmart: 0.0002,
    hotcoin: 0.00016,
    mexc: 0.0001
  },

  // Playwright配置
  playwright: {
    headless: false, // 是否无头模式运行
    slowMo: 100, // 操作延迟（毫秒）
    timeout: 30000 // 超时时间（毫秒）
  },

  // 平台URL
  urls: {
    bitmart: 'https://www.bitmart.com/',
    hotcoin: 'https://www.hotcoin.com/',
    mexc: 'https://www.mexc.com/'
  },

  // 风险控制
  risk: {
    maxDailyTrades: 10, // 每日最大交易次数
    maxDailyLoss: 10, // 每日最大亏损（USDT）
    stopLoss: 0.5 // 止损阈值（%）
  }
}; 