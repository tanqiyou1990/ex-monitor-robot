const WebSocket = require("ws");
const Decimal = require("decimal.js");

// 价格统计数据
let bitmartCache = {
  askPrice: null,
  bidPrice: null,
  askVol: null,
  bidVol: null,
  lastUpdateTime: null,
};
let hotCache = {
  askPrice: null,
  bidPrice: null,
  askVol: null,
  bidVol: null,
  lastUpdateTime: null,
};

// 记录最近10次价格
const priceHistory = {
  bitmartAsk: [],
  bitmartBid: [],
  hotcoinAsk: [],
  hotcoinBid: []
};

function updateHistory(arr, value) {
  arr.push(value);
  if (arr.length > 10) arr.shift();
}

function avg(arr) {
  if (arr.length === 0) return new Decimal(0);
  return arr.reduce((a, b) => a.plus(b), new Decimal(0)).div(arr.length);
}

// 计算并更新价格差统计
function updatePriceStats() {
  const hotcoinFeeRate = 0.00016;
  const bitmartFeeRate = 0.0002;
  const totalFeeRate = hotcoinFeeRate + bitmartFeeRate;
  
  // Bitmart做多 Hotcoin做空
  if (
    bitmartCache.askPrice &&
    hotCache.bidPrice &&
    bitmartCache.askPrice < hotCache.bidPrice
  ) {
    const spread = new Decimal(bitmartCache.askPrice)
      .minus(hotCache.bidPrice)
      .abs();
    // 分母统一用买入价（Bitmart askPrice）
    const diffRatio = spread.div(bitmartCache.askPrice).mul(100);
    const feePercent = totalFeeRate * 100;
    const netProfitRatio = diffRatio.minus(feePercent);
    if (diffRatio.gt(0.1)) {
      const minQty = Decimal.min(bitmartCache.askVol, hotCache.bidVol);
      const profit = minQty.mul(bitmartCache.askPrice).mul(netProfitRatio).div(100);
      const bitmartQty = bitmartCache.askVol;
      const hotcoinQty = hotCache.bidVol;
      const morePlatform = bitmartQty.gt(hotcoinQty) ? 'Bitmart' : (bitmartQty.lt(hotcoinQty) ? 'Hotcoin' : '相等');
      console.log("\n出现下单机会: Bitmart做多 Hotcoin做空");
      console.log(`当前价差: ${spread.toFixed(2)} USDT`);
      console.log(`价差率: ${diffRatio.toFixed(4)}%`);
      console.log(`扣除手续费后预估收益率: ${netProfitRatio.toFixed(4)}%`);
      console.log(`Bitmart可下单数量：${bitmartQty}`);
      console.log(`Hotcoin可下单数量：${hotcoinQty}`);
      console.log(`可下单数量（取较小值）：${minQty}`);
      console.log(`流动性更多的平台: ${morePlatform}`);
      console.log(`预估实际收益: ${profit.toFixed(4)} USDT`);
      // 计算均值
      const avgBitmartAsk = avg(priceHistory.bitmartAsk);
      const avgBitmartBid = avg(priceHistory.bitmartBid);
      const avgHotcoinAsk = avg(priceHistory.hotcoinAsk);
      const avgHotcoinBid = avg(priceHistory.hotcoinBid);
      // 计算偏离
      const devs = [
        {
          name: 'Bitmart askPrice',
          latest: bitmartCache.askPrice,
          avg: avgBitmartAsk,
          dev: bitmartCache.askPrice && avgBitmartAsk ? bitmartCache.askPrice.minus(avgBitmartAsk).abs() : new Decimal(0)
        },
        {
          name: 'Bitmart bidPrice',
          latest: bitmartCache.bidPrice,
          avg: avgBitmartBid,
          dev: bitmartCache.bidPrice && avgBitmartBid ? bitmartCache.bidPrice.minus(avgBitmartBid).abs() : new Decimal(0)
        },
        {
          name: 'Hotcoin askPrice',
          latest: hotCache.askPrice,
          avg: avgHotcoinAsk,
          dev: hotCache.askPrice && avgHotcoinAsk ? hotCache.askPrice.minus(avgHotcoinAsk).abs() : new Decimal(0)
        },
        {
          name: 'Hotcoin bidPrice',
          latest: hotCache.bidPrice,
          avg: avgHotcoinBid,
          dev: hotCache.bidPrice && avgHotcoinBid ? hotCache.bidPrice.minus(avgHotcoinBid).abs() : new Decimal(0)
        }
      ];
      const maxDev = devs.reduce((a, b) => a.dev.gt(b.dev) ? a : b, devs[0]);
      console.log(`本次价差主要由 ${maxDev.name} 波动导致（最新: ${maxDev.latest}, 均值: ${maxDev.avg.toFixed(4)}, 偏离: ${maxDev.dev.toFixed(4)}）`);
      console.log("当前时间:", new Date().toLocaleString());
    }
  }
  // Bitmart做空 Hotcoin做多
  if (
    bitmartCache.bidPrice &&
    hotCache.askPrice &&
    bitmartCache.bidPrice > hotCache.askPrice
  ) {
    const spread = new Decimal(bitmartCache.bidPrice)
      .minus(hotCache.askPrice)
      .abs();
    // 分母统一用买入价（Hotcoin askPrice）
    const diffRatio = spread.div(hotCache.askPrice).mul(100);
    const feePercent = totalFeeRate * 100;
    const netProfitRatio = diffRatio.minus(feePercent);
    if (diffRatio.gt(0.1)) {
      const minQty = Decimal.min(bitmartCache.bidVol, hotCache.askVol);
      const profit = minQty.mul(hotCache.askPrice).mul(netProfitRatio).div(100);
      const bitmartQty = bitmartCache.bidVol;
      const hotcoinQty = hotCache.askVol;
      const morePlatform = bitmartQty.gt(hotcoinQty) ? 'Bitmart' : (bitmartQty.lt(hotcoinQty) ? 'Hotcoin' : '相等');
      console.log("\n出现下单机会: Bitmart做空 Hotcoin做多");
      console.log(`当前价差: ${spread.toFixed(2)} USDT`);
      console.log(`价差率: ${diffRatio.toFixed(4)}%`);
      console.log(`扣除手续费后预估收益率: ${netProfitRatio.toFixed(4)}%`);
      console.log(`Bitmart可下单数量：${bitmartQty}`);
      console.log(`Hotcoin可下单数量：${hotcoinQty}`);
      console.log(`可下单数量（取较小值）：${minQty}`);
      console.log(`流动性更多的平台: ${morePlatform}`);
      console.log(`预估实际收益: ${profit.toFixed(4)} USDT`);
      // 计算均值
      const avgBitmartAsk = avg(priceHistory.bitmartAsk);
      const avgBitmartBid = avg(priceHistory.bitmartBid);
      const avgHotcoinAsk = avg(priceHistory.hotcoinAsk);
      const avgHotcoinBid = avg(priceHistory.hotcoinBid);
      // 计算偏离
      const devs = [
        {
          name: 'Bitmart askPrice',
          latest: bitmartCache.askPrice,
          avg: avgBitmartAsk,
          dev: bitmartCache.askPrice && avgBitmartAsk ? bitmartCache.askPrice.minus(avgBitmartAsk).abs() : new Decimal(0)
        },
        {
          name: 'Bitmart bidPrice',
          latest: bitmartCache.bidPrice,
          avg: avgBitmartBid,
          dev: bitmartCache.bidPrice && avgBitmartBid ? bitmartCache.bidPrice.minus(avgBitmartBid).abs() : new Decimal(0)
        },
        {
          name: 'Hotcoin askPrice',
          latest: hotCache.askPrice,
          avg: avgHotcoinAsk,
          dev: hotCache.askPrice && avgHotcoinAsk ? hotCache.askPrice.minus(avgHotcoinAsk).abs() : new Decimal(0)
        },
        {
          name: 'Hotcoin bidPrice',
          latest: hotCache.bidPrice,
          avg: avgHotcoinBid,
          dev: hotCache.bidPrice && avgHotcoinBid ? hotCache.bidPrice.minus(avgHotcoinBid).abs() : new Decimal(0)
        }
      ];
      const maxDev = devs.reduce((a, b) => a.dev.gt(b.dev) ? a : b, devs[0]);
      console.log(`本次价差主要由 ${maxDev.name} 波动导致（最新: ${maxDev.latest}, 均值: ${maxDev.avg.toFixed(4)}, 偏离: ${maxDev.dev.toFixed(4)}）`);
      console.log("当前时间:", new Date().toLocaleString());
    }
  }
}

// Bitmart WebSocket连接
function createBitmartWS() {
  let ws = new WebSocket(
    "wss://openapi-ws-v2.bitmart.com/api?protocol=1.1"
  );
  let pingInterval = null;

  ws.on("open", () => {
    console.log("已连接到Bitmart WebSocket服务器");
    // 订阅ETH-USDT永续合约标记价格
    const subscribeMessage = {
      action: "subscribe",
      args: ["futures/depth5:ETHUSDT"],
    };
    ws.send(JSON.stringify(subscribeMessage));
    // 设置定时发送ping
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('{"action":"ping"}');
      }
    }, 10000);
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      if (message.data) {
        if (message.data.way == 2) {
          const asks = message.data.depths;
          bitmartCache.askPrice = new Decimal(asks[0].price);
          bitmartCache.askVol = new Decimal(asks[0].vol * 0.001);
          bitmartCache.lastUpdateTime = new Date().getTime();
          updateHistory(priceHistory.bitmartAsk, bitmartCache.askPrice);
          updatePriceStats();
        }
        if (message.data.way == 1) {
          const bids = message.data.depths;
          bitmartCache.bidPrice = new Decimal(bids[0].price);
          bitmartCache.bidVol = new Decimal(bids[0].vol * 0.001);
          bitmartCache.lastUpdateTime = new Date().getTime();
          updateHistory(priceHistory.bitmartBid, bitmartCache.bidPrice);
          updatePriceStats();
        }
      }
    } catch (error) {
      console.log(data.toString());
      console.error("Bitmart数据处理错误:", error);
    }
  });

  ws.on("error", (error) => {
    console.error("Bitmart WebSocket错误:", error);
  });

  ws.on("close", () => {
    console.log("Bitmart WebSocket连接已关闭，3秒后尝试重连...");
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(() => {
      bitmartWS = createBitmartWS();
    }, 3000);
  });

  return ws;
}

// Hotcoin WebSocket连接
function createHotWS() {
  let ws = new WebSocket("wss://wss-ct.hotcoin.fit");
  let pingInterval = null;

  ws.on("open", () => {
    console.log("已连接到Hotcoin WebSocket服务器");
    // 订阅ETH-USDT永续合约标记价格
    const subscribeMsg = {
      event: "subscribe",
      params: {
        biz: "perpetual",
        type: "depth",
        contractCode: "ethusdt",
        zip: false,
        serialize: false,
      },
    };
    ws.send(JSON.stringify(subscribeMsg));
    // 设置定时发送ping
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('{"event":"ping"}');
      }
    }, 60000);
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.biz == "perpetual") {
        const bizData = message.data;
        const asks = bizData.asks;
        const bids = bizData.bids;
        if (asks.length) {
          hotCache.askPrice = new Decimal(asks[0][0]);
          hotCache.askVol = new Decimal(asks[0][1] * 0.001);
          updateHistory(priceHistory.hotcoinAsk, hotCache.askPrice);
        }
        if (bids.length) {
          hotCache.bidPrice = new Decimal(bids[0][0]);
          hotCache.bidVol = new Decimal(bids[0][1] * 0.001);
          updateHistory(priceHistory.hotcoinBid, hotCache.bidPrice);
        }
        hotCache.lastUpdateTime = new Date().getTime();
        updatePriceStats();
      }
    } catch (error) {
      if (
        data.toString().indexOf("true") <= 0 &&
        data.toString().indexOf("pong") <= 0
      ) {
        console.log(data.toString());
        console.error("Hotcoin数据处理错误:", error);
      }
    }
  });

  ws.on("error", (error) => {
    console.error("Hotcoin WebSocket错误:", error);
  });

  ws.on("close", () => {
    console.log("Hotcoin WebSocket连接已关闭，3秒后尝试重连...");
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(() => {
      hotWS = createHotWS();
    }, 3000);
  });

  return ws;
}

// 启动并赋值全局变量，便于重连
let bitmartWS = createBitmartWS();
let hotWS = createHotWS();
