/*

*****小米社区自动签到脚本*****

原作者  by：PJ小宇
修改    by：风中拾叶
三改    by：wengzhenquan

[github更新地址]：

https://github.com/wengzhenquan/autojs6

镜像一：https://bgithub.xyz/wengzhenquan/autojs6
镜像二：https://kkgithub.com/wengzhenquan/autojs6

*/

//auto.waitFor();

device.wakeUpIfNeeded();
device.wakeUp();

//程序运行文件标志
const launch_locked = "./tmp/launch_main_locked";
files.ensureDir(launch_locked)
if (!files.exists(launch_locked)) {
    events.on("exit", () => files.remove(launch_locked));
    files.create(launch_locked);
} else {
    if (engines.all().length < 2) {
        // 防止锁残留
        events.on("exit", () => files.remove(launch_locked));
    } else {
        console.info('若无法启动，可删除tmp目录下的下面文件')
        console.error('launch_main_locked')
        //确保只运行一个程序
        exit();
    }
}

try {
    config = require("./config.js");
} catch (e) {
    config = {};
}

//快速模式. 该模式下会启用控件缓存
if (config && config.fast模式)
    auto.setMode("fast");

date = nowDate();

const github = "https://github.com/wengzhenquan/autojs6";
const github_download_url = "https://raw.githubusercontent.com/wengzhenquan/autojs6/refs/heads/main/"

const autoJS6_update = "https://api.github.com/repos/SuperMonster003/AutoJs6/releases/latest";

var update_script = "【小社脚本】一键更新程序.js";
var serverVersion = null;
var localVersion = null;
var run = null;
var mainFile = null;

const xmPckageName = "com.xiaomi.vipaccount"; // 社区APP包名
const wchatpn = "com.tencent.mm"; //微信包名，用来校验小程序是否打开
const xmVersionName = getAppVersionName(xmPckageName);
const wchatVersionName = getAppVersionName(wchatpn);
//社区APP最低支持跳转入口的版本
const xmAtLeastVersionName = "5.3.2";

const serviceId_file = "./tmp/service_id.txt";
var serviceId = "org.autojs.autojs6/org.autojs.autojs.core.accessibility.AccessibilityServiceUsher";

// 设备信息
const dwidth = device.width;
const dheight = device.height;
// 获取设备制造商
const manufacturer = android.os.Build.MANUFACTURER;
// 获取设备品牌
const brand = device.brand;

//var jsversion = (engines.myEngine().getSource().getName()
//   .match(/\d[\s\S]*/) || [""])[0];

// 状态栏高度
const statusBarHeight = ui.statusBarHeight;

// 导航栏高度
const navBarHeight = getNavigationBarHeight();

// 底部可用最低位置(就是导航栏上方，(隐藏)手势提示线位置，或者虚拟按键上方）
const navBarY = dheight - navBarHeight;

// 判断当前是否为全面屏手势模式
const gestureMode = isGestureMode();

// 代理存储桶
const sto_gh_proxys = storages.create('gh_proxys');
// 代理来源
const proxySources = [
    "https://api.akams.cn/github",
    "https://git.mxg.pub/api/github/list"
];

// 测试地址
const testUrls = [
    //访问、下载文件地址
    "https://raw.githubusercontent.com/wengzhenquan/autojs6/refs/heads/main/version",
    // GitHub api 查询地址
    "https://api.github.com/repos/wengzhenquan/autojs6/contents/version?ref=main"
];


// 截图验证码最高y
global.picY = null;

// 签到未完成标志
global.unfinished_mark = 0;
// 退出按钮
var window = null;
// 允许更新
var ableUpdate = 1;
// 异常中断
var abnormalInterrupt = 1;

// 允许息屏信号
var ableScreenOff = 0;
// 程序最大运行时间，超过该时间会强制停止(ms)。  3分钟
var maxRuntime = (config && config.运行超时时间 || 3) * 60 * 1000;

//设置参考坐标，不能动，开发环境标准比例。
setScaleBaseX(1080);
setScaleBaseY(2400);


//打开悬浮窗控制台
console.reset();
//consoleShow();
consoleShow();

runtime.gc;
java.lang.System.gc();
wait(() => false, 500);

console.warn("—----->--- Start ---<-----—");
log(("AutoJS6 版本：").padStart(20) + autojs.versionName)
log(("微信 Ver：") + String(wchatVersionName).padStart(20))
log(("小米社区 Ver：") + String(xmVersionName).padStart(14))
log(("Android 版本：").padStart(0) + device.release +
    ("（sdk：").padStart(0) + device.sdkInt + "）")
log("制造商：" + manufacturer + "，品牌：" + brand);
log("产品：" + device.product + "，型号：" + device.model);
log(`设备分辨率：${dwidth}x${dheight}`);
log(`导航模式：${gestureMode ? "全面手势" : "虚拟按键"}（H：${navBarY}`);
log("运存：" + formatFileSize(device.getTotalMem()) + "（可用：" + formatFileSize(device.getAvailMem()) + "）");
checkMem();
printJVMMemory();
//date = nowDate();
log(`现在是：${date}`);
console.error(`启动延迟：${getDurTime(date)}`);
console.error('QQ群：197511003');



events.on("exit", function() {

    console.setTouchable(true);
    device.cancelKeepingAwake();
    if (window) window.close();
    floaty.closeAll();
    try {
        runtime.gc;
        java.lang.System.gc();
        if (config && !config.fast模式)
            auto.clearCache();
    } catch (e) {}

    if (abnormalInterrupt && config && config.通知提醒)
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("发生未知错误，脚本异常中断\n详细问题，请查看日志"));

    consoleMax();
    threads.shutDownAll();
    console.info('q群反馈：197511003');

    // verbose(nowDate());
});



//------------ 前置任务 ----------//

if (!config || !config.更新代理池)
    storages.remove("gh_proxys")

//AutoJS6版本检查
checkAutoJS6();

// 维护期禁止更新
maintain();


// 启动悬浮窗关闭按钮
if (config && config.左下角停止按钮)
    threads.start(() => stopButton());


// 程序运行监控
startTimeoutMonitor();


wait(() => false, 3000);

// 检查运存
function checkMem() {
    const g1 = Math.pow(1024, 3); //1G

    if (device.getAvailMem() < g1) {
        console.error('可用运存低！');
    }
}

//AutoJS6版本检查
function checkAutoJS6() {
    // 额外兼容6.5.0
    let v650 = autojs.version.isEqual('6.5.0');
    // 最低支持6.6.2
    let vAtLest = autojs.version.isAtLeast('6.6.2');
    if (!(v650 || vAtLest)) {
        console.error('不支持的AutoJS6版本');
        console.error('请升级AutoJS6');
        abnormalInterrupt = 0;
        wait(() => false, 2000);
        exit();
        wait(() => false, 2000);
    }
}



// 维护期禁止更新
function maintain() {
    let hours = new Date().getHours();
    if (hours < 2 || hours >= 21) {
        console.error('维护时间：21点~凌晨2点');
        if (config && config.维护期间禁止检查更新 === 1) {
            console.error('停止更新！');
            ableUpdate = 0;
        }
        if (config && config.维护期间禁止检查更新 === 2) {
            abnormalInterrupt = 0;
            console.error('禁止运行！');
            wait(() => false, 2000);
            exit();
            wait(() => false, 2000);
        }
    }
}

// JVM内存信息
function getMemoryInfo() {
    let runtime = java.lang.Runtime.getRuntime();
    let maxMemory = runtime.maxMemory(); // 最大内存
    let totalMemory = runtime.totalMemory(); //总内存
    let freeMemory = runtime.freeMemory(); // 空闲内存
    let usedMemory = totalMemory - freeMemory; //已使用

    return {
        maxMemory: maxMemory,
        totalMemory: totalMemory,
        freeMemory: freeMemory,
        usedMemory: usedMemory,
        maxMemoryMB: (maxMemory / (1024 * 1024)).toFixed(0),
        totalMemoryMB: (totalMemory / (1024 * 1024)).toFixed(2),
        freeMemoryMB: (freeMemory / (1024 * 1024)).toFixed(2),
        usedMemoryMB: ((usedMemory) / (1024 * 1024)).toFixed(2),
        usagePercentage: ((usedMemory / maxMemory) * 100).toFixed(2)
    };
}

// 打印jvm内存信息
function printJVMMemory() {
    let info = getMemoryInfo();
    console.error("JVM：" +
        info.usedMemoryMB + "/" +
        info.maxMemoryMB +
        " MB (" + info.usagePercentage + "%)");
}

/**
 * 启动脚本总运行时间监控
 * @param {number} maxRuntimeMs - 最大允许运行时间 (毫秒)
 */
function startTimeoutMonitor() {
    threads.start(() => {
        setInterval(function() {
            device.wakeUpIfNeeded();
            //  device.wakeUp();

            const startTime = new Date(date.replace(/-/g, '/')).getTime();
            let currentTime = new Date().getTime();

            if (currentTime - startTime < (13 * 1000)) {
                // 悬浮窗配置纠正
                if (console.isShowing()) {
                    consoleShow();
                }
                // 停止按钮位置纠正
                if (window)
                    window.setPosition(dwidth * 0.1, dheight * 0.75);

            }

            // 停止脚本
            if (currentTime - startTime > (maxRuntime - 10 * 1000)) {
                ableScreenOff = 1;
                abnormalInterrupt = 0;
                console.error('配置：运行超时时间：' + config.运行超时时间 + ' 分钟')
                console.error(`脚本运行 ${(maxRuntime)/60/1000} 分钟，强制退出`);
                console.error('可能是兼容性问题，或布局分析问题，导致页面卡住');
                console.error('如果刚刚升级过操作系统，或升级过AutoJS6，请重启一次无障碍服务');
                console.error('若启动延迟过长，可增加运行超时时间！')
                console.error('请截图保存最后卡住的页面，反馈问题。')
                if (config && config.通知提醒)
                    notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("发生未知错误，脚本强制停止\n详细问题，请查看日志"));
                exit();
            }

            // 尝试刷新
            //tryRefresh();
        }, 5 * 1000); // 每 5 秒检查一次
    });
}



// 小米社区空白维护
function blankMaintain() {
    if (config && config.空白页检查) {
        threads.start(() => {
            let n = 20;
            let xmpl = 0;
            while (packageName(xmPckageName).exists() &&
                xmpl < 6 && n--) {
                //wait(() => false, 200);
                xmpl = packageName(xmPckageName).find(1000).length;
                if (xmpl < 6) sleep(300);
            }

            if (packageName(xmPckageName).exists() &&
                xmpl > 0 && xmpl < 6) {
                console.error("小米社区APP打开了空白页!")
                console.error("可能社区在维护！")
                console.error("请稍后再试")
                console.error("——————")
                console.error("若是误报，可以从配置关闭[空白页检查]")
                abnormalInterrupt = 0;
                wait(() => false, 2000);
                exit();
                wait(() => false, 2000);

            }
        });
    }
}



// 尝试刷新
function tryRefresh() {
    let n = 3;
    while (n-- && (content('刷新').exists() ||
            content('重新加载').exists() ||
            content('refresh').exists())) {
        console.warn('页面未成功加载')
        console.warn('第 ' + (3 - n) + ' 次尝试刷新...')
        content('刷新').exists() && ableClick('刷新');
        content('重新加载').exists() && ableClick('重新加载');
        content('refresh').exists() && ableClick('refresh');
        // clickCenter('刷新');
        // clickCenter('重新加载');
        // clickCenter('refresh');
        wait(() => false, 500);
    }

    if (content('刷新').exists() ||
        content('重新加载').exists() ||
        content('refresh').exists()) {
        console.error('页面加载失败！');
        console.error('小米社区APP异常！')
        console.error('或许可以考虑尝试更换社区APP版本！');
        abnormalInterrupt = 0;
        wait(() => false, 2000);
        exit();
        wait(() => false, 2000);

    }
}


//------------ 屏幕高度 ----------//

// 获取导航栏高度（虚拟按键/手势条高度）
function getNavigationBarHeight() {

    try {
        // 方法一：通过UI获取
        //      准确获取导航栏高度，如果是全面手势模式，并隐藏手势条，能获取到0

        // 获取屏幕总高度
        let screenHeight = device.height;

        // 获取应用可用高度（不包括系统UI）
        var windowManager = context.getSystemService(context.WINDOW_SERVICE);
        var display = windowManager.getDefaultDisplay();
        var usableSize = new android.graphics.Point();
        display.getSize(usableSize);
        var usableHeight = usableSize.y;

        // 获取状态栏高度
        let statusBarHeight = ui.statusBarHeight


        // 计算底部系统UI高度
        // 底部系统UI高度 = 屏幕总高度 - 应用可用高度 - 状态栏高度
        var bottomUIHeight = screenHeight - usableHeight - statusBarHeight;

        // 确保高度不为负数
        if (bottomUIHeight < 0) {
            bottomUIHeight = 0;
        }

        // 打印结果
        // log("底部系统UI高度: " + bottomUIHeight + "px");

        return bottomUIHeight;
    } catch (e) {
        try {
            // 方法二：通过id获取
            //        即便隐藏手势条，依旧能获取手势条高度

            var resources = context.getResources();

            // 按优先级尝试传统导航栏ID
            var idsToTry = [
                "navigation_bar_height",
                "navigation_bar_frame_height",
                "navigation_bar_height_landscape",
                "config_navBarInteractionFrame"
            ];

            for (let i = 0; i < idsToTry.length; i++) {
                let id = idsToTry[i];
                let resourceId = resources.getIdentifier(id, "dimen", "android");
                if (resourceId <= 0 && id === "config_navBarInteractionFrame") {
                    resourceId = resources.getIdentifier(id, "config", "android");
                }

                if (resourceId > 0) {
                    let height = resources.getDimensionPixelSize(resourceId);
                    if (height > 0) {
                        //  log("使用 " + id + " 作为导航栏高度: " + height + "px");
                        return height;
                    }
                }
            }
        } catch (e) {}
    }

    return 0;
}


// 判断当前是否为全面屏手势模式
function isGestureMode() {
    //  let navBarHeight = getNavigationBarHeight();
    // 将高度转换为dp
    const navBarHeightDp = navBarHeight * 160 / device.density;
    // 手势模式下导航栏高度通常小于36
    return navBarHeightDp < 35;
}

// 使用示例
// let navBarY = getWindowHeight();
// let mode = isGestureMode() ? "全面屏手势" : "虚拟按键";

// console.log("屏幕高度: " + dheight + "px");
// console.log("状态栏高度: " + statusBarHeight + "px");
// console.log("导航栏高度: " + getNavigationBarHeight() + "px");
// console.log("底部可用高度: " + navBarY + "px");
// console.log("当前模式: " + mode);



//------------ 左下角“停止脚本”按钮 ----------//
//悬浮窗停止按钮
function stopButton() {
    window = floaty.window(
        <frame>
            <button
            id="action"
            text="停止脚本"
            w="100"
            h="50"
            bg="#80333333"
            textColor="#ffff00"
            textSize="20sp"
            textStyle="bold"
            />
        </frame>
    );
    window.setPosition(dwidth * 0.1, dheight * 0.75);

    //悬浮窗被关闭时停止脚本
    // window.exitOnClose();
    //  window.action.click(() => window.close());
    let n = 0;
    window.action.click(() => {
        abnormalInterrupt = 0;
        // 关闭悬浮窗控制台
        consoleExitOnClose();

        console.error("动作：点击[停止脚本]");
        exit();
        engines.stopAll();
        n++;
        window.action.setText("关不掉！x" + n);

    });

    //setInterval(() => {}, 1000);
}



//------------ 悬浮窗控制台区域 ----------//
//打开悬浮窗控制台
function consoleShow() {
    threads.start(() => {
        if (!config || config && config.悬浮窗控制台) {
            //悬浮窗控制台配置
            // console.reset();
            console.build({
                size: [0.96, 0.3],
                position: [0.02, 0.02],
                title: '会装逼的控制台',
                titleTextSize: 18,
                titleTextColor: 'green',
                titleIconsTint: 'yellow',
                //  titleBackgroundAlpha: 0.8,
                titleBackgroundColor: 'dark-blue',
                contentTextSize: 15,
                //  contentBackgroundAlpha: 0.7,
                contentBackgroundColor: colors.BLACK,
                touchable: true,
                exitOnClose: false,
            });

            if (config && !config.未完成任务不关闭悬浮窗控制台) {
                consoleExitOnClose();
            }
            console.setContentTextColor({
                verbose: 'white',
                log: 'green',
                info: 'yellow',
                warn: 'cyan',
                error: 'magenta'
            });


            if (config && config.悬浮窗控制台_标题 && config.悬浮窗控制台_标题.length > 0) {
                console.setTitle(config.悬浮窗控制台_标题);
            }

            if (config && config.悬浮窗控制台_透明度) {
                console.setTitleBackgroundAlpha(config.悬浮窗控制台_透明度);
                console.setContentBackgroundAlpha(config.悬浮窗控制台_透明度 * 0.9);
            }


            if (config && config.悬浮窗控制台_字体大小) {
                console.setContentTextSize(config.悬浮窗控制台_字体大小);
                console.setTitleTextSize(config.悬浮窗控制台_字体大小 + 3);
            }

            console3();

            if (!console.isShowing()) {
                console.show();
                return;
            }



            console.setTouchable(false);
        }
    });
}


//悬浮窗控制台变成30%
function console3() {
    console.setPosition(0.02, 0.02);
    let h = (config && config.悬浮窗控制台_运行高度) || 0.3;
    console.setSize(0.96, h);
}



//悬浮窗控制台变成18%
function consoleMin() {
    console.setPosition(0.02, 0);
    wait(() => false, 300);
    let h = 0.18;

    // 自动适配
    if (config &&
        !config.悬浮窗控制台_签到高度 &&
        !config.悬浮窗控制台_签到时最小化 &&
        global.picY) {

        const STATUS_BAR_HEIGHT = statusBarHeight;
        const BORDER_OFFSET = dpToPx2(12);
        let y = 0;
        try {
            y = console.getPosition().y;
        } catch (e) {}

        // h = a - STATUS_BAR_HEIGHT - y + BORDER_OFFSET;
        // 计算得到的h是像素单位，不是百分比
        // 535 // 0.222
        h = (global.picY - cY(30)) - STATUS_BAR_HEIGHT - y + BORDER_OFFSET;

    }

    if (config && config.悬浮窗控制台_签到高度)
        h = config.悬浮窗控制台_签到高度;

    // 转化百分百
    if (h > 1) h = h / dheight;


    if (Math.abs(console.getSize().height / dheight - h) > 0.01) {
        log('调整控制台高度……')
    }

    // 阈值限制，防出错
    if (h > 0.3) {
        h = 0.18;
        console.error('控制台高度超出阈值0.3，调整失败')
    }

    log('控制台高度：' + h.toFixed(2));

    console.setSize(0.96, h);

    // 像素转换
    function dpToPx2(dp) {
        // 获取设备屏幕密度（dpi），AutoJS6中通过context获取
        let dpi = device.density ||
            context.getResources()
            .getDisplayMetrics()
            .densityDpi;
        // 标准密度为160dpi，1dp = 1px，其他密度按比例计算
        return dp * (dpi / 160);
    }
}



//悬浮窗控制台高度变成80%
function consoleMax() {
    if (console.isShowing()) {
        console.setPosition(0.02, 0.02);
        //可触碰
        console.setTouchable(true);
        //透明度
        console.setTitleBackgroundAlpha(1);
        console.setContentBackgroundAlpha(1)

        console.setSize(0.96, 0.8);
    }
}



//悬浮窗控制台最小化
function consoleCollapse() {
    if (console.isShowing()) {
        console.collapse();
    }
}


//悬浮窗控制台从最小化恢复
function consoleExpand() {
    if (console.isShowing()) {
        console.expand();
    }
}


// 关闭悬浮窗控制台
function consoleExitOnClose() {
    if (config && typeof config.悬浮窗控制台_关闭延迟 !== 'undefined') {
        let times = config.悬浮窗控制台_关闭延迟 * 1000 || false;
        console.setExitOnClose(times);
    }

}

//------------ 工具函数 ----------//

// 去桌面
function toHome() {
    try {
        home();
    } catch (e) {}
}


//  连续点击
function whileClick(obj) {
    try {
        if (obj) {
            if (typeof obj === 'string' ||
                obj instanceof UiSelector ||
                obj instanceof UiObject) {
                while (click(obj));
            }
        }
    } catch (e) {}
}


// 点击中心坐标
function clickCenter(obj) {
    try {
        if (obj) {
            if (typeof obj === 'string') {
                obj = content(obj);
            }

            if (obj instanceof UiSelector) {
                obj = obj.findOne(2000);
            }

            if (obj && (obj instanceof UiObject)) {
                if (obj.show())
                    wait(() => false, 1000);
                let x = obj.bounds().centerX();
                let y = obj.bounds().centerY();
                //log(x,y)
                if (x > 0 && y > 0) {
                    let result = click(x, y);
                    wait(() => false, 300);

                    return result;
                }
            }
        }
    } catch (e) {}

    return false;
}


// 有效控件点击，若本控件无法点击，一路寻找到能点击的父控件
function ableClick(obj) {
    try {
        if (obj) {
            if (typeof obj === 'string') {
                obj = content(obj);
            }

            if (obj instanceof UiSelector) {
                obj = obj.findOne(2000);
            }

            if (obj && (obj instanceof UiObject)) {
                if (obj.show())
                    wait(() => false, 500);
                // click
                let result = obj.click();
                // 最多向上爬2层
                let n = 2;
                while (n-- && !result &&
                    obj.parent() &&
                    obj.parent().depth() > 0
                ) {

                    obj = obj.parent();
                    // 父控件click
                    result = obj.click();
                }
                wait(() => false, 300);

                return result;
            }
        }
    } catch (e) {}

    return false;
}


// 格式化后的实时时间
function nowDate() {
    return formatDate(new Date());
}


// 日期格式化
function formatDate(date) {
    // 获取年、月、日、时、分、秒
    let year = date.getFullYear();
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');
    let seconds = date.getSeconds().toString().padStart(2, '0');
    // 拼接格式化后的日期字符串
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}



// 返回时长间隔 01:23 （分：秒）
function getDurTime(startTimeStr) {
    // 将时间字符串转换为时间戳
    let startTime = new Date(startTimeStr.replace(/-/g, '/')).getTime();
    // 获取当前时间的时间戳
    let currentTime = new Date().getTime();
    // 计算时间差（单位：毫秒）
    let timeDiff = currentTime - startTime;
    let absTimeDiff = Math.abs(timeDiff);
    // 先将时间差转换为秒数
    let totalSeconds = Math.floor(absTimeDiff / 1000);
    // 计算分钟数
    let minutes = Math.floor(totalSeconds / 60);
    // 计算剩余的秒数
    let seconds = totalSeconds % 60;
    // 格式化输出
    return `${minutes}:${seconds < 10? '0' + seconds : seconds}`;
}



// 获取已安装应用版本名称
function getAppVersionName(packageName) {
    try {
        if (!app.isInstalled(packageName)) {
            return "[未安装]";
        }
        // 获取应用程序的包信息
        let packageInfo = context
            .getPackageManager()
            .getPackageInfo(packageName, 0);
        // 获取版本名称
        return packageInfo.versionName;
    } catch (e) {
        console.error("获取版本名称失败: " + e);
        return null;
    }
}


//对比版本大小，前面的大，返回1，相等0，后面大-1
function compareVersions(version1, version2) {
    let arr1 = version1.split('.').map(Number);
    let arr2 = version2.split('.').map(Number);
    let length = Math.max(arr1.length, arr2.length);
    for (let i = 0; i < length; i++) {
        let num1 = arr1[i] || 0;
        let num2 = arr2[i] || 0;
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }
    return 0;
}


//对比版本version1是否＞＝version2
function isAtLeast(version1, version2) {
    return (compareVersions(version1, version2) > -1);
}


// [0-n]，不重复随机排列，返回数组，包含n
function getRandomNumbers(n) {
    let numbers = Array.from({
        length: n + 1
    }, (_, i) => i);
    let result = [];
    while (numbers.length > 0) {
        let randomIndex = Math.floor(Math.random() * numbers.length);
        let randomNumber = numbers.splice(randomIndex, 1)[0];
        result.push(randomNumber);
    }
    return result;
}



// 文件大小添加单位
function formatFileSize(size) {
    if (size < 1024) {
        return size + 'B';
    }
    if (size < Math.pow(1024, 2)) {
        return (size / 1024).toFixed(2) + 'KB';
    }
    // 新增GB判断：大于等于1MB且小于1GB时，先转GB并保留1位小数
    if (size < Math.pow(1024, 3)) {
        return (size / Math.pow(1024, 2)).toFixed(2) + 'MB';
    }
    // 最后处理大于等于1GB的情况
    return (size / Math.pow(1024, 3)).toFixed(2) + 'G';
}




/**
 * 将毫秒转换为带单位的字符串（ms 或 s）
 * @param {number} milliseconds - 毫秒数
 * @returns {string} - 格式化后的时间字符串（如 "1.23 s"、"342 ms"）
 */
function toSeconds(milliseconds) {
    if (milliseconds >= 100) {
        // 转换为秒，保留两位小数
        let seconds = (milliseconds / 1000).toFixed(2);
        return `${seconds} s`;
    }
    // 直接返回毫秒
    return `${milliseconds} ms`;

}

// 获取一个跟数组相关的长度值。
// 按百分比获取，若值小于value则返回value，
//  但如果超出数组长度则返回数组长度
function getLun(arr, percent, value) {
    return Math.min(
        Math.max(Math.ceil(arr.length * percent),
            value),
        arr.length)
}




// 数组去重
function deduplicateInPlace(arr) {
    const set = new Set(arr);
    arr.length = 0; // 清空原数组
    // 方法1: 使用 Array.from 填充
    //Array.from(set).forEach(item => arr.push(item));
    // 方法2: 直接循环 Set（兼容性更好）
    set.forEach(item => arr.push(item));
}


/**
 * Fisher-Yates洗牌算法（原数组打乱，ES5兼容）
 * @param {Array} array 需要打乱的原数组（直接修改此数组）
 */
function shuffleArray(array) {

    deduplicateInPlace(array);

    var length = array.length;
    var temp, randomIndex;
    while (length) {
        randomIndex = Math.floor(Math.random() * length); // 生成[0, length-1]的随机索引
        length--;
        // 交换当前元素与随机位置元素
        temp = array[length];
        array[length] = array[randomIndex];
        array[randomIndex] = temp;
    }
}



/**
 * 处理函数：打乱数组1和数组2，并将数组2添加到数组1末尾
 * @param {Array} arr1 数组1（最终保存结果）
 * @param {Array} arr2 数组2（将被添加到数组1末尾）
 */
function processArrays(arr1, arr2) {
    // 原地删除 arr2 中与 arr1 重复的元素
    var set = new Set(arr1);
    for (let i = arr2.length - 1; i >= 0; i--) {
        if (set.has(arr2[i])) {
            arr2.splice(i, 1); // 直接修改原数组
        }
    }

    // 原地打乱数组1
    shuffleArray(arr1);
    // 原地打乱数组2
    shuffleArray(arr2);
    // 追加到数组1
    arr2.forEach(item => arr1.push(item));
}

// 分割打乱组合
function sliceShuffleArrays(arr, splitIndex) {
    if (splitIndex > arr.length) {
        splitIndex = arr.length * 0.5;
    }
    // 第一段：从开头到 splitIndex（不包含 splitIndex）
    let part1 = arr.slice(0, splitIndex);
    // log(part1)
    // 第二段：从 splitIndex 到数组末尾
    let part2 = arr.slice(splitIndex);

    processArrays(part1, part2);

    return part1;
}


// 点亮屏幕
function screenOn() {
    //屏幕点亮

    // device.wakeUpIfNeeded();
    // device.wakeUp();

    let m = 20;
    while (!device.isScreenOn() && m--) {
        // 设备激活
        device.wakeUpIfNeeded();
        device.wakeUp();
        wait(() => false, 500);
    }
    //亮屏
    device.keepScreenDim(maxRuntime);
    wait(() => false, 500);
}


// 无障碍锁屏
function autoLockScreen() {
    // 无障碍服务调用系统锁屏
    try {
        // 尝试标准方式（Android 8.0+）
        auto.service.performGlobalAction(
            android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_LOCK_SCREEN
        );
    } catch (e) {
        // 反射调用（兼容低版本）
        const ACTION_LOCK_SCREEN = 8; // GLOBAL_ACTION_LOCK_SCREEN 的常量值 = 8
        auto.service.performGlobalAction(ACTION_LOCK_SCREEN);
    }
}



/**
 * HTTP工具类
 * 提供HTTP请求和文件下载功能
 */
const HttpUtils = {
    /**
     * 执行HTTP请求（包含客户端创建逻辑）
     * @param {string} url - 请求URL
     * @param {object} [options] - 配置选项
     * @param {string} [options.method='GET'] - 请求方法 (GET/POST)
     * @param {object} [options.headers] - 请求头
     * @param {object} [options.body] - 请求体 (仅POST)
     * @param {number} [options.timeout=30] - 超时时间(秒)
     * @param {boolean} [options.ignoreSSL=false] - 是否忽略SSL验证
     * @returns {okhttp3.Response} HTTP响应对象
     */
    executeRequest: function(url, options = {}) {
        let {
            method = 'GET',
                headers = {},
                body = null,
                timeout = 30,
                ignoreSSL = false
        } = options;

        try {
            // 直接创建HTTP客户端（合并了createHttpClient的逻辑）
            let clientBuilder = new okhttp3.OkHttpClient.Builder()
                .connectTimeout(timeout, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(timeout, java.util.concurrent.TimeUnit.SECONDS);

            if (ignoreSSL) {
                let trustAllCerts = [
                    new javax.net.ssl.X509TrustManager({
                        checkClientTrusted: function(chain, authType) {},
                        checkServerTrusted: function(chain, authType) {},
                        getAcceptedIssuers: function() {
                            return [];
                        }
                    })
                ];

                let sslContext = javax.net.ssl.SSLContext.getInstance("SSL");
                sslContext.init(null, trustAllCerts, new java.security.SecureRandom());

                clientBuilder = clientBuilder
                    .sslSocketFactory(sslContext.getSocketFactory(), trustAllCerts[0])
                    .hostnameVerifier(new javax.net.ssl.HostnameVerifier({
                        verify: function(hostname, session) {
                            return true;
                        }
                    }));
            }

            let client = clientBuilder.build();

            // 构建请求
            let requestBuilder = new okhttp3.Request.Builder()
                .url(url)
                .headers(okhttp3.Headers.of(headers));

            // 添加请求体（仅POST）
            if (method.toUpperCase() === 'POST' && body) {
                let contentType = headers['Content-Type'] || 'application/json';
                let requestBody = okhttp3.RequestBody.create(
                    okhttp3.MediaType.parse(contentType),
                    JSON.stringify(body)
                );
                requestBuilder = requestBuilder.post(requestBody);
            }

            // 执行请求并返回响应
            return client.newCall(requestBuilder.build()).execute();

        } catch (e) {
            if (e.javaException instanceof java.net.SocketTimeoutException) {
                throw new Error("HTTP请求超时 (" + timeout + "秒)");
                return null; // 返回null表示超时

            } else throw new Error("HTTP请求失败: " + e.message);
        }
    },

    /**
     * 普通HTTP请求
     * @param {string} url - 请求URL
     * @param {object} [options] - 配置选项
     * @param {string} [options.method='GET'] - 请求方法 (GET/POST)
     * @param {object} [options.headers] - 请求头
     * @param {object} [options.body] - 请求体 (仅POST)
     * @param {number} [options.timeout=30] - 超时时间(秒)
     * @param {boolean} [options.ignoreSSL=false] - 是否忽略SSL验证
     * @returns {object} 响应对象
     */
    request: function(url, options = {}) {
        let startTime = new Date().getTime();
        try {
            // 使用统一的请求执行函数
            let response = this.executeRequest(url, options);

            let string = response.body().string();

            let jsons = null;
            try {
                jsons = JSON.parse(string)
            } catch (e) {}

            // 返回响应对象
            return {
                success: true,
                statusCode: response.code(),
                headers: response.headers().toMultimap(),
                body: string,
                json: jsons,
                timeTaken: (new Date().getTime() - startTime),
            };

        } catch (e) {
            throw new Error("HTTP请求失败: " + e.message);
        }
    },

    /**
     * 流式下载文件函数
     * @param {string} url - 下载链接
     * @param {string} savePath - 保存路径
     * @param {object} [options] - 配置选项
     * @param {number} [options.timeout=300] - 超时时间(秒)
     * @param {boolean} [options.ignoreSSL=false] - 是否忽略SSL验证
     * @param {boolean} [options.isTextFile=false] - 是否为文本文件
     * @param {function} [options.onProgress] - 进度回调函数
     * @returns {object} 下载结果对象
     */
    download: function(url, savePath, options = {}) {
        let {
            timeout = 300,
                ignoreSSL = false,
                isTextFile = false,
                onProgress = null
        } = options;

        let inputStream, outputStream;
        let downloaded = 0;
        let contentLength = -1;
        let startTime = new Date().getTime();

        let lastProgressTime = startTime; // 记录上次打印进度的时间
        let lastPercent = 0; // 记录上一次打印的进度
        let nextPrintPercent = 0; // 记录进度

        try {
            savePath = files.path(savePath);
            // 使用统一的请求执行
            let response = this.executeRequest(url, {
                method: 'GET',
                headers: {},
                timeout,
                ignoreSSL
            });

            if (!response.isSuccessful()) {
                throw new Error("HTTP错误: " + response.code());
            }

            let responseBody = response.body();
            if (responseBody === null) {
                throw new Error("响应体为空");
            }

            // 获取文件大小
            contentLength = responseBody.contentLength();
            let hasContentLength = contentLength > 0;

            // 创建输出流
            files.createWithDirs(savePath);

            outputStream = new java.io.FileOutputStream(savePath);
            inputStream = responseBody.byteStream();
            let buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
            let bytesRead;

            console.log("开始下载...");

            // 使用字符流处理文本文件
            if (isTextFile) {
                let reader = new java.io.InputStreamReader(
                    responseBody.byteStream(),
                    "UTF-8"
                );

                let writer = new java.io.OutputStreamWriter(
                    outputStream,
                    "UTF-8"
                );

                let charBuffer = util.java.array('char', 8192);
                let charsRead = bytesRead;

                while ((charsRead = reader.read(charBuffer)) !== -1) {
                    writer.write(charBuffer, 0, charsRead);
                    downloaded += charsRead;
                }

                writer.close();
                reader.close();
            } else {
                // 二进制文件处理
                while ((bytesRead = inputStream.read(buffer)) !== -1) {
                    let currentTime = new Date().getTime();
                    if (currentTime - startTime > timeout * 1000) {
                        throw new Error("下载超时 (" + timeout + "秒)");
                    }

                    outputStream.write(buffer, 0, bytesRead);
                    downloaded += bytesRead;

                    if (onProgress && typeof onProgress === 'function' &&
                        hasContentLength) {
                        let percent = Math.floor((downloaded / contentLength) * 100);
                        if (percent === 0 || percent === 100) continue;

                        if (currentTime - lastProgressTime >= 2000) {

                            if (percent >= nextPrintPercent ||
                                currentTime - lastProgressTime >= 7000) {

                                let progressBar = this.generateProgressBar(percent);
                                onProgress({
                                    downloaded: downloaded,
                                    total: contentLength,
                                    percent: percent,
                                    progressBar: progressBar
                                });

                                lastProgressTime = currentTime;
                                let p = 2 * percent - lastPercent;
                                nextPrintPercent = p < 10 ? 10 : p;
                                lastPercent = percent;
                            }
                        }
                    }
                }

            }

            // 确保100%被调用
            if (onProgress && typeof onProgress === 'function') {
                let progressBar = this.generateProgressBar(100);
                onProgress({
                    downloaded: contentLength,
                    total: contentLength,
                    percent: 100,
                    progressBar: progressBar
                });
            }

            outputStream.close();
            inputStream.close();

            // 获取实际文件大小
            let fileSize = new java.io.File(savePath).length();

            return {
                success: true,
                statusCode: response.code(),
                fileSize: fileSize,
                filePath: savePath,
                timeTaken: (new Date().getTime() - startTime),
                isTextFile: isTextFile
            };

        } catch (e) {
            if (files.exists(savePath)) files.remove(savePath);
            throw e;
        } finally {
            try {
                if (inputStream) inputStream.close();
            } catch (e) {}
            try {
                if (outputStream) outputStream.close();
            } catch (e) {}
        }
    },

    /**
     * 生成Linux控制台风格进度条
     * @param {number} percent - 完成百分比
     * @returns {string} 进度条字符串
     */
    generateProgressBar: function(percent) {
        let barLength = 20;
        let completed = Math.floor(percent / (100 / barLength));
        let remaining = barLength - completed;

        let bar = "[";
        if (completed > 0) {
            bar += "=".repeat(completed - 1);
            bar += ">";
        } else {
            bar += ">";
        }
        bar += "..".repeat(remaining);
        bar += "]";

        return bar;
    }

};




//  ----------- 系统修改 ---------------------//
function systemSetting() {
    log("-----→");
    if (config && config.音量键停止) {
        console.error("提示：[音量+/-]键可停止脚本");
        //音量键，停止脚本
        events.setKeyInterceptionEnabled("volume_up", true);
        events.setKeyInterceptionEnabled("volume_down", true);
        events.observeKey();
        events.onKeyDown("volume_up", () => {
            console.error("[音量+]停止脚本！！！");
            abnormalInterrupt = 0;
            // 关闭悬浮窗控制台
            consoleExitOnClose();
            exit();
            engines.stopAll();
        });
        events.onKeyDown("volume_down", () => {
            console.error("[音量-]停止脚本！！！");
            abnormalInterrupt = 0;
            // 关闭悬浮窗控制台
            consoleExitOnClose();
            exit();
            engines.stopAll();
        });
    }

    // 媒体声音
    const musicVolume = device.getMusicVolume();
    // 通知声音
    const nVolume = device.getNotificationVolume();
    if (config && config.静音级别) {
        //关掉媒体声音
        if (config.静音级别 === 1) {
            device.setMusicVolume(0);
            console.error("提示：已媒体静音！");
        }
        // 关掉通知声音
        if (config.静音级别 === 2) {
            device.setNotificationVolume(0);
            console.error("提示：已通知静音！");
        }
    }

    // 返回当前亮度模式, 0为手动亮度, 1为自动亮度.
    const brightMode = device.getBrightnessMode();
    // 返回当前的(手动)亮度. 范围为0~255.
    const bright = device.getBrightness();
    if (config && config.运行亮度) {
        device.setBrightnessMode(0);
        device.setBrightness(130 * config.运行亮度);
        console.error("提示：已修改亮度为：" + config.运行亮度 * 100 + "%");
    }

    events.on("exit", function() {
        if (config && config.运行亮度) {
            device.setBrightness(bright);
            device.setBrightnessMode(brightMode);
        }
        if (config && config.静音级别) {
            if (config.静音级别 === 1)
                device.setMusicVolume(musicVolume);
            if (config.静音级别 === 2)
                device.setNotificationVolume(nVolume);
        }
        if (config && config.结束震动) {
            device.vibrate(config.结束震动);
            wait(() => false, config.结束震动 * 2);
        }

        if (config && config.结束息屏) {
            if (config.强制无条件息屏 || ableScreenOff) {
                let hours = new Date().getHours();
                let dayu = (config && config.息屏时间范围_大于等于) || 0;
                let xiaoyu = (config && config.息屏时间范围_小于等于) || 8;

                if ((hours >= dayu && hours <= xiaoyu) ||
                    (xiaoyu < dayu && (hours >= dayu || hours <= xiaoyu))) {
                    let delay = config.息屏延迟;
                    console.error(delay + '秒后息屏！');
                    let m = delay;
                    while (m--) {
                        console.error(m);
                        wait(() => false, 1000);
                    }
                    // 无障碍服务调用系统锁屏
                    // 锁屏
                    autoLockScreen();
                }
            }
        }

    });
    //wait(() => false, 2000);
}



// -----------程序完整性检查---------------------//
// 加载本地version文件
function loadLocalVersion() {
    localVersion = JSON.parse(files.read("./version"));
    mainFile = localVersion.main;
    update_script = localVersion.updateScript;
    if (files.exists("./" + localVersion.run)) {
        run = require("./" + localVersion.run);
    }
}



function init() {
    console.info(">>>>→脚本完整性校验←<<<<")
    if (!files.exists("./version")) {
        console.error("缺失[version]文件");
        console.error("启动更新程序下载文件");
        updateScript();
        return;
    }
    //加载本地版本文件
    loadLocalVersion();
    console.info("当前脚本版本：" + localVersion.version);

    if (!files.exists("./" + localVersion.run)) {
        console.error("缺失[Run]文件");
        console.error("启动更新程序下载文件");
        updateScript();
        return;
    }
    // 加载run函数
    console.info('加载run版本：' + localVersion.run.match(/【小社脚本】(.+)\.js/)[1]);
    run = require("./" + localVersion.run);

    if (!files.exists("./config.js")) {
        console.error("缺失[config.js]文件");
        console.error("启动更新程序下载文件");
        updateScript();
        return;
    }

    if (!files.exists("./" + localVersion.updateScript)) {
        console.error("缺失[" + localVersion.updateScript + "]文件");
        console.error("启动更新程序下载文件");
        updateScript();
        return;
    }

    let fileList = localVersion.updateFile;

    if (!fileList || fileList.length < 1) {
        console.error("version文件里没有文件清单");
        console.error("无需校验");
    }
    //缺失文件列表
    let missingFiles = [];
    for (var key in fileList) {
        if (!files.exists("./" + key)) {
            missingFiles.push(key);
        }
    }
    let error = false;
    if (missingFiles.length > 0) {
        log("----------------------------");
        log("文件缺失列表：")
        missingFiles.forEach((file) => {
            //根据配置不检查YOLO
            if (file.toLowerCase().includes('yolo')) {
                if (config.本地YOLO识图)
                    error = true;
                else return;
            }

            console.error(file);
        });
        console.info("执行一键更新程序，会自动下载缺失文件");
        log("----------------------------");
    }

    let apks = localVersion.apk;
    if (apks) {
        for (var key in apks) {
            let value = apks[key];
            let name = app.isInstalled(value);
            if (!name) {
                //根据配置不检查YOLO
                if (key.toLowerCase().includes('yolo')) {
                    if (config.本地YOLO识图)
                        error = true;
                    else return;
                }
                console.error(key + " 未安装");
                console.info("若找不到文件，请下滑刷新文件列表");
            }
        }
    }

    if (error) {
        if (config && config.通知提醒)
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("有错误！\n详情查看日志"));

        abnormalInterrupt = 0;
        wait(() => false, 2000);
        exit();
        wait(() => false, 2000);

    }
    log("✅ 脚本完整性检查结束");

    // 检查config.js配置文件
    checkConfig();
}



// 检查config.js配置文件
// 目前只检查小于1000的字符串数字
function checkConfig() {
    console.info("---→>→config.js检查←<←---")
    // 1. 检查有问题的字段并存入数组
    let problemFields = [];
    for (let key in config) {
        let value = config[key];
        if (typeof value === 'string' &&
            value.length < 4 && !isNaN(value)) {
            let numValue = parseFloat(value);
            let strNum = String(numValue);
            if (numValue < 1000 && strNum.length === value.length) {
                problemFields.push(key);
            }
        }
    }

    if (problemFields.length < 1) {
        console.log("✅ 配置文件格式正确");
        return;
    }

    let content = files.read("./config.js", "utf-8");
    let lines = content.split('\n');

    // 2. 创建问题详情对象数组
    let problemDetails = [];
    problemFields.forEach(field => {
        //let found = false;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(field + ':')) {
                problemDetails.push({
                    line: i + 1, // 行号从1开始
                    field: field,
                    value: config[field],
                    content: lines[i].trim()
                });
                //found = true;
                break;
            }
        }
    });

    // 3. 打印检查结果
    if (problemDetails.length > 0) {
        console.error("⚠️ 发现需要修正的属性：");
        problemDetails.forEach(detail => {
            console.warn("┌ 行号: " + detail.line);
            console.warn("├ 字段: " + detail.field);
            console.warn("├ 当前值: \"" + detail.value + "\" (应为数值类型)");
            console.error(" ├ 正确值: " + detail.value + " (没有引号)");
            console.warn("└ 行内容: " + detail.content);
            console.info("────");
        });
        console.error("💡 请将上述属性的值改为数值类型");

        if (config && config.通知提醒)
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("config.js配置文件错误\n详情查看日志"));

        abnormalInterrupt = 0;
        wait(() => false, 2000);
        exit();
        wait(() => false, 2000);

    }
}



// -------- 脚本更新  --------//

//加速代理
var proxys = [

    "https://ghproxy.sakuramoe.dev/", // 请求时间：0.44s
    "https://www.5555.cab/", // 请求时间：0.49s
    "https://github.xxlab.tech/", // 请求时间：0.50s
    "https://gh.halonice.com/", // 请求时间：0.53s
    "http://gh.927223.xyz/", // 请求时间：0.64s
    "https://github.chenc.dev/", // 请求时间：0.98s
    "http://github-proxy.teach-english.tech/", // 请求时间：0.65s
    "https://github.cnxiaobai.com/", // 请求时间：0.79s


]



// 备用代理
var proxys2 = [
    "https://gh.padao.fun/", // 请求时间：0.79s
    "https://github.dpik.top/", // 请求时间：0.82s
    "https://git.zeas.cc/", // 请求时间：0.83s
    "https://ghfile.geekertao.top/", // 请求时间：0.84s
    "https://gh.39.al/", // 请求时间：0.84s
    "https://github.cn86.dev/", // 请求时间：1.88s
    "https://gh.llkk.cc/", // 请求时间：1.04s
    "https://30006000.xyz/", // 请求时间：0.89s
    "https://gh.bugdey.us.kg/", // 请求时间：0.89s
    "https://gh.catmak.name/", // 请求时间：1.04s
    "https://github-proxy.lixxing.top/", // 请求时间：1.8




    "https://gitproxy.click/", // 请求时间：0.94s
    "https://ghb.nilive.top/", // 请求时间：0.87s
    "https://gh.b52m.cn/", // 请求时间：1.07s
    "https://gh.monlor.com/", // 请求时间：1.13s
    "https://ghproxy.monkeyray.net/", // 请求时间：1.16s
    "https://gh.xxooo.cf/", // 请求时间：1.19s
    "https://gh.jdck.fun/", // 请求时间：1.48s
    "https://ghproxy.net/", // 请求时间：1.60s
    "https://gh.noki.icu/", // 请求时间：1.89s
    "https://git.yylx.win/", // 请求时间：1.95s
    "https://code-hub-hk.freexy.top/", // 请求时间：1.96s
    "https://gh-proxy.net/", // 请求时间：2.02s
    "https://gh.aaa.team/", // 请求时间：2.18s
    "https://gh-proxy.com/", // 请求时间：2.22s
    "https://hk.gh-proxy.com/",
    "https://cdn.gh-proxy.com/",
    "https://ghfast.top/", // 请求时间：2.71s



    "https://ghproxy.mf-dust.dpdns.org/", // 请求时间：2.14s
    "https://gitproxy.mrhjx.cn/", // 请求时间：0.89s
    "https://gh.chalin.tk/", // 请求时间：0.94s
    "https://github.crdz.eu.org/", // 请求时间：0.90s
    "https://ghproxy.cfd/", // 请求时间：0.33s
    "https://j.1win.ggff.net/", // 请求时间：0.94s
    "https://tvv.tw/", // 请求时间：0.95s
    "https://kenyu.ggff.net/", // 请求时间：0.95s
    "https://git.820828.xyz/", // 请求时间：0.95s
    "https://hub.ddayh.com/", // 请求时间：0.96s
    "https://github.kkproxy.dpdns.org/", // 请求时间：0.97s
    "https://gh.echofree.xyz/", // 请求时间：0.99s
    "https://git.951959483.xyz/", // 请求时间：0.99s
    "https://j.1lin.dpdns.org/", // 请求时间：1.00s
    "https://gh.dpik.top/", // 请求时间：1.02s
    "https://github.tbedu.top/", // 请求时间：1.03s
    "https://ghp.keleyaa.com/", // 请求时间：0.88s
    "https://ghf.无名氏.top/", // 请求时间：1.04s
    "https://ghproxy.imciel.com/", // 请求时间：1.04s
    "https://github.ednovas.xyz/", // 请求时间：1.04s
    "https://gh.nxnow.top/", // 请求时间：1.12s
    "https://cf.ghproxy.cc/", // 请求时间：1.53s
    "https://github.bullb.net/", // 请求时间：1.55s
    "https://git.669966.xyz/", // 请求时间：1.61s
    "https://g.blfrp.cn/", // 请求时间：1.80s
    "https://gh.xx9527.cn/", // 请求时间：1.83s
    "https://github.tianrld.top/", // 请求时间：1.84s
    "https://ghproxy.xzhouqd.com/", // 请求时间：1.87s
    "https://gh.nilive.top/", // 请求时间：1.92s
    "https://ghpxy.hwinzniej.top/", // 请求时间：2.00s
    "https://github.ruojian.space/", // 请求时间：2.01s
    "https://github.ihnic.com/", // 请求时间：2.01s
    "https://fastgit.cc/", // 请求时间：2.03s
    "https://github-proxy.memory-echoes.cn/", // 请求时间：2.05s
    "https://github.880824.xyz/", // 请求时间：2.06s
    "https://hub.gitmirror.com/", // 请求时间：2.10s
    "https://ghproxy.1888866.xyz/", // 请求时间：2.15s
    "https://ghproxy.mirror.skybyte.me/", // 请求时间：2.15s
    "https://proxy.atoposs.com/", // 请求时间：2.27s
    "https://ghproxy.cc/", // 请求时间：2.46s
    "https://github.788787.xyz/", // 请求时间：2.61s
    "https://gh.shiina-rimo.cafe/", // 请求时间：2.79s
    "https://gh.wsmdn.dpdns.org/", // 请求时间：2.82s
    "https://github.lsdfxdk.nyc.mn/", // 请求时间：2.82s
    "https://github.1ms.xx.kg/", // 请求时间：2.83s
    "https://ghm.078465.xyz/", // 请求时间：3.10s
    "https://ghproxy.cxkpro.top/", // 请求时间：3.19s
    "https://github.geekery.cn/", // 请求时间：3.26s
    "https://jiashu.1win.eu.org/", // 请求时间：3.29s
    "https://github.zzrbk.xyz/", // 请求时间：3.29s
    "https://ggg.clwap.dpdns.org/", // 请求时间：3.52s
    "https://gitproxy.127731.xyz/", // 请求时间：3.63s
    "https://gh.198962.xyz/", // 请求时间：3.77s
    "https://github.mlmle.cn/", // 请求时间：3.78s
    "https://proxy.baguoyuyan.com/", // 请求时间：3.89s
    "https://gitproxy.197545.xyz/", // 请求时间：3.93s
    "https://github.boringhex.top/", // 请求时间：4.21s
    "https://gh.996986.xyz/", // 请求时间：4.53s
    "https://github.oterea.top/", // 请求时间：4.95s
    "https://gh.jasonzeng.dev/", // 请求时间：5.12s
    "https://gitproxy1.127731.xyz/", // 请求时间：5.64s
    "https://getgit.love8yun.eu.org/", // 请求时间：5.71s
    "https://github.zjzzy.cloudns.org/", // 请求时间：5.79s
    "https://gp.871201.xyz/", // 请求时间：7.01s
    "https://gp.zkitefly.eu.org/", // 请求时间：7.88s
    "https://ghproxy.cn/", // 请求时间：8.00s

]

const proxys_use = 0.2; // 使用代理的数量
var proxy_index = 0;
// 打乱并整合两个数组
processArrays(proxys, proxys2);

var api_proxys = [

    "https://github.dpik.top/",
    "https://gh.dpik.top/",
    "https://gh.catmak.name/",
    "https://ghproxy.monkeyray.net/",
    "https://ghfile.geekertao.top/",
    "https://git.yylx.win/",
    "https://hub.mwm.moe/",
    "https://gh.bugdey.us.kg/",
    "https://tvv.tw/",
    "https://ghm.078465.xyz/",
    "http://gh.927223.xyz/",
    "https://github.cnxiaobai.com/", // 请求时间：0.73s
    "https://gh.qninq.cn/", // 请求时间：0.97s
    "https://gh.noki.icu/",
    "https://gh.llkk.cc/",
    "https://xiazai.de/",
    "https://99z.top/",
    "https://ghpxy.hwinzniej.top/",
    "https://github.cn86.dev/",
    "https://githubproxy.cc/",
    "https://gh-proxy.com/",
    "https://hk.gh-proxy.com/",
    "https://cdn.gh-proxy.com/",
    "https://gh.inkchills.cn/",
    "https://cdn.akaere.online/",




    "https://j.1win.ggff.net/",
    "https://j.n1win.dpdns.org/",
    "https://j.1lin.dpdns.org/",
    "https://jiashu.1win.eu.org/",
    "https://j.1win.ip-ddns.com/",
    "https://j.1win.ddns-ip.net/",


]


// 打乱数组
shuffleArray(api_proxys);

//--------------- 更新代理池 ---------

// 更新代理池
function updateProxys() {
    console.info(">>>>>→ 代理池详情 ←<<<<<")

    log("--→内置代理池数量：")

    log("proxys：" + proxys.length)
    log("api_proxys：" + api_proxys.length)

    var gh_p = sto_gh_proxys.get("gh_p");
    var gh_api_p = sto_gh_proxys.get("gh_api_p");

    if (config && config.更新代理池) {
        if (config.更新代理池 > 1 || !gh_p || !gh_api_p ||
            gh_p.length < 20 || gh_api_p < 5) {
            console.info("---→>→ 更新代理池 ←<←---")

            // 存在正在更新的程序，放弃更新
            if (sto_gh_proxys.get("update")) {
                console.error("已经存在正在执行的更新");
                console.error("跳过本次更新");
                return;
            }
            try {
                sto_gh_proxys.put("update", true);
                // 1. 获取代理列表
                var proxyData = fetchProxyList();
                if (!proxyData || proxyData.length < 1) {
                    console.error("代理获取失败！");
                    console.error("将使用内置代理！");
                    return;
                }
                console.info("---->→ 测试代理：")

                // 2. 测试代理（使用多线程加速测试）
                log("开始测试代理有效性……");
                let results = testProxies(proxyData, testUrls);
                log("测试完成！");
                // 存储代理
                gh_p = results[0].map(item => item.url);
                gh_api_p = results[1].map(item => item.url);

                sto_gh_proxys.put("gh_p", gh_p)
                sto_gh_proxys.put("gh_api_p", gh_api_p)

                log("✅ 代理池更新成功");
            } catch (e) {} finally {
                sto_gh_proxys.put("update", false);
            }
        }

        if (gh_p && gh_p.length > 10) {
            proxys = sliceShuffleArrays(gh_p, 10);
        }

        if (gh_api_p && gh_api_p.length > 5) {
            api_proxys = sliceShuffleArrays(gh_api_p, 5);
        }

        console.info("--→新代理池数量：")
        log("proxys：" + proxys.length)
        log("api_proxys：" + api_proxys.length)
        return;

    }

    storages.remove("gh_proxys")

    // 获取代理列表函数（支持多源请求与去重）
    function fetchProxyList() {
        var allUrls = [];

        for (let i = 0; i < proxySources.length; i++) {
            let url = proxySources[i];
            try {
                console.warn("→" + (i + 1) + " 号代理源：");
                // log('url：' + url)
                let res = HttpUtils.request(url, {
                    method: "GET",
                    timeout: 10,
                    ignoreSSL: true
                });
                if (res.statusCode === 200) {
                    // log('请求成功！')
                    let json = res.json;
                    let proxyData = json.data || json;
                    if (Array.isArray(proxyData)) {
                        log('成功获取代理数量：' + proxyData.length)
                        proxyData.forEach(proxy => {
                            if (proxy.url) allUrls.push(proxy.url);
                        });

                    }
                }
            } catch (e) {
                console.error(`获取失败！`);
            }
        }

        // 使用Set去重 + Array.from转换
        var uniqueUrls = Array.from(new Set(allUrls));

        return uniqueUrls;
    }

    // 测试代理函数（多线程版）
    function testProxies(proxies, testUrls) {
        var results = [
            [],
            []
        ]; // 存储两个测试地址的结果

        // 创建线程锁
        var lock = threads.lock();

        // 创建线程池
        let threadsss = [];
        proxies.forEach(proxyUrl => {
            testUrls.forEach((testUrl, index) => {
                let thread = threads.start(() => {
                    //  proxyUrl = proxyUrl.endsWith("/") ? proxyUrl : proxyUrl + "/";
                    proxyUrl = proxyUrl.replace(/\/+$/, '') + '/';

                    let fullUrl = proxyUrl + testUrl;
                    let result = testSingleProxy(fullUrl);
                    if (result) {
                        // 使用锁保护结果数组
                        lock.lock();
                        try {
                            results[index].push({
                                url: proxyUrl,
                                time: result.time
                            });
                        } finally {
                            lock.unlock();
                        }
                    }
                });
                threadsss.push(thread);
            });
        });

        // 等待所有线程完成(每个线程最多等待5秒）
        threadsss.forEach(thread => {
            thread.join(5000);
            if (thread.isAlive()) {
                thread.interrupt();
            }
            // thread.interrupt();
        });

        // 按响应时间排序（升序）
        results[0].sort((a, b) => a.time - b.time);
        results[1].sort((a, b) => a.time - b.time);

        return results;
    }

    // 测试单个代理（保持不变）
    function testSingleProxy(url) {
        try {
            let start = new Date().getTime();
            let separator = url.includes('?') ? '&' : '?';
            let res = HttpUtils.request(url + separator + "t=" + start, {
                method: "GET",
                timeout: 5,
                ignoreSSL: true
            });

            if (res && res.statusCode === 200) {
                let success = false;
                let results = res.json;

                if (url.includes('api')) {
                    success = !!(results.size && results.size > 0);
                } else {
                    success = !!results.version;
                }

                if (success) {
                    return {
                        time: (new Date().getTime() - start) / 1000
                    };
                }
            }
        } catch (e) {
            // 请求失败
        }
        return null;
    }

}

// 同步代理池
function synProxys() {
    if (config && config.更新代理池) {
        sto_gh_proxys.put("gh_p", proxys)
        sto_gh_proxys.put("gh_api_p", api_proxys)
    }
}

// 检查脚本更新，version文件存在才检查更新。
function checkVersion() {
    console.info("---→>→脚本检查更新←<←---")

    let down_version = false;

    //远程version文件数据
    log("正在查询版本更新……")
    //  let lun = Math.ceil(proxys.length * proxys_use);
    let lun = getLun(proxys, proxys.length * proxys_use, 10);
    while (lun--) {
        let url = proxys[proxy_index] +
            github_download_url +
            'version' +
            '?t=' + new Date().getTime();

        let thread = threads.start(() => {
            try {
                let res = HttpUtils.request(url, {
                    method: "GET",
                    timeout: 5,
                    ignoreSSL: true
                });
                if (res && res.statusCode === 200) {
                    serverVersion = res.json;
                }
            } catch (e) {}

        });
        thread.join(5 * 1000);
        if (thread.isAlive()) {
            thread.interrupt();
        }

        if (serverVersion) {
            if (!files.exists("./version")) {
                down_version = true;
                //重新加载本地版本文件
                // loadLocalVersion();
                localVersion = {
                    version: "0.0.1",
                    updateFile: {}
                }
            }
            break;
        }
        // 删除代理
        proxys.splice(proxy_index, 1);
        // proxy_index--;

    }

    if (!serverVersion) {
        console.error("代理连接github失败")
        console.error("放弃更新！！！")
        console.error("可以手动执行更新程序尝试")
        return;
    }

    let hasNewVersion = compareVersions(serverVersion.version, localVersion.version) > 0;
    let updateList = []; // 待更新文件清单
    let deleteList = []; // 待删除文件清单



    if (hasNewVersion || down_version) {
        // 待更新文件清单
        if (serverVersion && localVersion) {
            for (var key in serverVersion.updateFile) {
                if (files.exists("./" + key) && localVersion.updateFile[key]) {
                    if (serverVersion.updateFile[key] > localVersion.updateFile[key] ||
                        !files.exists("./" + key)) {
                        updateList.push(key);
                    }
                } else {
                    updateList.push(key);
                }
            }

            // 待删除文件清单
            for (var key in localVersion.updateFile) {
                if (!serverVersion.updateFile[key]) {
                    deleteList.push(key);
                }
            }
        }
        if (config && config.检查脚本更新) {
            console.error("发现新的版本！！！")
            console.info("最新版本：" + serverVersion.version)
            console.log("-----→");
            console.error("增量更新列表：")
            if (updateList.length > 0) {
                log("----------------------------");
                log("需要更新的文件清单:");
                updateList.forEach((file) => {
                    let name = !file.includes('【') ? ''.padStart(1) + file : file;
                    console.error(name);
                    if (file.includes('config')) {
                        log('更新前，建议重命名' + name)
                        log('备份屏幕解锁坐标'.padStart(14))
                    }
                });
                log("----------------------------");
            }
            if (deleteList.length > 0) {
                log("----------------------------");
                log("需要删除的文件清单:");
                deleteList.forEach((file) => {
                    let name = !file.includes('【') ? ''.padStart(1) + file : file;
                    console.error(name);
                });
                log("----------------------------");
            }


            //更新脚本
            if (config.检查脚本更新 > 1) {
                console.info("最新版本：" + serverVersion.version)
                toastLog("配置[检查更新]：" + config.检查脚本更新)

                toastLog("开始更新脚本");
                updateScript();
                return;
            }

            if (config.检查脚本更新 === 1) {
                notice({
                    title: '小社脚本有新的版本！！！🎊v' + serverVersion.version,
                    content: '脚本运行日志里有更新清单\n点击此处去更新🌐',
                    intent: {
                        action: "android.intent.action.VIEW",
                        data: github
                    },
                    autoCancel: true
                });
            }

        }

    } else {
        console.error("✅ 脚本已经是最新版！")
    }

}



function updateScript() {
    // 优先使用服务端更新脚本名称
    if (serverVersion && serverVersion.updateScript)
        update_script = serverVersion.updateScript;

    if (!files.exists("./" + update_script)) {
        console.error(update_script + ' 不存在');
        log("开始下载更新程序：" + update_script)

        // 下载更新脚本
        //  let lun = Math.ceil(proxys.length * proxys_use);
        let lun = getLun(proxys, proxys.length * proxys_use, 10);
        while (lun--) {
            //  for (proxy_index; proxy_index < lun; proxy_index++) {
            let url = proxys[proxy_index] +
                github_download_url +
                update_script +
                '?t=' + new Date().getTime();

            log('使用加速器：' + proxys[proxy_index]);
            //log(url);
            try {
                let res = HttpUtils.download(
                    url,
                    "./" + update_script, {
                        timeout: 5,
                        ignoreSSL: true,
                        isTextFile: true,
                        onProgress: (progress) => {
                            console.log(progress.progressBar + (" " + progress.percent + "%").padStart(5, "\u3000"));
                        }
                    }
                )
                if (res && res.statusCode === 200)
                    break;
            } catch (e) {
                //  console.error(e.message)
                console.error('下载失败，更换加速器重试');
                // 删除代理
                proxys.splice(proxy_index, 1);
                //  proxy_index--;
                continue;
            }
        }

    }
    if (!files.exists("./" + update_script)) {
        console.error(update_script + ' 下载失败');
        console.error('尝试加载本地更新程序……');

        update_script = localVersion.updateScript;
        if (!files.exists("./" + update_script)) {
            console.error(update_script + ' 不存在');
            console.error('找不到更新程序，无法更新');
            return;
        }
    }

    // ========== 启动更新脚本 ==========

    // 续上5分钟时间
    //device.keepScreenDim(5 * 60 * 1000);
    maxRuntime = maxRuntime + 5 * 60 * 1000;

    console.error("提示：启动→" + update_script)
    let update_locked = './tmp/update_locked';
    for (let i = 0; i < 15; i++) {
        log('→起飞'.padStart(i * 2 + 3, '-'));
        if (i > 10) {
            // 执行一键更新程序.js
            engines.execScriptFile("./" + update_script);
            wait(() => false, 50, i);
            // 检查脚本运行
            if (files.exists(update_locked)) {
                floaty.closeAll();
                console.hide();
                break;
            }
        }

    }
    if (!files.exists(update_locked)) {
        console.error(update_script + "启动失败！")
        return;
    }
    // 等待更新脚本执行完成
    while (files.exists(update_locked))
        wait(() => false, 1000);

    // ========== 启动新的主程序 ==========
    //重新加载本地版本文件
    loadLocalVersion();
    console.info("即将执行新的脚本：" + mainFile)
    console.error("提示：启动→" + mainFile)

    for (let i = 0; i < 12; i++) {
        log('→起飞'.padStart(i * 2 + 3, '-'));
    }

    // 执行主程序
    engines.execScriptFile("./" + mainFile, {
        delay: 2000
    });
    abnormalInterrupt = 0;
    //退出本线程
    exit();

}


function checkAutoJS6Version() {
    console.info("--->→AutoJS6 检查更新←<---")

    log("正在查询版本更新……")

    let autojs6_serverVersion = null;
    // let lun = Math.ceil(api_proxys.length * 0.5);
    let lun = getLun(api_proxys, api_proxys.length * 0.5, 5);
    while (lun--) {
        let result = null;

        let url = api_proxys[0] +
            autoJS6_update +
            '?t=' + new Date().getTime();

        let thread = threads.start(() => {
            try {
                let res = HttpUtils.request(url, {
                    method: "GET",
                    timeout: 8,
                    ignoreSSL: true
                });
                if (res && res.statusCode === 200) {
                    result = res.json;
                    autojs6_serverVersion = result.tag_name.slice(1);
                }
            } catch (e) {}
        });
        thread.join(8 * 1000);
        if (thread.isAlive()) {
            thread.interrupt();
        }

        if (result && autojs6_serverVersion)
            break;

        // 删除代理
        api_proxys.splice(0, 1);
        // i--;
    }

    if (!autojs6_serverVersion) {
        console.error("代理连接github api失败")
        console.error("检查AutoJS6版本失败！")
        return;
    }
    let hasNewVersion = compareVersions(autojs6_serverVersion, autojs.versionName) > 0;

    if (hasNewVersion) {
        console.error("AutoJS6最新版：" + autojs6_serverVersion)
        console.error("当前版本：" + autojs.versionName)
        console.error("建议更新版本！！！")
        console.error("旧版可能有部分方法找不到、未定义")
    } else {
        console.error("✅ AutoJS6已经是最新版！")
    }

}


//------------ 业务逻辑开始 ----------//

// 调用 Android KeyguardManager 检查锁屏状态
var KeyguardManager = context.getSystemService(context.KEYGUARD_SERVICE);
var isLocked = KeyguardManager.isKeyguardLocked(); // 是否锁屏
var isSecure = KeyguardManager.isKeyguardSecure(); // 是否安全锁屏（如密码、指纹）


// 多次上滑
function swipesUp(swipeCount, n) {
    swipeCount = Math.min(swipeCount, 5);
    let arr = getRandomNumbers(4);
    //log(arr)

    for (let p = 0; p < swipeCount; p++) {
        let i = config.上滑起始位置 ? arr[p] : p;
        let startY = dheight * (0.96 - 0.15 * i);
        let baseEndY = dheight * (0.65 - 0.15 * i);
        let baseDistance = startY - baseEndY;
        let endY = baseEndY;

        if (n < swipeCount - 1) {
            let distanceMultiplier = 1 + 0.1 * (swipeCount - 1 - n);
            let adaptiveMultiplier = distanceMultiplier * (1 - i * 0.02);
            let actualDistance = baseDistance * adaptiveMultiplier;
            endY = startY - actualDistance;
        }
        if (endY < 0) endY = 0;


        let duration = (115 + 10 * Math.pow(-1, p)) + p * 50 + (4 - n) * 50;
        duration = Math.max(duration, 115);

        console.warn(`--→ 第 ${p+1} 次上滑`)
        log(`位置： ${i}:${(0.96 - 0.15 * i).toFixed(2)}:(${Math.round(startY)}→${Math.round(endY)})`)
        log(`滑动时长： ${duration}`)

        swipe(
            dwidth * (4 + Math.pow(-1, i + n)) / 8,
            startY,
            dwidth * (4.5 + Math.pow(-1, i + n)) / 8,
            endY,
            duration
        );
        wait(() => false, 300 + (3 - n) * 50);
        if (p < 1) wait(() => false, 1000);
    }
    wait(() => false, 1000);
    console.warn(`————————————→ `)
    log("上滑结束！");
}


//解锁
function unLock() {
    //  screenOn();
    if (!isLocked) return;

    console.info("-----→");
    log("设备已锁定！！！");
    log("启动解锁程序……");

    console.info(">>>>>>>→设备解锁←<<<<<<<")

    log("开始解锁设备……");

    let swipeCount = 5;
    if (config && config.上滑次数)
        swipeCount = config.上滑次数;

    //解锁
    let n = 4;
    while (isLocked && n--) {
        screenOn();
        wait(() => false, 1000);
        // 上滑
        swipesUp(swipeCount, n);

        // 有安全加密
        if (isSecure) {
            // 有加密的情况下，才有解密页面
            if (!wait(() => (contentStartsWith('紧急').exists() || content('返回').exists()), 3)) {
                console.error('上滑失败，重试！')
                if (n < 2) {
                    console.error('可以尝试修改配置：')
                    console.error('{上滑起始位置: ' + config.上滑起始位置 + '}')
                }
                wait(() => false, 1000);
                // 锁屏
                autoLockScreen();
                wait(() => false, 1500);
                // 点亮屏幕
                // screenOn();
                continue;
            }
            if (config.解锁方式 === 1) {
                log("→图案解锁");
                let password = config.锁屏图案坐标;
                if (config.输出密码) {
                    log("坐标：");
                    password.forEach((coord, index) => {
                        console.error(`第${index+1}个坐标：[${coord[0]}, ${coord[1]}]`);
                    });
                }
                gesture(password.length * 200, config.锁屏图案坐标);
            }
            if (config.解锁方式 === 2) {
                let password = config.锁屏数字密码;
                if (typeof password !== 'string') {
                    console.error('密码格式错误！');
                    console.error('密码开始和结束，必须有英文双引号！');
                    abnormalInterrupt = 0;
                    wait(() => false, 2000);
                    exit();
                    wait(() => false, 2000);
                }

                passwrd = String(password).trim();

                if (password.length < 4) {
                    console.error('密码长度必须>=4位！');
                    abnormalInterrupt = 0;
                    wait(() => false, 2000);
                    exit();
                    wait(() => false, 2000);
                }

                if (textContains('混合').exists()) {
                    log("→数字密码(混合密码)解锁");
                    let b = 20;
                    while (clickCenter('删除') && b--);
                } else {
                    log("→数字密码解锁");
                }

                for (let i = 0; i < password.length; i++) {
                    if (config.输出密码) {
                        console.error(`第${i+1}个密码字符：[${password[i]}]`);
                    }
                    let num = content(password[i]).findOne(1000);
                    if (!clickCenter(num)) {
                        console.error('[' + password[i] + '] 点击失败!')
                    };
                    wait(() => false, 300);
                }
                if (textContains('混合').exists()) {
                    clickCenter(desc('回车').findOne(1000));
                }
            }
            wait(() => false, 666);
        }

        //去桌面
        for (let i = 0; i < 3; i++) {
            toHome();
            wait(() => false, 300);
        }


        //更新锁屏状态
        isLocked = KeyguardManager.isKeyguardLocked();
        wait(() => false, 300);
        if (isLocked) {
            let k = 20;
            while (!clickCenter('返回') &&
                clickCenter('删除') &&
                k--);
            console.error('解锁失败，重试！')
        }

    }
    if (isLocked) {
        console.error("屏幕解锁失败！！！");
        if (config && config.通知提醒)
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String('屏幕解锁失败了！'));

        abnormalInterrupt = 0;
        wait(() => false, 2000);
        exit();
        wait(() => false, 2000);
    }
    log("屏幕解锁成功！！！(∗❛ั∀❛ั∗)✧*。");
    console.warn('→计时器时间重新校准！')
    date = nowDate();
    return;
}



//--------- 重启无障碍 ------//

// 写入服务id
function writingServiceId() {
    let id = getServiceId();
    if (id) serviceId = id;

    //写入文件
    files.remove(serviceId_file);
    wait(() => false, 200);
    files.write(serviceId_file, serviceId, "utf-8");
}



// 在已启动无障碍的条件下，查询服务id
function getServiceId() {
    let sid = null;

    try {
        // Android 8.0+ 标准方式
        // if (device.sdkInt >= 26) {
        let am = context.getSystemService("accessibility");
        let services = am.getEnabledAccessibilityServiceList(-1);
        for (let i = 0; i < services.size(); i++) {
            let id = services.get(i).getId();
            if (id.startsWith("org.autojs.autojs6/"))
                sid = id;
        }
        //}
    } catch (e) {
        console.error("1查询失败:", e);

        //return null;
    }

    if (!sid) {
        try {
            // Android 7.x 反射调用
            let Settings = android.provider.Settings.Secure;
            let enabledServices = Settings.getString(
                context.getContentResolver(),
                "enabled_accessibility_services"
            );
            let match = enabledServices.match(/org\.autojs\.autojs6\/[\w\.]+/);
            sid = match ? match[0] : null;
        } catch (e) {
            console.error("2查询失败:", e);
        }
    }
    return sid;
}



//1.读取服务id
function readdingServiceId() {
    if (files.exists(serviceId_file)) {
        serviceId = files.read(serviceId_file, "utf-8");
    }
    // log(serviceId)
    return serviceId;
}



// 2. Root 权限重启无障碍服务
function restartAccessibilityByRoot() {
    if (!autojs.isRootAvailable())
        return;

    readdingServiceId();
    // 获取当前已启用的服务列表
    let enabledServices = shell("su -c 'settings get secure enabled_accessibility_services'", true).result;

    // 移除目标服务（确保彻底关闭）
    let newServices = enabledServices
        .replace(serviceId, "")
        .replace(/::+/g, ":")
        .replace(/^:|:$/g, "");
    shell(`su -c 'settings put secure enabled_accessibility_services "${newServices}"'`, true);
    wait(() => false, 1500); // 等待系统卸载服务

    // 重新追加服务 ID 并激活全局开关
    shell(`su -c 'settings put secure enabled_accessibility_services "${newServices}:${serviceId}"'`, true);
    shell("su -c 'settings put secure accessibility_enabled 1'", true); // 强制开启总开关
}



// 2. Shizuku 权限重启无障碍服务
function restartAccessibilityByShizuku() {
    if (!shizuku.hasPermission() ||
        !shizuku.isOperational())
        return;

    readdingServiceId();
    // 获取当前已启用的服务列表
    let enabledServices = shizuku("settings get secure enabled_accessibility_services").result;

    // 移除目标服务 ID
    let newServices = enabledServices
        .replace(serviceId, "")
        .replace(/::+/g, ":")
        .replace(/^:|:$/g, "");
    shizuku(`settings put secure enabled_accessibility_services "${newServices}"`);
    wait(() => false, 1500);

    // 避免重复添加
    newServices += (newServices ? ":" : "") + serviceId;
    shizuku(`settings put secure enabled_accessibility_services "${newServices}"`);

    // 强制开启全局开关
    shizuku("settings put secure accessibility_enabled 1");

}



// 2. 修改安全设置权限，重启无障碍服务
function restartAccessibilityService() {
    if (!autojs.canWriteSecureSettings())
        return;

    readdingServiceId();
    const contentResolver = context.getContentResolver();

    // 获取当前启用的服务列表（避免覆盖其他服务[6](@ref)）
    const keyServices = android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES;
    const keyEnabled = android.provider.Settings.Secure.ACCESSIBILITY_ENABLED;
    let enabledServices = android.provider.Settings.Secure.getString(contentResolver, keyServices) || "";

    // 移除目标服务（清理残留符号）
    let newServices = enabledServices
        .replace(serviceId, "")
        .replace(/::+/g, ":")
        .replace(/^:|:$/g, "");

    // 先禁用服务（触发系统卸载）
    android.provider.Settings.Secure.putString(contentResolver, keyServices, newServices);
    wait(() => false, 1500); // 等待系统生效

    // 重新添加服务并强制开启全局开关
    android.provider.Settings.Secure.putString(contentResolver, keyServices, newServices + ":" + serviceId);
    android.provider.Settings.Secure.putString(contentResolver, keyEnabled, "1");

}


//--------- 重启程序 ------//

// 重启标志
var restart_main_locked = "./tmp/restart_main_locked";

// 重启
function restart() {
    if (!files.exists(restart_main_locked)) {
        files.create(restart_main_locked);
        let fileName = engines.myEngine().getSource().getFullName();
        console.info("即将重启本脚本：" + fileName)
        console.error("提示：启动→" + fileName)

        for (let i = 0; i < 12; i++) {
            log('→起飞'.padStart(i * 2 + 3, '-'));
        }

        // 执行主程序
        engines.execScriptFile("./" + fileName, {
            delay: 2000
        });

        abnormalInterrupt = 0;
        //退出本线程
        exit();
    } else {
        files.remove(restart_main_locked);
        console.error('重启失败');

        abnormalInterrupt = 0;
        wait(() => false, 2000);
        exit();
        wait(() => false, 2000);
    }
}



// 权限验证
function permissionv() {
    console.info(">>>>>>→权限验证←<<<<<<")
    log("--------- 必要权限 ---------");
    //auto.waitFor();
    // 无障碍权限
    // auto.start();
    let autoRun = 0;
    if (auto.isRunning() && auto.service && auto.root) {
        log("无障碍服务，[已启用]");
        autoRun = 1;
        files.remove(restart_main_locked);
        writingServiceId();
    } else {
        console.error("无障碍服务，[未启用]");
    }

    //悬浮窗权限
    if (autojs.canDisplayOverOtherApps()) {
        log("悬浮窗权限，[已启用]");
    } else {
        console.error("悬浮窗权限，[未启用]!");
        console.error("或：显示在其它应用上层");

        abnormalInterrupt = 0;
        wait(() => false, 2000);
        exit();
        wait(() => false, 2000);
    }


    // 通知权限6.6.2版本修复
    // 判断通知是否被启用
    if (notice.isEnabled()) {
        log("发送通知权限，[已启用]");
    } else {
        toast("发送通知权限，[未启用]!");
        console.error("发送通知权限，[未启用]!");
        //去设置
        notice.launchSettings();

        abnormalInterrupt = 0;
        wait(() => false, 2000);
        exit();
        wait(() => false, 2000);
    }

    // 获取应用包名和电源管理服务
    let powerManager = context.getSystemService(context.POWER_SERVICE);
    // 检测是否已忽略电池优化
    if (powerManager.isIgnoringBatteryOptimizations(autojs.packageName)) {
        log("忽略电池优化，[已启用]");
    } else {
        console.error("忽略电池优化，[未启用]!");
        console.error("可能导致定时任务无法执行");
        console.error("请将省电策略改成[无限制]");
        console.error("若有墓碑、杀后台程序，请加入白名单");
        wait(() => false, 3000);
    }


    // 投影媒体权限
    function checkProjectionPermission() {
        try {
            let appOps = context.getSystemService(context.APP_OPS_SERVICE);
            let MODE_ALLOWED = appOps.MODE_ALLOWED || 0;

            // 定义所有可能的投影媒体权限检查方法
            let methods = [
                // 方法1: 使用字符串
                () => appOps.checkOpNoThrow("android:project_media",
                    android.os.Process.myUid(), context.getPackageName()),

                // 方法2: 使用常量
                () => appOps.checkOpNoThrow(
                    android.app.AppOpsManager.OPSTR_MEDIA_PROJECTION,
                    android.os.Process.myUid(), context.getPackageName()),

                // 方法3: 使用操作码
                () => appOps.checkOpNoThrow(1001,
                    android.os.Process.myUid(), context.getPackageName()),

                // 方法4: 使用其他可能操作码
                () => appOps.checkOpNoThrow(1002,
                    android.os.Process.myUid(), context.getPackageName())
            ];

            // 遍历所有方法
            for (let i = 0; i < methods.length; i++) {
                try {
                    let mode = methods[i]();
                    if (mode !== undefined && mode !== null) {
                        return mode === MODE_ALLOWED;
                    }
                } catch (e) {
                    // 继续尝试下一个方法
                }
            }

            return false;

        } catch (e) {
            console.warn("投影媒体权限检查失败，可能设备不支持");
            return false;
        }
    }

    if (checkProjectionPermission()) {
        log("投影媒体权限，[已启用]");
    } else {
        console.error("投影媒体权限，[未启用]！");
        console.error("无法全自动完成所有流程！");
        wait(() => false, 3000);
    }


    // 后台弹出界面权限检查
    function checkBackgroundStartPermission() {
        let manufacturer = android.os.Build.MANUFACTURER;
        try {
            if (manufacturer.includes("Xiaomi")) {
                let appOps = context.getSystemService(context.APP_OPS_SERVICE);
                return appOps.checkOpNoThrow(10021, android.os.Process.myUid(), context.getPackageName()) == appOps.MODE_ALLOWED;
            } else if (manufacturer.includes("Vivo")) {
                let uri = android.net.Uri.parse("content://com.vivo.permissionmanager.provider.permission/start_bg_activity");
                let cursor = context.getContentResolver().query(uri, null, "pkgname = ?", [context.getPackageName()], null);
                if (cursor != null) {
                    try {
                        if (cursor.moveToFirst()) {
                            let state = cursor.getInt(cursor.getColumnIndex("currentstate"));
                            return state == 0;
                        }
                    } finally {
                        cursor.close();
                    }
                }
                return false;
            } else if (manufacturer.includes("Oppo")) {
                return context.getPackageManager().checkPermission("android.permission.SYSTEM_ALERT_WINDOW", context.getPackageName()) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            } else {
                let appOps = context.getSystemService(context.APP_OPS_SERVICE);
                // 对于其他厂商，尝试使用 OPSTR_START_FOREGROUND（如果支持）
                try {
                    return appOps.checkOpNoThrow(android.app.AppOpsManager.OPSTR_START_FOREGROUND, android.os.Process.myUid(), context.getPackageName()) == appOps.MODE_ALLOWED;
                } catch (e) {
                    // 如果 OPSTR_START_FOREGROUND 不可用，则回退到 OPSTR_START_ACTIVITY
                    return appOps.checkOpNoThrow(android.app.AppOpsManager.OPSTR_START_ACTIVITY, android.os.Process.myUid(), context.getPackageName()) == appOps.MODE_ALLOWED;
                }
            }
        } catch (e) {
            return false;
        }

    }

    if (checkBackgroundStartPermission()) {
        console.log("后台弹出界面权限，[已启用]");
    } else {
        console.error("后台弹出界面权限，[未启用]!");
        console.error("功能受限，可能无法顺利完成全部流程！");
        wait(() => false, 3000);
    }

    if (autojs.canModifySystemSettings()) {
        log("修改系统设置权限，[已启用]");
    } else {
        console.error("修改系统设置权限，[未启用]!");
        console.error("涉及功能：媒体静音、修改亮度等！");
        wait(() => false, 3000);
    }


    function checkNetworkPermission() {
        let urls = [
            "http://connectivitycheck.platform.hicloud.com/generate_204", // 华为
            "http://www.qualcomm.cn/generate_204", //高通
            "http://wifi.vivo.com.cn/generate_204", // vivo
            "http://connect.rom.miui.com/generate_204", // 小米
            "http://connectivitycheck.gstatic.com/generate_204", //Google
            "http://edge.microsoft.com/captiveportal/generate_204", //微软
            "http://cp.cloudflare.com/generate_204", //CF

            // 延迟高
            "http://204.ustclug.org", //中科大学
            "http://noisyfox.cn/generate_204", //社区
        ];
        for (let i = 0; i < urls.length; i++) {
            let timeoutTimes = i < 3 ? 2 :
                (i < 6 ? 3 : 5);
            let url = urls[i];
            //log(url)
            let res = null;
            let thread = threads.start(() => {
                try {
                    res = http.get(url, {
                        timeout: timeoutTimes * 1000,
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                            'Connection': 'Keep-Alive'
                        }
                    });
                } catch (e) {}
            });
            thread.join(timeoutTimes * 1000);
            thread.interrupt();
            if (res && (res.statusCode === 204 || res.statusCode === 200))
                return true;

        }
        return false;
    }

    if (checkNetworkPermission()) {
        log("网络权限，[可联网]");
    } else {
        console.error("网络权限，[无法联网]!");
        console.error("可能无法完成APP识图签到！");
        console.error("可能无法更新脚本！");
        wait(() => false, 3000);
    }

    wait(() => false, 2000);
    log("------ 不必要高级权限 ------");
    let canRestarAuto = 0;

    let secureSettingAuto = 0;
    if (autojs.canWriteSecureSettings()) {
        log("修改安全设置权限，[已启用]");
        secureSettingAuto = 1;
        if (Pref.shouldStartA11yServiceWithSecureSettings()) {
            console.warn('→自动启用无障碍，[已开启]');
            canRestarAuto = 1;
        } else {
            console.error('→自动启用无障碍，[未开启]');
            console.error('可在AutoJS6设置里开启');
        }
    } else {
        log("修改安全设置权限，[未启用]!");
        console.warn('当无障碍服务故障或掉线时，')
        console.warn('可通过该权限自动重启无障碍')
        console.info('开启方式与[投影媒体权限]一样')
        console.info('可通过Shizuku或Root开启')
        wait(() => false, 3000);
    }

    let rootAuto = 0;
    if (autojs.isRootAvailable()) {
        log("Root授权，[已授权]");
        rootAuto = 1;
        if (Pref.shouldStartA11yServiceWithRoot()) {
            console.warn('→自动启用无障碍，[已开启]');
            canRestarAuto = 1;
        } else {
            console.error('→自动启用无障碍，[未开启]');
            console.error('可在AutoJS6设置里开启');
        }

    } else {
        log("Root授权，[未授权]!");
    }

    let shizukuAuto = 0;
    // Shizuku权限检测
    if (shizuku.hasPermission() &&
        shizuku.isOperational()) {
        log("Shizuku授权，[已授权]");
        shizukuAuto = 1;
    } else {
        log("Shizuku授权，[未授权]!");
    }
    if (!autoRun) {
        console.info('------------------------------')
    }
    // ---------- 重启无障碍服务权限 ---------- //
    if (config && config.自动重启无障碍服务 && !autoRun &&
        (canRestarAuto || shizukuAuto || secureSettingAuto || rootAuto)) {
        console.error('无障碍服务未启用或发生故障！')
        console.warn('发现已启用高级权限')
        console.warn('可尝试重启无障碍服务')
        console.error('正在重启无障碍服务......')
        console.info('-----------------')
        if (canRestarAuto) {
            log('使用AutoJS6方法重启无障碍服务...')
            try {
                auto(true);
            } catch (e) {}
            wait(() => false, 1000);

            if (!auto.isRunning() &&
                !auto.service) {
                try {
                    auto.stop();
                    wait(() => false, 1000);
                    auto.start();
                } catch (e) {}
                wait(() => false, 1000);
            }
        }
        if (!auto.isRunning() &&
            !auto.service && rootAuto) {
            log('使用Root权限重启无障碍服务...')
            try {
                restartAccessibilityByRoot();
            } catch (e) {}
            wait(() => false, 1000);
        }
        if (!auto.isRunning() &&
            !auto.service && shizukuAuto) {
            log('使用Shizuku权限重启无障碍服务...')
            try {
                restartAccessibilityByShizuku();
            } catch (e) {}
            wait(() => false, 1000);
        }
        if (!auto.isRunning() &&
            !auto.service && secureSettingAuto) {
            log('使用修改安全设置权限重启无障碍服务...')
            try {
                restartAccessibilityService();
            } catch (e) {}
            wait(() => false, 1000);
        }

        // 重启程序
        restart();
    }
    if (!autoRun) {
        console.error("需重新启用无障碍服务");
        console.error("或重启手机");
        if (notice.isEnabled()) {
            if (config && config.通知提醒)
                notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("无障碍服务故障或未启用"));
        }
        abnormalInterrupt = 0;
        wait(() => false, 2000);
        exit();
        wait(() => false, 2000);
    }

    // exit();
    wait(() => false, 3000);
}




function main() {
    // 点亮屏幕
    screenOn();


    //权限验证
    permissionv();

    // 再次加载悬浮窗控制台配置，以便纠正悬浮窗控制台错误
    //consoleShow();

    // 系统修改
    systemSetting();


    // 更新代理池
    if (ableUpdate)
        updateProxys();

    // 检查AutoJS6更新
    if (config && config.检查AutoJS6更新 && ableUpdate) {
        checkAutoJS6Version();
        wait(() => false, 1000);
    }

    // 初始化，文件检查
    init();

    //检查脚本更新
    if (config && config.检查脚本更新 && ableUpdate) {
        checkVersion();
        wait(() => false, 1000);
    }

    // 同步代理
    if (ableUpdate) synProxys();

    //屏幕解锁
    unLock();

    try {
        // 再次加载悬浮窗控制台配置，以便纠正悬浮窗控制台错误
        consoleShow();
        // throw e;
        //逻辑程序
        run();
        log("      —— 耗时[ " + getDurTime(date) + " ] ——");
        console.warn("—----->--- End ---<-----—");
        device.cancelKeepingAwake();
        //允许息屏信号
        ableScreenOff = 1;
        abnormalInterrupt = 0;
        if (!global.unfinished_mark) {
            // 关闭悬浮窗控制台
            consoleExitOnClose();
        }
        wait(() => false, 1000);

    } catch (e) {
        if (!(e.javaException instanceof ScriptInterruptedException)) {
            //通常只有 1 行消息. 
            console.error(e.message);
            console.error(e.stack);
            // 通常有不到 10 
            //exit(e);
        }
        if (e.message.includes('找不到') || e.message.includes('未定义')) {

            console.error('尝试以下方案后重试！')
            console.error(' 1、更新AutoJS6到最新版')
            console.error(' 2、AutoJS6设置→稳定模式')
            console.error(' 3、重新授权无障碍服务')
            console.error(' 4、删除[启动程序.js文件]，重新执行更新程序下载')

        }


    } finally {
        if (true) {
            if (config && config.运行亮度)
                console.error("提示：亮度已恢复！");
            if (config && config.静音级别) {
                if (config && config.静音级别 === 1)
                    console.error("提示：媒体静音已解除！");
                if (config && config.静音级别 === 2)
                    console.error("提示：通知静音已解除！");
            }
            if (config && config.结束震动)
                console.error("提示：结束震动提醒~~~");

            log(engines.all().length);

            try {
                exit();
            } catch (e) {}
        }
    }

}

main();