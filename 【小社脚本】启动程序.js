/*

*****小米社区自动签到脚本*****

原作者  by：PJ小宇
修改    by：风中拾叶
三改    by：wengzhenquan


[github更新地址]：

https://github.com/wengzhenquan/autojs6

*/

auto.waitFor();

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
        //确保只运行一个程序
        exit();
    }
}

try {
    //加载配置
    var config = require("./config.js");
} catch (e) {}
//快速模式. 该模式下会启用控件缓存
if (config && config.fast模式)
    auto.setMode("fast");

var github = "https://github.com/wengzhenquan/autojs6";
var github_download_url = "https://raw.githubusercontent.com/wengzhenquan/autojs6/refs/heads/main/"

var update_script = "【小社脚本】一键更新程序.js";
var serverVersion = null;
var localVersion = null;
var run = null;
var mainFile = null;


//设置参考坐标，不能动，开发环境标准比例。
setScaleBaseX(1080);
setScaleBaseY(2400);

date = nowDate();

var xmPckageName = "com.xiaomi.vipaccount"; // 社区APP包名
var wchatpn = "com.tencent.mm"; //微信包名，用来校验小程序是否打开
var xmVersionName = getAppVersionName(xmPckageName);
var wchatVersionName = getAppVersionName(wchatpn);
//社区APP最低支持跳转入口的版本
var xmAtLeastVersionName = "5.3.2";


// 设备信息
var dwidth = device.width;
var dheight = device.height;
// 获取设备制造商
var manufacturer = android.os.Build.MANUFACTURER;
// 获取设备品牌
var brand = device.brand;

//var jsversion = (engines.myEngine().getSource().getName()
//   .match(/\d[\s\S]*/) || [""])[0];

// 签到未完成标志
var unfinished_mark = 0;
//退出按钮
var window = null;

var delayed = 6; //服务器请求超时时间s
var delayed_max = 15; //最大超时时间 

// 允许息屏信号
var ableScreenOff = 0;
// 程序最大运行时间，超过该时间会强制停止(ms)。  3分钟
var maxRuntime = 3 * 60 * 1000;
startTimeoutMonitor();



//打开悬浮窗控制台
console.reset();
consoleShow();
consoleShow();
console3();
console3();

console.warn("—----->--- Start ---<-----—");
log(("AutoJS6 版本：").padStart(20) + autojs.versionName)
log(("Android 版本：").padStart(20) + device.release)
log(("微信 Ver：") + String(wchatVersionName).padStart(20))
log(("小米社区 Ver：") + String(xmVersionName).padStart(14))
log("制造商：" + manufacturer + "，品牌：" + brand);
log("产品：" + device.product + "，型号：" + device.model);
log(`设备分辨率：${dwidth}x${dheight}`);
log(`现在是：${date}`);

if (config && config.音量键停止) {
    console.error("提示：[音量+/-]键可停止脚本");
    //音量键，停止脚本
    events.setKeyInterceptionEnabled("volume_up", true);
    events.setKeyInterceptionEnabled("volume_down", true);
    events.observeKey();
    events.onKeyDown("volume_up", () => {
        console.error("[音量+]停止脚本！！！");
        exit();
    });
    events.onKeyDown("volume_down", () => {
        console.error("[音量-]停止脚本！！！");
        exit();
    });
}

events.on("exit", function() {
    console.setTouchable(true);
    device.cancelKeepingAwake();
    if (window) window.close();
    floaty.closeAll();
    threads.shutDownAll();
    // verbose(nowDate());
});


//AutoJS6版本检查
checkAutoJS6();
//启动悬浮窗关闭按钮
//stopButton();
threads.start(() => stopButton());



function checkAutoJS6() {
    // 额外兼容6.5.0
    let v650 = autojs.version.isEqual('6.5.0');
    // 最低支持6.6.2
    let vAtLest = autojs.version.isAtLeast('6.6.2');
    if (!(v650 || vAtLest)) {
        console.error('不支持的AutoJS6版本');
        console.error('请升级AutoJS6');
        //wait(()=>false,2000)
        exit();
    }
}


/**
 * 启动脚本总运行时间监控
 * @param {number} maxRuntimeMs - 最大允许运行时间 (毫秒)
 */
function startTimeoutMonitor() {
    threads.start(function() {
        setInterval(function() {
            const startTime = new Date(date.replace(/-/g, '/')).getTime();
            let currentTime = new Date().getTime();
            if (currentTime - startTime > (maxRuntime - 10 * 1000)) {
                ableScreenOff = 1;
                console.error(`脚本运行 ${(maxRuntime)/60/1000} 分钟，强制退出`);
                console.error('可能是兼容性问题，或布局分析问题，导致页面卡住');
                console.error('请截图保存最后卡住的页面，反馈问题。')
                notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("发生未知错误，脚本强制停止\n详细问题，请查看日志"));
                exit();
            }
        }, 5 * 1000); // 每 5 秒检查一次
    });
}



//------------ 工具函数 ----------//

// 点击中心坐标
function clickCenter(obj) {
    if (obj) {
        if (typeof obj === 'string') {
            obj = content(obj);
        }

        if (obj instanceof UiSelector) {
            obj = obj.findOne(1000);
        }

        if (obj && (obj instanceof UiObject)) {
            obj.show();
            sleep(500);
            let x = obj.bounds().centerX()
            let y = obj.bounds().centerY()
            //log(x,y)
            return click(x, y);
        }
    }
    return false;
}

// 有效控件点击，若本控件无法点击，一路寻找到能点击的父控件
function ableClick(obj) {
    if (obj) {
        if (typeof obj === 'string') {
            obj = content(obj);
        }

        if (obj instanceof UiSelector) {
            obj = obj.findOne(1000);
        }

        if (obj && (obj instanceof UiObject)) {
            obj.show();
            sleep(500);
            // click
            let result = obj.click();
            while (!result &&
                !obj.clickable() &&
                obj.parent() &&
                obj.parent().depth() > 0 &&
                obj.parent().indexInParent() > -1) {

                obj = obj.parent();

                // 父控件click
                result = obj.click();
            }
            return result;
        }
    }
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
    } else if (size < Math.pow(1024, 2)) {
        return (size / 1024).toFixed(1) + 'KB';
    } else {
        return (size / Math.pow(1024, 2)).toFixed(1) + 'MB';
    }
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
    window.setPosition(dwidth * 0.1, dheight * 0.75)

    //悬浮窗被关闭时停止脚本
    // window.exitOnClose();
    //  window.action.click(() => window.close());
    let n = 0;
    window.action.click(() => {
        console.error("提示：点击[停止脚本]按钮");
        exit();
        n++;
        window.action.setText("关不掉！x" + n);
    });

    // setInterval(() => {}, 1000);
}



//------------ 悬浮窗控制台区域 ----------//
//打开悬浮窗控制台
function consoleShow() {
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
            exitOnClose: 6e3,
        });

        console.setContentTextColor({
            verbose: 'white',
            log: 'green',
            info: 'yellow',
            warn: 'cyan',
            error: 'magenta'
        });
        if (config && config.悬浮窗控制台字体大小)
            console.setContentTextSize(config.悬浮窗控制台字体大小);

        console.show();
        console3();
    }
}
//悬浮窗控制台变成30%
function console3() {
    if (console.isShowing()) {
        console.setSize(0.96, 0.3);
    }
}
//悬浮窗控制台变成20%
function consoleMin() {
    if (console.isShowing()) {
        console.setSize(0.96, 0.17);
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

//  ----------- 系统修改 ---------------------//
function systemSetting() {
    log("-----→");
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
            // 调用系统锁屏
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

    if (!files.exists("./" + localVersion.run)) {
        console.error("缺失Run文件");
        console.error("启动更新程序下载文件");
        updateScript();
        return;
    }
    // 加载run函数
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
        error = true;
        log("----------------------------");
        log("文件缺失列表：")
        missingFiles.forEach((file) => {
            //根据配置不检查YOLO
            if (!config.本地YOLO识图 &&
                file.toLowerCase().includes('yolo'))
                return;
            console.error(file)
        });
        log("----------------------------");
    }

    let apks = localVersion.apk;
    if (apks) {
        for (var key in apks) {
            let value = apks[key];
            let name = app.getAppName(value);
            if (!name) {
                //根据配置不检查YOLO
                if (!config.本地YOLO识图 &&
                    key.toLowerCase().includes('yolo'))
                    continue;
                console.error(key + " 未安装");
            }
        }
    }
    log("脚本完整性检查结束");
}

// -------- 脚本更新  --------//

//加速代理
let proxys = [

    //  1 
    "https://g.cachecdn.ggff.net/",
    "https://gh.catmak.name/",
    "https://g.blfrp.cn/", //
    "https://ghproxy.monkeyray.net/",
    "https://gh.b52m.cn/",
    "https://gh.llkk.cc/",
    "https://gp-us.fyan.top/",
    "https://hub.gitmirror.com/",
    "https://gh.xxooo.cf/",
    "https://gh.qninq.cn/",

    //2
    // "https://j.1win.ddns-ip.net/",
    // "https://tvv.tw/",
    // "https://j.1win.ip-ddns.com/",
    // "https://j.1win.ggff.net/",
    // "https://github.kkproxy.dpdns.org/",
    // "https://ghpxy.hwinzniej.top/",
    // "https://ghproxy.imciel.com/",

]


// 检查脚本更新，version文件存在才检查更新。
function checkVersion() {
    console.info("---→>→脚本检查更新←<←---")

    let down_version = false;
    // 乱序数组
    let arr = getRandomNumbers(proxys.length - 1);

    //远程version文件数据
    log("正在查询版本更新……")
    for (let i = 0; i < proxys.length; i++) {
        let url = proxys[arr[i]] +
            github_download_url +
            'version' +
            '?t=' + new Date().getTime();

        let result = null;
        let thread = threads.start(() => {
            try {
                let res = http.get(url, {
                    timeout: 3 * 1000,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        "Connection": "Keep-Alive"
                    }
                });
                if (res && res.statusCode === 200) {
                    result = res.body.string();
                    serverVersion = JSON.parse(result);
                }
            } catch (e) {}
        });
        thread.join(3 * 1000);
        thread.interrupt();
        if (!result || result.length < 300 || !serverVersion) {
            continue;
        }
        if (!files.exists("./version")) {
            down_version = true;
            // 缺失version文件，下载
            files.write("./version", result, "utf-8");
            //重新加载本地版本文件
            loadLocalVersion();
        }
        break;

    }

    if (files.exists("./version")) {
        //本地版本信息
        console.error("本地脚本版本：" + localVersion.version)
    }
    if (!serverVersion) {
        console.error("连接github更新失败")
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
        console.info("当前版本：" + localVersion.version)
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
        console.error("脚本已经是最新版！")
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
        let arr = getRandomNumbers(proxys.length - 1);
        // 下载更新脚本
        var file = null;
        for (let i = 0; i < proxys.length; i++) {
            let url = proxys[arr[i]] +
                github_download_url +
                update_script +
                '?t=' + new Date().getTime();

            log('使用加速器：' + proxys[arr[i]]);
            //log(url);

            let thread = threads.start(() => {
                try {
                    let res = http.get(url, {
                        timeout: 5 * 1000,
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                            "Connection": "Keep-Alive"
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
    // 等待脚本执行完成
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
        for (i = 0; i < 2; i++) {
            gesture(300 * (2 - i), [dwidth * 3 / 8, dheight * (0.95 - 0.3 * i)], [dwidth * 3 / 8, dheight * (0.3 - 0.1 * i)]);
            wait(() => false, 500)
            swipe(dwidth * 5 / 8, dheight * 0.95, dwidth * 5 / 8, dheight * (0.6 - 0.2 * i), 200 * (i + 1));
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
                if (textContains('混合').exists()) {
                    log("→数字密码(混合密码)解锁");
                } else {
                    log("→数字密码解锁");
                }

                for (let i = 0; i < config.锁屏数字密码.length; i++) {
                    let num = content(config.锁屏数字密码[i]).findOne(800);
                    clickCenter(num);
                    wait(() => false, 300);
                }
                if (textContains('混合').exists()) {
                    clickCenter(desc('回车').findOne(1000));
                }
            }
            wait(() => false, 666);
        }

        //去桌面
        for (i = 0; i < 3; i++) {
            wait(() => false, 300);
            home();
        }
        wait(() => false, 666);

        //更新锁屏状态
        isLocked = KeyguardManager.isKeyguardLocked();

    }
    //let result = wait(() => existsOne('电话', '拨号', '短信', '信息', '微信', '小米社区'), 5, 1000);
    // if (!result) {
    if (isLocked) {
        console.error("屏幕解锁失败！！！");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String('屏幕解锁失败了！'));
        exit();
    }
    log("屏幕解锁成功！！！(∗❛ั∀❛ั∗)✧*。");
    return;
}



// 权限验证
function permissionv() {

    console.info(">>>>>>→权限验证←<<<<<<")
    log("--------- 必要权限 ---------");
    // 无障碍权限

    if (auto.service) {
        log("无障碍服务，[已启用]");
    } else {
        console.error("无障碍服务，[已启用，但未运行]!");
        console.error("1、确保开启'忽略电池优化'[系统节电设置]");
        console.error("2、重新启用无障碍服务");
        console.error("3、重启手机");
        exit();
    }

    //悬浮窗权限
    if (autojs.canDisplayOverOtherApps()) {
        log("悬浮窗权限，[已启用]");
    } else {
        console.error("悬浮窗权限，[未启用]!");
        console.error("或：显示在其它应用上层");
        exit();
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
        exit();
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
            "http://wifi.vivo.com.cn/generate_204", // vivo
            "http://connect.rom.miui.com/generate_204", // 小米
        ];
        for (i = 0; i < urls.length; i++) {
            let url = urls[i];
            let res = null;
            let thread = threads.start(() => {
                try {
                    res = http.get(url, {
                        timeout: 500
                    });

                } catch (e) {}
            });
            thread.join(500);
            thread.interrupt();
            if (res && res.statusCode === 204)
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


    log("-------- 不必要权限 --------");
    // Shizuku权限检测
    if (shizuku.running) {
        // if (shizuku.hasPermission()) {
        log("Shizuku授权，[已启用]");
    } else {
        log("Shizuku授权，[未启用]!");
    }

    if (autojs.isRootAvailable()) {
        log("Root授权，[已启用]");
    } else {
        log("Root授权，[未启用]!");
    }



    // exit();
}




function main() {

    //屏幕点亮
    while (!device.isScreenOn()) {
        device.wakeUpIfNeeded();
        device.wakeUp();
        wait(() => false, 1000);
    }
    //亮屏
    device.keepScreenDim(maxRuntime);

    //屏幕解锁
    unLock();

    //权限验证
    permissionv();

    // 系统修改
    systemSetting();

    // 初始化，文件检查
    init();

    //脚本检查更新
    if (config && config.检查更新) checkVersion()

    try {
        //逻辑程序
        run();
        log("      —— 耗时[ " + getDurTime(date) + " ] ——");
        console.warn("—----->--- End ---<-----—");
        //允许息屏信号
        ableScreenOff = 1;

    } catch (e) {
        if (!(e.javaException instanceof ScriptInterruptedException)) {
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