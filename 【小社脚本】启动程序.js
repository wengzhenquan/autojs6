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

//程序运行文件标志
files.ensureDir("./tmp/");
var launch_locked = "./tmp/launch_main_locked";
if (!files.exists(launch_locked)) {
    events.on("exit", () => files.remove(launch_locked));
    files.create(launch_locked);
} else {
    if (engines.all().length < 2) {
        // 防止锁残留
        files.remove(launch_locked);
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

//设置参考坐标，不能动，开发环境标准比例。
setScaleBaseX(1080);
setScaleBaseY(2400);

var github = "https://github.com/wengzhenquan/autojs6";
var github_download_url = "https://raw.githubusercontent.com/wengzhenquan/autojs6/refs/heads/main/"

var update_script = "【小社脚本】一键更新程序.js";
var serverVersion = null;
var localVersion = null;
var run = null;
var mainFile = null;

date = nowDate();

var xmPckageName = "com.xiaomi.vipaccount"; // 社区APP包名
var wchatpn = "com.tencent.mm"; //微信包名，用来校验小程序是否打开
var xmVersionName = getAppVersionName(xmPckageName);
var wchatVersionName = getAppVersionName(wchatpn);
//社区APP最低支持跳转入口的版本
var xmAtLeastVersionName = "5.3.2";

var serviceId = "org.autojs.autojs6/org.autojs.autojs.core.accessibility.AccessibilityServiceUsher";
var serviceId_file = "./tmp/service_id.txt"


// 设备信息
var dwidth = device.width;
var dheight = device.height;
// 获取设备制造商
var manufacturer = android.os.Build.MANUFACTURER;
// 获取设备品牌
var brand = device.brand;

//var jsversion = (engines.myEngine().getSource().getName()
//   .match(/\d[\s\S]*/) || [""])[0];


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
var maxRuntime = 3 * 60 * 1000;


//打开悬浮窗控制台
console.reset();
//consoleShow();
consoleShow();

console.warn("—----->--- Start ---<-----—");
log(("AutoJS6 版本：").padStart(20) + autojs.versionName)
log(("Android 版本：").padStart(20) + device.release)
log(("微信 Ver：") + String(wchatVersionName).padStart(20))
log(("小米社区 Ver：") + String(xmVersionName).padStart(14))
log("制造商：" + manufacturer + "，品牌：" + brand);
log("产品：" + device.product + "，型号：" + device.model);
log(`设备分辨率：${dwidth}x${dheight}`);
log(`现在是：${date}`);
console.error('QQ群：197511003');


events.on("exit", function() {
    try {
        if (config && !config.fast模式)
            auto.clearCache();
    } catch (e) {}

    if (abnormalInterrupt && config && config.通知提醒)
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("发生未知错误，脚本异常中断\n详细问题，请查看日志"));

    console.info('q群反馈：197511003');
    console.setTouchable(true);
    consoleMax();
    device.cancelKeepingAwake();
    if (window) window.close();
    floaty.closeAll();
    threads.shutDownAll();

    // verbose(nowDate());
});

//------------ 前置任务 ----------//


//AutoJS6版本检查
checkAutoJS6();

// 维护期禁止更新
maintain();


// 启动悬浮窗关闭按钮
threads.start(() => stopButton());


// 程序运行监控
startTimeoutMonitor();


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
    if (hours < 2 || hours >= 20) {
        console.error('维护时间：20点~凌晨2点');
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

/**
 * 启动脚本总运行时间监控
 * @param {number} maxRuntimeMs - 最大允许运行时间 (毫秒)
 */
function startTimeoutMonitor() {
    threads.start(() => {
        setInterval(function() {
            // 尝试刷新
            tryRefresh();

            const startTime = new Date(date.replace(/-/g, '/')).getTime();
            let currentTime = new Date().getTime();

            if (currentTime - startTime < (9 * 1000)) {
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
                console.error(`脚本运行 ${(maxRuntime)/60/1000} 分钟，强制退出`);
                console.error('可能是兼容性问题，或布局分析问题，导致页面卡住');
                console.error('也有可能是无障碍服务故障，可重新授权无障碍');
                console.error('请截图保存最后卡住的页面，反馈问题。')
                if (config && config.通知提醒)
                    notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("发生未知错误，脚本强制停止\n详细问题，请查看日志"));
                exit();
            }
        }, 5 * 1000); // 每 5 秒检查一次
    });
}

// 尝试刷新
function tryRefresh() {
    let n = 3;
    while (n-- && (content('刷新').exists() ||
            content('重新加载').exists() ||
            content('refresh').exists())) {
        console.warn('页面未成功加载')
        console.warn('第 ' + (3 - n) + ' 次尝试刷新...')
        clickCenter('刷新');
        clickCenter('重新加载');
        clickCenter('refresh');
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
                titleTextSize: 20,
                titleTextColor: 'green',
                titleIconsTint: 'yellow',
                titleBackgroundAlpha: 0.9,
                titleBackgroundColor: 'dark-blue',
                // titleBackgroundTint: 'dark-blue', //6.5.0版本没有
                contentTextSize: 15,
                contentBackgroundAlpha: 0.8,
                contentBackgroundColor: colors.BLACK,
                touchable: false,
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
            if (config && config.悬浮窗控制台_字体大小)
                console.setContentTextSize(config.悬浮窗控制台_字体大小);

            console3();

            if (!console.isShowing()) {
                console.show();
            }
        }
    });
}

//悬浮窗控制台变成30%
function console3() {
    let h = (config && config.悬浮窗控制台_运行高度) || 0.3;
    console.setSize(0.96, h);
}
//悬浮窗控制台变成18%
function consoleMin() {
    let h = 0.18;
    // 自动适配
    if (global.picY) {
        // h = (global.picY - cY(110));

        const STATUS_BAR_HEIGHT = ui.statusBarHeight;
        const BORDER_OFFSET = dpToPx2(12);
        // h = a - STATUS_BAR_HEIGHT - y + BORDER_OFFSET;
        h = (global.picY - cY(15)) - STATUS_BAR_HEIGHT - (0.02 * dheight) + BORDER_OFFSET;
    }

    if (config && config.悬浮窗控制台_签到高度)
        h = config.悬浮窗控制台_签到高度;

    console.setSize(0.96, h);

    // 像素转换
    function dpToPx2(dp) {
        // 获取设备屏幕密度（dpi），AutoJS6中通过context获取
        let dpi = context.getResources().getDisplayMetrics().densityDpi;
        // 标准密度为160dpi，1dp = 1px，其他密度按比例计算
        return dp * (dpi / 160);
    }

}

//悬浮窗控制台高度变成80%
function consoleMax() {
    if (console.isShowing()) {
        //透明度
        console.setContentBackgroundAlpha(1)
        console.setSize(0.96, 0.8);
        //可触碰
        console.setTouchable(true);
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

// 点击中心坐标
function clickCenter(obj) {
    try {
        if (obj) {
            if (typeof obj === 'string') {
                obj = content(obj);
            }

            if (obj instanceof UiSelector) {
                obj = obj.findOne(1000);
            }

            if (obj && (obj instanceof UiObject)) {
                if (obj.show())
                    wait(() => false, 500);
                let x = obj.bounds().centerX()
                let y = obj.bounds().centerY()
                //log(x,y)
                if (x > 0 && y > 0) {
                    return click(x, y);
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
                obj = obj.findOne(1000);
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
    const startTime = new Date(startTimeStr.replace(/-/g, '/')).getTime();
    // 获取当前时间的时间戳
    const currentTime = new Date().getTime();
    // 计算时间差（单位：毫秒）
    const timeDiff = currentTime - startTime;
    const absTimeDiff = Math.abs(timeDiff);
    // 先将时间差转换为秒数
    const totalSeconds = Math.floor(absTimeDiff / 1000);
    // 计算分钟数
    const minutes = Math.floor(totalSeconds / 60);
    // 计算剩余的秒数
    const seconds = totalSeconds % 60;
    // 格式化输出
    return `${minutes}:${seconds < 10? '0' + seconds : seconds}`;
}

// 获取已安装应用版本名称
function getAppVersionName(packageName) {
    try {
        // 获取应用程序的包信息
        var packageInfo = context
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
        return (size / 1024).toFixed(1) + 'KB';
    }
    return (size / Math.pow(1024, 2)).toFixed(1) + 'MB';
}




/**
 * 将毫秒转换为带单位的字符串（ms 或 s）
 * @param {number} milliseconds - 毫秒数
 * @returns {string} - 格式化后的时间字符串（如 "1.23 s"、"342 ms"）
 */
function toSeconds(milliseconds) {
    if (milliseconds >= 100) {
        // 转换为秒，保留两位小数
        const seconds = (milliseconds / 1000).toFixed(2);
        return `${seconds} s`;
    } else {
        // 直接返回毫秒
        return `${milliseconds} ms`;
    }
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
 * Fisher-Yates洗牌算法（原地打乱，ES5兼容）
 * @param {Array} array 需要打乱的原数组（直接修改此数组）
 */
function shuffleArray(array) {

    deduplicateInPlace(array);

    var length = array.length;
    var temp, randomIndex;
    while (length) {
        randomIndex = Math.floor(Math.random() * length); // 生成[0, length-1]的随机索引
        length--;
        // 交换当前元素与随机位置的元素
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
    const set = new Set(arr1);
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
            abnormalInterrupt = 0;
            console.error("[音量+]停止脚本！！！");
            // 关闭悬浮窗控制台
            consoleExitOnClose();
            abnormalInterrupt = 0;
            exit();
        });
        events.onKeyDown("volume_down", () => {
            abnormalInterrupt = 0;
            console.error("[音量-]停止脚本！！！");
            // 关闭悬浮窗控制台
            consoleExitOnClose();
            abnormalInterrupt = 0;
            exit();
        });
    }

    // 媒体声音
    let musicVolume = device.getMusicVolume();
    // 通知声音
    let nVolume = device.getNotificationVolume();
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
    let brightMode = device.getBrightnessMode();
    // 返回当前的(手动)亮度. 范围为0~255.
    let bright = device.getBrightness();
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
            wait(() => false, config.结束震动 + 300);
        }

        if (config && config.结束息屏 && ableScreenOff) {
            wait(() => false, 3000);
            //console.hide();
            // 无障碍服务调用系统锁屏
            auto.service.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_LOCK_SCREEN);

        }

    });

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
    console.info(">>>>→程序完整性校验←<<<<")

    if (!files.exists("./version")) {
        console.error("缺失version文件");
        console.error("启动版本检查/下载version/全量更新");
        checkVersion();
    }
    //加载本地版本文件
    loadLocalVersion();
    console.info("当前脚本版本：" + localVersion.version);

    if (!files.exists("./" + localVersion.run)) {
        console.error("缺失Run文件");
        console.error("启动更新程序下载文件");
        updateScript();
        return;
    }
    // 加载run函数
    console.info('加载run版本：' + localVersion.run.match(/【小社脚本】(.+)\.js/)[1]);
    run = require("./" + localVersion.run);

    if (!files.exists("./config.js")) {
        console.error("缺失config.js文件");
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
        if (typeof value === 'string' && !isNaN(value)) {
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
let proxys = [
    //1 
    "https://ghproxy.sakuramoe.dev/", // 请求时间：0.25s
    "https://x.whereisdoge.work/",
    "https://hub.gitmirror.com/", // 请求时间：0.75s
    "https://ghfile.geekertao.top/",
    "https://git.yylx.win/",
    //2
    "https://gh.222322.xyz/",
    "https://gh.catmak.name/",
    "https://proxy.yaoyaoling.net/",

]

// 备用代理
var proxys2 = [
    //3
    "https://github.xxlab.tech/", // 请求时间：0.23s
    "https://github.chenc.dev/", // 请求时间：0.67s
    "https://gh.b52m.cn/", // 请求时间：0.94s
    "https://g.blfrp.cn/", // 请求时间：1.05s
    "https://ghfast.top/", // 请求时间：1.42s
    "https://git.40609891.xyz/", // 请求时间：1.46s
    "https://git.669966.xyz/", // 请求时间：2.80s
    //4
    "https://cccccccccccccccccccccccccccccccccccccccccccccccccccc.cc/", // 请求时间：0.47s
    "https://github.dpik.top/",
    "https://gh.monlor.com/",
    "https://gh-proxy.net/",
    "https://hub.mwm.moe/",
    
]
// 打乱并整合两个数组
processArrays(proxys, proxys2);


// 检查脚本更新，version文件存在才检查更新。
function checkVersion() {
    console.info("---→>→脚本检查更新←<←---")

    let down_version = false;
    // 乱序数组
    //let arr = getRandomNumbers(proxys.length - 1);

    //远程version文件数据
    log("正在查询版本更新……")
    for (let i = 0; i < proxys.length; i++) {
        let url = proxys[i] +
            github_download_url +
            'version' +
            '?t=' + new Date().getTime();

        let result = null;
        let thread = threads.start(() => {
            try {
                let res = http.get(url, {
                    timeout: 5 * 1000,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Connection': 'Keep-Alive'
                    }
                });
                if (res && res.statusCode === 200) {
                    result = res.body.string();
                    serverVersion = JSON.parse(result);
                }
            } catch (e) {}
        });
        thread.join(5 * 1000);
        thread.interrupt();
        if (result && result.length > 500 && serverVersion) {
            if (!files.exists("./version")) {
                down_version = true;
                // 缺失version文件，下载
                files.write("./version", result, "utf-8");
                //重新加载本地版本文件
                loadLocalVersion();
            }
            break;
        }

    }

    if (!serverVersion) {
        console.error("连接github失败")
        return;
    }

    let hasNewVersion = compareVersions(serverVersion.version, localVersion.version) > 0;
    let updateList = []; // 待更新文件清单
    let deleteList = []; // 待删除文件清单

    //更新脚本
    if (down_version || hasNewVersion &&
        (config && config.检查更新 > 1)) {
        if (config && config.检查更新 > 1) {
            console.info("最新版本：" + serverVersion.version)
            toastLog("配置[检查更新]：" + config.检查更新)
        }
        toastLog("开始更新脚本");
        updateScript();
        return;
    }

    if (hasNewVersion) {
        // 待更新文件清单
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

    if (hasNewVersion && (config && config.检查更新 === 1)) {
        notice({
            title: '小社脚本有新的版本！！！🎊v' + serverVersion.version,
            content: '脚本运行日志里有更新清单\n点击此处去更新🌐',
            intent: {
                action: "android.intent.action.VIEW",
                data: github
            },
            autoCancel: true
        });
        console.error("有新的版本！！！")
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

        // 乱序数组
        // let arr = getRandomNumbers(proxys.length - 1);
        // 下载更新脚本
        var file = null;
        for (let i = 0; i < proxys.length; i++) {
            let url = proxys[i] +
                github_download_url +
                update_script +
                '?t=' + new Date().getTime();

            log('使用加速器：' + proxys[i]);
            //log(url);

            let thread = threads.start(() => {
                try {
                    let res = http.get(url, {
                        timeout: 5 * 1000,
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                            'Connection': 'Keep-Alive'
                        }
                    });
                    if (res && res.statusCode === 200) {
                        file = res.body.string();
                    }
                } catch (e) {}
            });
            thread.join(5 * 1000);
            thread.interrupt();
            if (file && file.length > 10 * 1024) {
                break;
            }
            console.error('下载失败，更换加速器重试');

        }

        if (file && file.length > 10 * 1024) {
            files.write("./" + update_script, file, "utf-8");
            console.info("下载成功")
            console.info('文件大小：' + formatFileSize(file.length))

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



//------------ 业务逻辑开始 ----------//
//解锁
function unLock() {
    // 调用 Android KeyguardManager 检查锁屏状态
    let KeyguardManager = context.getSystemService(context.KEYGUARD_SERVICE);
    let isLocked = KeyguardManager.isKeyguardLocked(); // 是否锁屏
    let isSecure = KeyguardManager.isKeyguardSecure(); // 是否安全锁屏（如密码、指纹）

    if (!isLocked) return;

    console.info("-----→");
    log("设备已锁定！！！");
    log("启动解锁程序……");

    console.info(">>>>>>>→设备解锁←<<<<<<<")

    log("开始解锁设备……");

    //解锁
    // while (!existsOne('电话', '拨号', '短信', '信息', '微信', '小米社区')) {
    let n = 3;
    while (isLocked && n--) {
        //多次上滑
        for (let i = 0; i < 2; i++) {
            swipe(dwidth * 5 / 8, dheight * 0.95, dwidth * 5 / 8, dheight * (0.6 - 0.2 * i), 202 * (i + 1));
            wait(() => false, 500)
            gesture(228 * (2 - i), [dwidth * 3 / 8, dheight * (0.95 - 0.3 * i)], [dwidth * 3 / 8, dheight * (0.3 - 0.1 * i)]);
            wait(() => false, 500)

        }
        wait(() => false, 1000);
        log("上滑！");

        // 有安全加密
        if (isSecure) {
            if (config.解锁方式 === 1) {
                log("→图案解锁");
                gesture(600, config.锁屏图案坐标);
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
                password = String(password).trim();

                if (password.length < 4) {
                    console.error('密码长度必须>=4位！');
                    abnormalInterrupt = 0;
                    wait(() => false, 2000);
                    exit();
                    wait(() => false, 2000);
                }

                if (textContains('混合').exists()) {
                    log("→数字密码(混合密码)解锁");
                } else {
                    log("→数字密码解锁");
                }

                for (let i = 0; i < password.length; i++) {
                    let num = content(password[i]).findOne(800);
                    if (!clickCenter(num)) {
                        console.error('[' + password[i] + '] 点击失败!')
                        if (!num) {
                            console.error('布局分析失效了！')
                            console.warn('如果是偶发现象，可尝试：')
                            console.warn(' 1.开启[修改安全设置]权限')
                            console.warn(' 2.可将{fast模式}改成1，开启缓存');
                            console.warn(' 3.重启无障碍服务');
                            console.warn(' 4.重启手机')

                            console.warn('如果经常发生，建议改成图案解锁！')

                            abnormalInterrupt = 0;
                            wait(() => false, 2000);
                            exit();
                            wait(() => false, 2000);

                        }

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
            home();
            wait(() => false, 300);
        }


        //更新锁屏状态
        isLocked = KeyguardManager.isKeyguardLocked();
        wait(() => false, 666);

    }
    //let result = wait(() => existsOne('电话', '拨号', '短信', '信息', '微信', '小米社区'), 5, 1000);
    // if (!result) {
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
    return;
}

//--------- 重启无障碍 ------//

// 写入服务id
function writingServiceId() {
    let id = getServiceId();
    if (!id) serviceId = id;

    //写入文件
    files.write(serviceId_file, serviceId, "utf-8");
}

// 在已启动无障碍的条件下，查询服务id
function getServiceId() {
    try {
        // Android 8.0+ 标准方式
        if (device.sdkInt >= 26) {
            let am = context.getSystemService("accessibility");
            let services = am.getEnabledAccessibilityServiceList(-1);
            for (let i = 0; i < services.size(); i++) {
                let id = services.get(i).getId();
                if (id.startsWith("org.autojs.autojs6/")) return id;
            }
            return null;
        }

        // Android 7.x 反射调用
        let Settings = android.provider.Settings.Secure;
        let enabledServices = Settings.getString(
            context.getContentResolver(),
            "enabled_accessibility_services"
        );
        let match = enabledServices.match(/org\.autojs\.autojs6\/[\w\.]+/);
        return match ? match[0] : null;
    } catch (e) {
        console.error("查询失败:", e);
        return null;
    }
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
        console.error("若有墓碑、杀后台程序，请加入白名单");
        wait(() => false, 3000);
    }


    // 投影媒体权限
    function checkProjectionPermission() {
        try {
            let appOps = context.getSystemService(context.APP_OPS_SERVICE);
            // 尝试使用 "android:project_media"（部分设备可能不支持）
            let mode = appOps.checkOpNoThrow("android:project_media", android.os.Process.myUid(), context.getPackageName());
            // 如果 "android:project_media" 不可用，尝试回退到其他方式（如 OPSTR_MEDIA_PROJECTION）
            if (mode === undefined || mode === null) {
                mode = appOps.checkOpNoThrow(android.app.AppOpsManager.OPSTR_MEDIA_PROJECTION, android.os.Process.myUid(), context.getPackageName());
            }
            return mode === appOps.MODE_ALLOWED;
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
            //"http://204.ustclug.org", //中科大学
            //"http://noisyfox.cn/generate_204", //社区
        ];
        for (let i = 0; i < urls.length; i++) {
            let timeoutTimes = i < 4 ? 1 : 2;
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
        console.warn('发现已启用高级权限')
        console.warn('可尝试重启无障碍服务')
        console.error('正在重启无障碍服务......')
        console.info('-----------------')
        if (canRestarAuto) {
            log('使用AutoJS6方法重启无障碍服务...')
            try {
                auto.stop();
                wait(() => false, 1000);
                auto.start();
            } catch (e) {}
            try {
                auto(true);
            } catch (e) {}
            wait(() => false, 1000);
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
}




function main() {

    //屏幕点亮
    let m = 10;
    while (!device.isScreenOn() && m--) {
        // 设备激活
        device.wakeUpIfNeeded();
        device.wakeUp();
        wait(() => false, 1000);
    }
    //亮屏
    device.keepScreenDim(maxRuntime);

    //权限验证
    permissionv();

    //屏幕解锁
    unLock();


    // 再次加载悬浮窗控制台配置，以便纠正悬浮窗控制台错误
    consoleShow();

    // 系统修改
    systemSetting();

    // 初始化，文件检查
    init();

    //脚本检查更新
    if (config && config.检查更新 && ableUpdate) {

        checkVersion();
    }

    try {
        // 再次加载悬浮窗控制台配置，以便纠正悬浮窗控制台错误
        consoleShow();
        // throw e;
        //逻辑程序
        run();
        log("      —— 耗时[ " + getDurTime(date) + " ] ——");
        console.warn("—----->--- End ---<-----—");
        //允许息屏信号
        ableScreenOff = 1;
        abnormalInterrupt = 0;
        if (!global.unfinished_mark) {
            // 关闭悬浮窗控制台
            consoleExitOnClose();
        }
        wait(() => false, 1000);

    } catch (e) {
        if (!(e instanceof ScriptInterruptedException)) {
            //通常只有 1 行消息. 
            console.error(e.message);
            console.error(e.stack);
            // 通常有不到 10 
            //exit(e);
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