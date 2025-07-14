const { chromium } = require('playwright');

let browser = null;
let context = null;
let page = null;

async function init() {
    console.log('初始化登录检测调试工具...');
    browser = await chromium.launch({ 
        headless: false,
        slowMo: 100
    });
    context = await browser.newContext();
    console.log('浏览器初始化完成');
}

async function close() {
    if (browser) {
        await browser.close();
        console.log('调试工具已关闭');
    }
}

async function analyzePageElements() {
    try {
        console.log('\n=== 页面元素分析 ===');
        
        // 获取页面标题
        const title = await page.title();
        console.log(`页面标题: ${title}`);
        
        // 获取当前URL
        const currentUrl = page.url();
        console.log(`当前URL: ${currentUrl}`);
        
        // 查找所有按钮
        const buttons = await page.$$('button, a[role="button"]');
        console.log(`\n🔘 找到 ${buttons.length} 个按钮元素:`);
        
        for (let i = 0; i < Math.min(buttons.length, 10); i++) {
            try {
                const text = await buttons[i].textContent();
                const className = await buttons[i].getAttribute('class');
                const href = await buttons[i].getAttribute('href');
                console.log(`  按钮${i + 1}: "${text?.trim()}" (class: ${className}, href: ${href})`);
            } catch (e) {
                console.log(`  按钮${i + 1}: 无法获取文本`);
            }
        }
        
        // 查找所有链接
        const links = await page.$$('a');
        console.log(`\n🔗 找到 ${links.length} 个链接元素:`);
        
        for (let i = 0; i < Math.min(links.length, 10); i++) {
            try {
                const text = await links[i].textContent();
                const href = await links[i].getAttribute('href');
                const className = await links[i].getAttribute('class');
                console.log(`  链接${i + 1}: "${text?.trim()}" (href: ${href}, class: ${className})`);
            } catch (e) {
                console.log(`  链接${i + 1}: 无法获取文本`);
            }
        }
        
        // 查找包含特定文本的元素
        const textSelectors = [
            'a:has-text("登录")',
            'a:has-text("登入")',
            'a:has-text("Log In")',
            'a:has-text("Login")',
            'button:has-text("登录")',
            'button:has-text("登入")',
            'button:has-text("Log In")',
            'button:has-text("Login")',
            '[class*="login"]',
            '[class*="signin"]',
            '[class*="user"]',
            '[class*="avatar"]',
            '[class*="profile"]'
        ];
        
        console.log(`\n🔍 特定元素检测:`);
        for (const selector of textSelectors) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    console.log(`  ✅ ${selector}: 找到 ${elements.length} 个元素`);
                    for (let i = 0; i < Math.min(elements.length, 3); i++) {
                        const text = await elements[i].textContent();
                        const className = await elements[i].getAttribute('class');
                        console.log(`    元素${i + 1}: "${text?.trim()}" (class: ${className})`);
                    }
                } else {
                    console.log(`  ❌ ${selector}: 未找到`);
                }
            } catch (e) {
                console.log(`  ⚠️ ${selector}: 检测失败 - ${e.message}`);
            }
        }
        
        console.log('\n=== 页面元素分析完成 ===\n');
        
    } catch (error) {
        console.error('页面元素分析失败:', error);
    }
}

async function run() {
    try {
        await init();
        
        page = await context.newPage();
        
        console.log('🚀 正在打开ETH_USDT交易页面...');
        
        // 替换目标URL
        const HOTCOIN_TRADE_URL = 'https://www.hotcoin.com/zh_CN/contract/exchange/trade/?tradeName=ethusdt';

        try {
            await page.goto(HOTCOIN_TRADE_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            console.log('✅ 页面加载完成');
        } catch (error) {
            console.log('⚠️ 页面加载超时，但继续分析...');
        }
        
        // 分析页面元素
        await analyzePageElements();
        
        console.log('请手动完成登录操作，然后按回车键继续分析...');
        
        // 等待用户输入
        await new Promise((resolve) => {
            process.stdin.once('data', resolve);
        });
        
        // 再次分析页面元素
        console.log('\n🔄 登录后页面元素分析...');
        await analyzePageElements();
        
        console.log('调试完成，按Ctrl+C退出...');
        
        // 保持浏览器打开
        await new Promise(() => {});
        
    } catch (error) {
        console.error('调试工具运行错误:', error);
    }
}

// 处理程序退出
process.on('SIGINT', async () => {
    console.log('\n🛑 收到退出信号，正在关闭...');
    await close();
    process.exit(0);
});

// 运行程序
run(); 