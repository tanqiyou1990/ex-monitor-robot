const { chromium } = require('playwright');

let browser = null;
let context = null;
let page = null;
let refreshInterval = null;
let isSystemReady = false;

async function init() {
    console.log('初始化MEXC交易页面监控系统...');
    browser = await chromium.launch({ 
        headless: false,
        slowMo: 100
    });
    context = await browser.newContext();
    console.log('浏览器初始化完成');
}

async function close() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        console.log('已停止防掉线刷新');
    }
    if (browser) {
        await browser.close();
        console.log('交易系统已关闭');
    }
}

async function ensureTradingPage() {
    try {
        const currentUrl = page.url();
        const isOnTradingPage = currentUrl.includes('/futures/ETH_USDT');
        
        if (!isOnTradingPage) {
            console.log('🔄 当前不在ETH_USDT交易页面，正在跳转...');
            await page.goto('https://www.mexc.com/futures/ETH_USDT', {
                waitUntil: 'domcontentloaded', // 改为更快的加载状态
                timeout: 60000 // 增加超时时间到60秒
            });
            console.log('✅ 已跳转到ETH_USDT交易页面');
            return true;
        }
        return true;
    } catch (error) {
        console.error('确保交易页面失败:', error);
        return false;
    }
}

async function checkLoginStatus() {
    try {
        // 确保在交易页面
        await ensureTradingPage();
        
        // 检测登录按钮（包含中英文）
        const loginSelectors = [
            'a[class*="_loginBtn_"]',
            'a[href*="/login"]',
            '._loginBtn_6pkth_31',
            // 英文登录按钮
            'a:has-text("Log In")',
            'a:has-text("Login")',
            'button:has-text("Log In")',
            'button:has-text("Login")',
            // 中文登录按钮
            'a:has-text("登录")',
            'button:has-text("登录")',
            'a:has-text("登入")',
            'button:has-text("登入")',
            // 通用登录按钮
            '[class*="login"]',
            '[class*="signin"]',
            'button[class*="login"]',
            'button[class*="signin"]'
        ];
        
        let loginButton = null;
        for (const selector of loginSelectors) {
            loginButton = await page.$(selector);
            if (loginButton) {
                const text = await loginButton.textContent();
                console.log(`找到登录按钮，使用选择器: ${selector} (文本: "${text?.trim()}")`);
                break;
            }
        }
        
        // 检测登录后的元素（包含中英文）
        const loggedInSelectors = [
            '.avatar',
            '.user-avatar',
            '[class*="avatar"]',
            '[class*="user-menu"]',
            '[class*="profile"]',
            'a[href*="/account"]',
            'a[href*="/profile"]',
            // 中文用户相关元素
            '[class*="用户"]',
            '[class*="个人"]',
            '[class*="账户"]',
            'a[href*="/user"]',
            'a[href*="/personal"]'
        ];
        
        let loggedInElement = null;
        for (const selector of loggedInSelectors) {
            loggedInElement = await page.$(selector);
            if (loggedInElement) {
                const text = await loggedInElement.textContent();
                console.log(`找到登录后元素，使用选择器: ${selector} (文本: "${text?.trim()}")`);
                break;
            }
        }
        
        const currentUrl = page.url();
        
        // 改进的登录状态判断逻辑
        let isLoggedIn = false;
        
        if (loginButton) {
            // 如果找到登录按钮，说明未登录
            isLoggedIn = false;
            console.log('❌ 检测到登录按钮，用户未登录');
        } else if (loggedInElement) {
            // 如果找到登录后元素，说明已登录
            isLoggedIn = true;
            console.log('✅ 检测到登录后元素，用户已登录');
        } else {
            // 如果都没找到，需要进一步判断
            console.log('⚠️ 未检测到明确的登录状态，进行额外检查...');
            
            // 检查URL是否在登录页面
            const isOnLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
            if (isOnLoginPage) {
                isLoggedIn = false;
                console.log('❌ 当前在登录页面，用户未登录');
            } else {
                // 检查页面是否有其他登录相关元素
                const anyLoginElement = await page.$('a[href*="/login"], button[class*="login"], [class*="login"]');
                if (anyLoginElement) {
                    isLoggedIn = false;
                    console.log('❌ 检测到其他登录元素，用户未登录');
                } else {
                    // 最后检查是否有用户相关元素
                    const anyUserElement = await page.$('[class*="user"], [class*="avatar"], [class*="profile"]');
                    if (anyUserElement) {
                        isLoggedIn = true;
                        console.log('✅ 检测到用户相关元素，用户已登录');
                    } else {
                        isLoggedIn = false;
                        console.log('❌ 未检测到任何登录或用户元素，假设未登录');
                    }
                }
            }
        }
        
        return {
            isLoggedIn,
            loginButton: !!loginButton,
            loggedInElement: !!loggedInElement,
            currentUrl
        };
        
    } catch (error) {
        console.error('检查登录状态时出错:', error);
        return { isLoggedIn: false, error: error.message };
    }
}

async function waitForLogin() {
    console.log('⏳ 等待用户手动登录...');
    console.log('请在浏览器中完成登录操作...');
    
    let isLoggedIn = false;
    let attempts = 0;
    const maxAttempts = 60; // 最多等待5分钟
    
    while (!isLoggedIn && attempts < maxAttempts) {
        try {
            const status = await checkLoginStatus();
            
            if (status.isLoggedIn) {
                isLoggedIn = true;
                console.log('✅ 检测到用户已登录');
                break;
            }
            
            console.log(`⏳ 等待登录中... (${attempts + 1}/${maxAttempts})`);
            await page.waitForTimeout(5000);
            attempts++;
            
        } catch (error) {
            console.log(`⚠️ 检查登录状态时出错: ${error.message}`);
            await page.waitForTimeout(5000);
            attempts++;
        }
    }
    
    if (!isLoggedIn) {
        console.log('⚠️ 登录等待超时，继续执行...');
    }
    
    return isLoggedIn;
}

async function analyzeTradingElements() {
    try {
        console.log('\n=== 交易页面元素分析 ===');
        
        // 检查交易面板
        const tradingPanels = await page.$$('[class*="trading"], [class*="panel"], [class*="chart"]');
        console.log(`📊 交易面板数量: ${tradingPanels.length}`);
        
        // 检查订单簿
        const orderBooks = await page.$$('[class*="order"], [class*="book"], [class*="depth"]');
        console.log(`📋 订单簿元素数量: ${orderBooks.length}`);
        
        // 检查价格显示
        const priceElements = await page.$$('[class*="price"], [class*="amount"], [class*="value"]');
        console.log(`💰 价格元素数量: ${priceElements.length}`);
        
        // 检查交易按钮
        const tradeButtons = await page.$$('button[class*="buy"], button[class*="sell"], button[class*="trade"]');
        console.log(`🔘 交易按钮数量: ${tradeButtons.length}`);
        
        // 检查输入框
        const inputs = await page.$$('input[type="number"], input[placeholder*="数量"], input[placeholder*="价格"]');
        console.log(`📝 交易输入框数量: ${inputs.length}`);
        
        console.log('=== 交易页面元素分析完成 ===\n');
        
        return {
            tradingPanels: tradingPanels.length,
            orderBooks: orderBooks.length,
            priceElements: priceElements.length,
            tradeButtons: tradeButtons.length,
            inputs: inputs.length
        };
        
    } catch (error) {
        console.error('交易页面元素分析失败:', error);
        return null;
    }
}

async function startAntiTimeoutRefresh() {
    console.log('🔄 启动防掉线刷新机制...');
    
    refreshInterval = setInterval(async () => {
        try {
            // 随机间隔时间：3-5分钟
            const randomDelay = Math.floor(Math.random() * (5 - 3 + 1) + 3) * 60 * 1000;
            
            console.log(`⏰ 等待 ${Math.floor(randomDelay / 1000 / 60)} 分 ${Math.floor((randomDelay / 1000) % 60)} 秒后进行页面刷新...`);
            await page.waitForTimeout(randomDelay);
            
            console.log('🔄 执行防掉线页面刷新...');
            
            try {
                await page.reload({
                    waitUntil: 'domcontentloaded',
                    timeout: 30000 // 30秒超时
                });
                await page.waitForTimeout(2000); // 等待2秒让页面稳定
            } catch (reloadError) {
                console.log('⚠️ 页面刷新超时，但继续执行...');
            }
            
            // 检查登录状态
            const status = await checkLoginStatus();
            if (status.isLoggedIn) {
                console.log('✅ 刷新后登录状态正常');
            } else {
                console.log('⚠️ 刷新后登录状态异常，可能需要重新登录');
            }
            
            // 重新分析交易元素
            await analyzeTradingElements();
            
        } catch (error) {
            console.error('❌ 防掉线刷新失败:', error);
        }
    }, 1000);
}

async function monitorTradingPage() {
    console.log('📊 开始监控交易页面...');
    
    // 定期检查页面状态
    setInterval(async () => {
        try {
            const status = await checkLoginStatus();
            const elements = await analyzeTradingElements();
            
            console.log(`\n📈 页面状态检查 - ${new Date().toLocaleTimeString()}`);
            console.log(`登录状态: ${status.isLoggedIn ? '✅ 已登录' : '❌ 未登录'}`);
            console.log(`交易元素: ${elements?.tradingPanels || 0} 个面板, ${elements?.orderBooks || 0} 个订单簿`);
            
        } catch (error) {
            console.error('页面状态检查失败:', error);
        }
    }, 30000); // 每30秒检查一次
}

async function run() {
    try {
        await init();
        
        // 创建新页面
        page = await context.newPage();
        
        // 直接打开ETH_USDT交易页面
        console.log('🚀 正在打开ETH_USDT交易页面...');
        
        try {
            // 使用更灵活的页面加载方式
            await page.goto('https://www.mexc.com/futures/ETH_USDT', {
                waitUntil: 'domcontentloaded', // 等待DOM加载完成即可
                timeout: 60000 // 60秒超时
            });
            
            // 等待页面基本元素出现
            console.log('⏳ 等待页面基本元素加载...');
            await page.waitForTimeout(3000); // 等待3秒让页面稳定
            
            console.log('✅ 已打开ETH_USDT交易页面');
            
        } catch (timeoutError) {
            console.log('⚠️ 页面加载超时，尝试继续执行...');
            // 即使超时也继续执行，因为页面可能已经部分加载
        }
        
        // 等待用户登录
        const loginSuccess = await waitForLogin();
        
        if (loginSuccess) {
            // 分析交易页面
            await analyzeTradingElements();
            
            // 启动防掉线刷新
            await startAntiTimeoutRefresh();
            
            // 启动页面监控
            monitorTradingPage();
            
            isSystemReady = true;
            
            console.log('\n🎉 系统初始化完成！');
            console.log('📊 正在监控ETH_USDT交易页面...');
            console.log('🔄 防掉线刷新已启动（3-5分钟随机间隔）');
            console.log('📈 页面状态监控已启动（每30秒检查）');
            console.log('按Ctrl+C退出...\n');
            
        } else {
            console.log('⚠️ 登录失败，系统将保持基本监控...');
        }
        
        // 保持系统运行
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ 系统运行错误:', error);
    }
}

// 处理程序退出
process.on('SIGINT', async () => {
    console.log('\n🛑 收到退出信号，正在关闭系统...');
    await close();
    process.exit(0);
});

// 运行程序
run(); 