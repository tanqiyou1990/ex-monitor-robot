const { chromium } = require('playwright');

let browser = null;
let context = null;
let page = null;
let refreshInterval = null;

async function init() {
    console.log('初始化MEXC稳定版监控系统...');
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

async function loadPageWithRetry(url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 尝试加载页面 (第${attempt}次)...`);
            
            // 使用不同的加载策略
            const loadStrategies = [
                { waitUntil: 'domcontentloaded', timeout: 30000 },
                { waitUntil: 'load', timeout: 45000 },
                { waitUntil: 'networkidle', timeout: 60000 }
            ];
            
            const strategy = loadStrategies[Math.min(attempt - 1, loadStrategies.length - 1)];
            
            await page.goto(url, strategy);
            console.log(`✅ 页面加载成功 (使用策略: ${strategy.waitUntil})`);
            return true;
            
        } catch (error) {
            console.log(`⚠️ 第${attempt}次加载失败: ${error.message}`);
            
            if (attempt < maxRetries) {
                console.log(`⏳ 等待3秒后重试...`);
                await page.waitForTimeout(3000);
            } else {
                console.log('❌ 所有重试都失败了，但继续执行...');
                return false;
            }
        }
    }
}

async function checkLoginStatus() {
    try {
        const currentUrl = page.url();
        const isOnTradingPage = currentUrl.includes('/futures/ETH_USDT');
        
        if (!isOnTradingPage) {
            console.log('🔄 当前不在交易页面，正在跳转...');
            await loadPageWithRetry('https://www.mexc.com/futures/ETH_USDT');
        }
        
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
        
        let loginButton = null;
        let loggedInElement = null;
        
        // 检查登录按钮
        console.log('🔍 检查登录按钮...');
        for (const selector of loginSelectors) {
            try {
                loginButton = await page.$(selector);
                if (loginButton) {
                    const text = await loginButton.textContent();
                    console.log(`✅ 找到登录按钮: ${selector} (文本: "${text?.trim()}")`);
                    break;
                }
            } catch (e) {
                // 忽略选择器错误
            }
        }
        
        // 检查登录后元素
        console.log('🔍 检查登录后元素...');
        for (const selector of loggedInSelectors) {
            try {
                loggedInElement = await page.$(selector);
                if (loggedInElement) {
                    const text = await loggedInElement.textContent();
                    console.log(`✅ 找到登录后元素: ${selector} (文本: "${text?.trim()}")`);
                    break;
                }
            } catch (e) {
                // 忽略选择器错误
            }
        }
        
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
    const maxAttempts = 60;
    
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
                    timeout: 30000
                });
                await page.waitForTimeout(2000);
                console.log('✅ 页面刷新成功');
            } catch (reloadError) {
                console.log('⚠️ 页面刷新超时，但继续执行...');
            }
            
            // 检查登录状态
            const status = await checkLoginStatus();
            if (status.isLoggedIn) {
                console.log('✅ 刷新后登录状态正常');
            } else {
                console.log('⚠️ 刷新后登录状态异常');
            }
            
        } catch (error) {
            console.error('❌ 防掉线刷新失败:', error);
        }
    }, 1000);
}

async function run() {
    try {
        await init();
        
        page = await context.newPage();
        
        console.log('🚀 正在打开ETH_USDT交易页面...');
        
        // 使用重试机制加载页面
        const loadSuccess = await loadPageWithRetry('https://www.mexc.com/futures/ETH_USDT');
        
        if (loadSuccess) {
            console.log('✅ 页面加载完成');
        } else {
            console.log('⚠️ 页面加载有问题，但继续执行...');
        }
        
        // 等待用户登录
        const loginSuccess = await waitForLogin();
        
        if (loginSuccess) {
            // 启动防掉线刷新
            await startAntiTimeoutRefresh();
            
            console.log('\n🎉 系统初始化完成！');
            console.log('📊 正在监控ETH_USDT交易页面...');
            console.log('🔄 防掉线刷新已启动（3-5分钟随机间隔）');
            console.log('按Ctrl+C退出...\n');
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