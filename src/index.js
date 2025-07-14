const WebSocket = require("ws");
const Decimal = require("decimal.js");

// 获取命令行参数
const args = process.argv.slice(2);
const platform = args[0] || 'mexc-hotcoin'; // 默认运行bitmart-hotcoin

console.log(`启动价差监控程序: ${platform}`);

// 根据参数决定运行哪个监控程序
switch (platform) {
  case 'bitmart-hotcoin':
    require('./bitmart_hotcoin_ws.js');
    break;
  case 'mexc-hotcoin':
    require('./mexc_hotcoin_ws.js');
    break;
  case 'bitmart-mexc':
    require('./bitmart_mexc_ws.js');
    break;
  default:
    console.log('支持的平台组合:');
    console.log('  bitmart-hotcoin  - Bitmart vs Hotcoin');
    console.log('  mexc-hotcoin     - Mexc vs Hotcoin');
    console.log('  bitmart-mexc     - Bitmart vs Mexc');
    console.log('');
    console.log('使用方法: node index.js [platform] 或者 npm run start:[platform]');
    console.log('示例: node index.js bitmart-hotcoin');
    process.exit(1);
}
