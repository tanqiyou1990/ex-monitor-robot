const TradingBot = require('./trading.js');

// 示例：在价差监控中集成交易功能
class ArbitrageMonitor {
  constructor() {
    this.tradingBot = new TradingBot();
    this.isTradingEnabled = false; // 控制是否启用自动交易
  }

  async init() {
    if (this.isTradingEnabled) {
      await this.tradingBot.init();
    }
  }

  async close() {
    if (this.isTradingEnabled) {
      await this.tradingBot.close();
    }
  }

  // 处理价差机会
  async handleArbitrageOpportunity(opportunity) {
    console.log('\n=== 发现套利机会 ===');
    console.log(`方向: ${opportunity.direction}`);
    console.log(`价差: ${opportunity.spread} USDT`);
    console.log(`价差率: ${opportunity.diffRatio}%`);
    console.log(`预估收益: ${opportunity.profit} USDT`);
    
    // 检查是否满足交易条件
    if (this.shouldExecuteTrade(opportunity)) {
      console.log('满足交易条件，准备执行交易...');
      
      if (this.isTradingEnabled) {
        // 构建交易机会对象
        const tradeOpportunity = {
          direction: opportunity.direction,
          quantity: opportunity.quantity,
          profit: opportunity.profit,
          bitmartPrice: opportunity.bitmartPrice,
          hotcoinPrice: opportunity.hotcoinPrice,
          mexcPrice: opportunity.mexcPrice
        };
        
        // 执行交易
        const result = await this.tradingBot.executeArbitrage(tradeOpportunity);
        
        if (result.success) {
          console.log('✅ 自动交易执行成功');
        } else {
          console.log('❌ 自动交易执行失败，需要手动处理');
        }
      } else {
        console.log('自动交易已禁用，仅显示机会');
      }
    } else {
      console.log('不满足交易条件，跳过执行');
    }
  }

  // 判断是否应该执行交易
  shouldExecuteTrade(opportunity) {
    // 这里可以添加各种交易条件判断
    const minProfit = 50; // 最小收益阈值（USDT）
    // const minDiffRatio = 0.15; // 最小价差率阈值（%）
    
    return opportunity.profit >= minProfit;
  }
}

// 使用示例
async function example() {
  const monitor = new ArbitrageMonitor();
  
  try {
    await monitor.init();
    
    // 模拟发现套利机会
    const mockOpportunity = {
      direction: 'Bitmart做多 Hotcoin做空',
      spread: 2.5,
      diffRatio: 0.2,
      profit: 1.8,
      quantity: 0.1,
      bitmartPrice: 2500,
      hotcoinPrice: 2502.5
    };
    
    await monitor.handleArbitrageOpportunity(mockOpportunity);
    
  } catch (error) {
    console.error('示例执行失败:', error);
  } finally {
    await monitor.close();
  }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  example();
}

module.exports = ArbitrageMonitor; 