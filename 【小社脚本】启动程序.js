/*

*****小米社区自动签到脚本*****

原作者  by：PJ小宇
修改    by：风中拾叶
三改    by：wengzhenquan

@version 20250516
yolov11_w.js @version 20250513

[github更新地址]：

https://github.com/wengzhenquan/autojs6

*/
var github = "https://github.com/wengzhenquan/autojs6";
var update_script_name = "【小社脚本】一键更新程序.js";
var serverVersion = null;
var localVersion = null;
var run = null;
var mainFile = null;

// 引入配置文件
var config = require("./config.js");
//设置参考坐标，不能动，开发环境标准比例。
setScaleBaseX(1080);
setScaleBaseY(2400);

date = nowDate();

var xmPckageName = "com.xiaomi.vipaccount"; // 社区APP包名
var wchatpn = "com.tencent.mm"; //微信包名，用来校验小程序是否打开
var xmVersionName = getAppVersionName(xmPckageName);
var wchatVersionName = getAppVersionName(wchatpn);
//社区APP最低支持跳转入口的版本
var xmAtLeastVersionName = "5.3.2"


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

var delayed = 6; //服务器请求超时时间s
var delayed_max = 15; //最大超时时间 

//启动悬浮窗关闭按钮
//stopButton();
threads.start(() => stopButton());

//打开悬浮窗控制台
console.reset();
consoleShow();
consoleShow();
//consoleShow();

log("—----->--- Start ---<-----—");
log(("AutoJS6 版本：").padStart(21) + autojs.versionName)
log(("Android 版本：").padStart(21) + device.release)
log(("微信 Ver：") + String(wchatVersionName).padStart(20))
log(("小米社区 Ver：") + String(xmVersionName).padStart(14))
log("制造商：" + manufacturer + "，品牌：" + brand);
log("产品：" + device.product + "，型号：" + device.model);
log(`设备分辨率：${dwidth}x${dheight}`);
log(`现在是：${date}`);
console.error("提示：[音量+/-]键可停止脚本运行");

//音量键，停止脚本
events.setKeyInterceptionEnabled("volume_up", true);
events.setKeyInterceptionEnabled("volume_down", true);
events.observeKey();
events.onKeyDown("volume_up", () => {
    console.error("[音量+]停止脚本！！！");
    console.setTouchable(true);
    //console.hide();
    exit();
    console.error("3…2…1…停！哎~快停！");
});
events.onKeyDown("volume_down", () => {
    console.error("[音量-]停止脚本！！！");
    console.setTouchable(true);
    //console.hide();
    exit();
    console.error("3…2…1…停！哎~快停！");
});

// 确保临时工作目录存在
files.ensureDir('./tmp/')

//sleep(500);
//exit()


//------------ 工具函数 ----------//

// 点击中心坐标
function clickCenter(obj) {
    let x = obj.bounds().centerX()
    let y = obj.bounds().centerY()
    //log(x,y)
    return click(x, y);
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
// 格式化后的实时时间
function nowDate() {
    return formatDate(new Date());
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
        var packageInfo = context.getPackageManager()
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

function formatFileSize(size) {
    if (size < 1024) {
        return size + 'B';
    } else if (size < Math.pow(1024, 2)) {
        return (size / 1024).toFixed(1) + 'KB';
    } else {
        return (size / Math.pow(1024, 2)).toFixed(1) + 'MB';
    }
}


//------------ 悬浮窗控制台区域 ----------//
//打开悬浮窗控制台
function consoleShow() {
    if (config.悬浮窗控制台) {
        //悬浮窗控制台配置
        // console.reset();
        console.build({
            // size: [0.96, 0.3],
            position: [0.02, 0.02],
            title: '会装逼的控制台',
            titleTextSize: 20,
            titleTextColor: 'green',
            titleIconsTint: 'yellow',
            titleBackgroundAlpha: 0.8,
            titleBackgroundColor: 'dark-blue',
            // titleBackgroundTint: 'dark-blue', //6.5.0版本没有
            contentTextSize: 15,
            contentBackgroundAlpha: 0.8,
            touchable: false,
            exitOnClose: 6e3,
        });

        console.setContentTextColor({
            verbose: 'white',
            log: 'green',
            info: 'blue',
            warn: 'yellow',
            error: 'red'
        });
        console3();
        console.show();
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
        console.setSize(0.96, 0.2);
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

//------------ 左下角“停止脚本”按钮 ----------//
//悬浮窗停止按钮
function stopButton() {
    var window = floaty.window(
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
        exit();
        n++;
        window.action.setText("关不掉！x" + n);
    });

    // setInterval(() => {}, 1000);
}

// -----------程序完整性检查---------------------//
function init() {
    log(">>>>→程序完整性校验←<<<<")

    if (!files.exists("./version")) {
        console.error("缺失version文件");
        console.error("启动更新程序下载文件");
        updateScript();
        return;
    }
    localVersion = JSON.parse(files.read("./version"));

    let runFile = "./" + localVersion.run;
    if (!files.exists(runFile)) {
        console.error("缺失Run文件");
        console.error("启动更新程序下载文件");
        updateScript();
        return;
    }
    // 加载run函数
    run = require("./" + localVersion.run);

    if (localVersion.updateScript) {
        update_script_name = localVersion.updateScript;
    }
    if (localVersion.main) {
        mainFile = localVersion.main;
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
            missingFiles.push;
        }
    }
    let error = false;
    if (missingFiles.length > 0) {
        error = true;
        log("----------------------------");
        log("文件缺失列表：")
        forEach((file) => console.error(file));
        log("----------------------------");
    }

    let apks = localVersion.apk;

    if (apks) {
        for (var key in apks) {
            let value = apks[key];
            let name = getAppName(value);
            if (!name) {
                console.error(value + " 未安装");
            }

        }
    }

    log("文件检查结束");


}

// -------- 脚本更新  --------//

var proxys = [
    "https://gh.llkk.cc/",
    "https://git.886.be/",
    "https://ghfast.top/",
    "https://github.fxxk.dedyn.io/",
    "https://gh-proxy.ygxz.in/",

    "https://github.moeyy.xyz/", //有缓存
    "https://gh-proxy.com/", //缓存时间长
]

// 检查脚本更新，version文件存在才检查更新。
function checkVersion() {
    console.info("---→>→脚本检查更新←<←---")
    //本地不存在version文件，不检查更新
    if (!files.exists("./version")) {
        console.error("缺失version文件，无法检查更新")
        return;
    }

    //本地版本信息
    let localVersion = JSON.parse(files.read("./version"));
    console.info("脚本版本：" + localVersion.version)


    // 乱序数组
    let arr = getRandomNumbers(proxys.length - 1);

    //远程version文件数据
    for (let i = 0; i < proxys.length; i++) {
        //let startTime = new Date().getTime();
        let url = proxys[arr[i]] +
            "https://raw.githubusercontent.com/wengzhenquan/autojs6/refs/heads/main/version";

        try {
            let thread = threads.start(() => {
                try {
                    serverVersion = http.get(url, {
                        timeout: 5 * 1000,
                    }).body.json();
                } catch (e) {}
            });
            thread.join(5 * 1000);
            thread.interrupt();
        } catch (e) {} finally {
            // log(proxy[i])
            // let time = (new Date().getTime() - startTime);
            //  log("服务器请求时间：" + time + " ms");
            if (serverVersion) {
                break;
            }
        }
    }
    if (!serverVersion) {
        console.error("连接github更新失败")
        return;
    }

    let hasNewVersion = compareVersions(serverVersion.version, localVersion.version) > 0;
    let updateList = []; // 待更新文件清单
    let deleteList = []; // 待删除文件清单

    //更新脚本
    if (hasNewVersion && config.检查更新 > 1) {
        toastLog("配置[检查更新]：" + config.检查更新)
        toastLog("开始更新脚本")
        updateScript();
    }

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

    if (hasNewVersion) {
        notice({
            title: '小社脚本有新的版本！！！🎊v' + serverVersion.version,
            content: '脚本运行日志里有更新清单\n点击此处去更新🌐',
            intent: {
                action: "android.intent.action.VIEW",
                data: github
            },
            autoCancel: true
        });
        console.warn("有新的版本！！！")
        console.info("当前版本：" + localVersion.version)
        console.info("最新版本：" + serverVersion.version)
        console.log("-----→");
        console.error("增量更新列表：")
        if (updateList.length > 0) {
            log("----------------------------");
            console.log("需要更新的文件清单:");
            updateList.forEach((file) => {
                let name = !file.includes('/') ? ''.padStart(5) + file : file;
                console.error(name);
                if (file === 'config.js') {
                    log('(更新前，建议重命名config.js，')
                    log('              备份解锁坐标)')
                }
            });
            log("----------------------------");
        }
        if (deleteList.length > 0) {
            log("----------------------------");
            console.log("需要删除的文件清单:");
            deleteList.forEach((file) => {
                let name = !file.includes('/') ? ''.padStart(5) + file : file;
                console.error(name);
            });
            log("----------------------------");
        }
    } else {
        console.info("脚本已经是最新版！")
        // log("小社脚本版本：" + localVersion.version)
    }
}

function updateScript() {
    let update_script = update_script_name;
    if (serverVersion && serverVersion.updateScript)
        update_script = serverVersion.updateScript;
    log("更新一键更新程序：" + update_script)

    // 乱序数组
    let arr = getRandomNumbers(proxys.length - 1);
    // 下载更新脚本
    var filebytes = null;
    for (let i = 0; i < proxys.length; i++) {
        let url = proxys[arr[i]] + github +
            "/blob/main/" + update_script;

        log('使用加速器：' + proxys[arr[i]]);
        // log(url);
        try {
            var res = null;
            let thread = threads.start(() => {
                try {
                    res = http.get(url, {
                        timeout: 5 * 1000,
                    });
                } catch (e) {}
            });
            thread.join(5 * 1000);
            thread.interrupt();
            if (res.statusCode === 200) {
                filebytes = res.body.bytes();
            }
        } catch (e) {} finally {
            //成功，跳出
            if (filebytes && filebytes.length > 1000) {
                break;
            }
            console.error('下载失败，更换加速器重试');
        }
    }

    if (filebytes && filebytes.length > 1000) {
        files.writeBytes("./" + update_script, filebytes);
        console.info("下载成功")
        console.info('文件大小：' + formatFileSize(filebytes.length))
    }
    if (!files.exists("./" + update_script)) {
        console.error('更新程序更新失败');
        console.error(update_script + ' 不存在，无法更新');
        return;
    }

    console.error("提示：启动→" + update_script)
    device.keepScreenDim(5 * 60 * 1000);
    for (let i = 0; i < 15; i++) {
        floaty.closeAll();
        log('→起飞'.padStart(i * 2 + 2, '-'));
        if (i > 10) console.hide();
    }
    // 执行一键更新程序.js
    engines.execScriptFile("./" + update_script);
    // 等待脚本执行完成
    sleep(1000)
    while (files.exists('./tmp/update_locked'));
    sleep(1000)
    let newscript = serverVersion.main;
    console.info("即将执行新的脚本：" + newscript)
    console.error("提示：启动→" + newscript)
    for (let i = 0; i < 15; i++) {
        log('→起飞'.padStart(i * 2 + 2, '-'));
    }
    engines.execScriptFile("./" + newscript);

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
    console.info("设备已锁定！！！");
    console.info("启动解锁程序……");

    log(">>>>>>>→设备解锁←<<<<<<<")

    log("开始解锁设备……");
    //多次上滑
    for (i = 0; i < 2; i++) {
        swipe(dwidth * 5 / 8, dheight * 0.99, dwidth * 5 / 8, dheight * (0.6 - 0.2 * i), 200 * (i + 1));
        gesture(300 * (2 - i), [dwidth * 3 / 8, dheight * (0.99 - 0.3 * i)], [dwidth * 3 / 8, dheight * (0.3 - 0.1 * i)]);
        wait(() => false, 100)
    }
    log("上滑成功！");
    for (i = 0; i < 3; i++) {
        wait(() => false, 300);
        home();
    }
    wait(() => false, 666);

    //解锁
    // while (!existsOne('电话', '拨号', '短信', '信息', '微信', '小米社区')) {
    let n = 0;
    while (isSecure && isLocked) {
        if (config.解锁方式 === 1) {
            log("→图案解锁");
            gesture(600, config.锁屏图案坐标);
        } else if (config.解锁方式 === 2) {
            log("→数字密码解锁");
            for (let i = 0; i < config.锁屏数字密码.length; i++) {
                let num = content(config.锁屏数字密码[i]).findOne();
                // while (!num.clickable()) num = num.parent();
                // num.click();
                clickCenter(num);
                wait(() => false, 300);
            }
        }
        for (i = 0; i < 3; i++) {
            wait(() => false, 300);
            home();
        }
        wait(() => false, 666);
        //更新锁屏状态
        isLocked = KeyguardManager.isKeyguardLocked();

        n++;
        if (n > 3) break;
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

    log(">>>>>>>→权限验证←<<<<<<<")
    log("--------- 必要权限 ---------");
    // 无障碍权限
    auto.waitFor();

    if (auto.service) {
        log("无障碍服务，[已启用]");
    } else {
        console.error("无障碍服务，[已启用，但未运行]!");
        console.error("1、确保开启'忽略电池优化'[系统节电设置]");
        console.error("2、重新启用无障碍服务");
        console.error("3、重启手机");
        exit();
    }

    // 通知权限
    importClass(android.app.NotificationManager);
    importClass(android.content.Context);
    // 获取通知管理器实例
    var notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE);
    // 判断通知是否被启用
    var isNotificationEnabled = notificationManager.areNotificationsEnabled();
    if (isNotificationEnabled) {
        log("发送通知权限，[已启用]");
    } else {
        console.error("发送通知权限，[未启用]!");
        //去设置
        notice.launchSettings();
        exit();
    }

    // 通知权限6.6.2版本修复
    // 判断通知是否被启用
    // if (notice.isEnabled()) {
    //     log("发送通知权限，[已启用]");
    // } else {
    //     toast("发送通知权限，[未启用]!");
    //     console.error("发送通知权限，[未启用]!");
    //     //去设置
    //     notice.launchSettings();
    //     exit();
    // }

    //悬浮窗权限
    if (autojs.canDisplayOverOtherApps()) {
        log("悬浮窗权限，[已启用]");
    } else {
        console.error("悬浮窗权限，[未启用]!");
        console.error("或：显示在其它应用上层");
        exit();
    }

    // 投影媒体权限
    importClass(android.app.AppOpsManager);
    try {
        function checkProjectionPermission() {
            let appOps = context.getSystemService(context.APP_OPS_SERVICE);
            let mode = appOps.checkOpNoThrow("android:project_media", android.os.Process.myUid(), context.getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        }
        if (checkProjectionPermission()) {
            log("投影媒体权限，[已启用]");
        } else {
            console.error("投影媒体权限，[未启用]！");
            console.error("无法全自动完成所有流程！");
            wait(() => false, 3000);
        }
    } catch (e) {
        console.error("投影媒体权限，检查失败！");
        console.error("需要用户自行判断是否开启！");

    }

    // 后台弹出界面权限
    //importClass(android.app.AppOpsManager);
    importClass(android.os.Build);
    importClass(android.net.Uri);
    importClass(android.content.pm.PackageManager);
    importClass(android.os.Process);

    function checkBackgroundStartPermission() {
        try {
            if (manufacturer === "Xiaomi") {
                let appOps = context.getSystemService(context.APP_OPS_SERVICE);
                return appOps.checkOpNoThrow(10021, Process.myUid(), context.getPackageName()) == AppOpsManager.MODE_ALLOWED;
            } else if (manufacturer === "Vivo") {
                let uri = Uri.parse("content://com.vivo.permissionmanager.provider.permission/start_bg_activity");
                let cursor = context.getContentResolver().query(uri, null, "pkgname = ?", [context.getPackageName()], null);
                if (cursor != null && cursor.moveToFirst()) {
                    let state = cursor.getInt(cursor.getColumnIndex("currentstate"));
                    cursor.close();
                    return state == 0;
                }
                return false;
            } else if (manufacturer === "Oppo") {
                return context.getPackageManager().checkPermission("android.permission.SYSTEM_ALERT_WINDOW", context.getPackageName()) == PackageManager.PERMISSION_GRANTED;
            } else {
                let appOps = context.getSystemService(context.APP_OPS_SERVICE);
                return appOps.checkOpNoThrow(AppOpsManager.OPSTR_START_FOREGROUND, Process.myUid(), context.getPackageName()) == AppOpsManager.MODE_ALLOWED;
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
        log("修改系统设置授权，[已启用]");
    } else {
        console.error("修改系统设置授权，[未启用]!");
        console.error("涉及功能：媒体静音、修改亮度！");
    }


    function checkNetworkPermission() {
        let urls = [
            "http://connectivitycheck.platform.hicloud.com/generate_204", // 华为
            "http://wifi.vivo.com.cn/generate_204", // vivo
            "http://connect.rom.miui.com/generate_204", // 小米
        ];
        for (i = 0; i < urls.length; i++) {
            try {
                let url = urls[i];
                let thread = threads.start(() => {
                    try {
                        res = http.get(url, {
                            timeout: 500
                        });
                    } catch (e) {}
                });
                thread.join(500);
                thread.interrupt();
                if (res.statusCode === 204) return true;
                continue;
            } catch (e) {
                if (i === (urls.length - 1))
                    return false;
            }
        }
        return false;
    }

    if (checkNetworkPermission()) {
        log("网络权限，[可联网]");
    } else {
        console.error("网络权限，[无法联网]!");
        console.error("可能无法完成APP识图签到！");
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
    //两分钟亮屏
    device.keepScreenDim(2 * 60 * 1000);

    //屏幕解锁
    unLock();

    //权限验证
    permissionv();

    //脚本检查更新
    if (config.检查更新) checkVersion()

    log("-----→");
    // 媒体声音
    let musicVolume = device.getMusicVolume();
    // 通知声音
    let nVolume = device.getNotificationVolume();
    if (config.静音级别) {
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
    if (config.运行亮度) {
        device.setBrightnessMode(0);
        let value = 130 * config.运行亮度;
        device.setBrightness(value);
        console.error("提示：已修改亮度为：" + config.运行亮度 * 100 + "%");

    }

    events.on("exit", function() {
        console.setTouchable(true);
        device.cancelKeepingAwake();
        // floaty.closeAll();
        //verbose(nowDate());
        if (config.运行亮度) {
            device.setBrightness(bright);
            device.setBrightnessMode(brightMode);
        }
        if (config.静音级别) {
            if (config.静音级别 === 1)
                device.setMusicVolume(musicVolume);
            if (config.静音级别 === 2)
                device.setNotificationVolume(nVolume);
        }
        if (config.结束震动)
            device.vibrate(config.结束震动);
    });

    // 初始化，文件检查
    init();

    try {
        //逻辑程序
        run();
    } catch (e) {
        if (!(e.javaException instanceof ScriptInterruptedException)) {
            //通常只有 1 行消息. 
            console.error(e.message);
            // 通常有不到 10 
            //exit(e);
        }
    } finally {
        if (true) {
            //  floaty.closeAll()

            if (config.运行亮度)
                console.error("提示：亮度已恢复！");
            if (config.静音级别) {
                if (config.静音级别 === 1)
                    console.error("提示：媒体静音已解除！");
                if (config.静音级别 === 2)
                    console.error("提示：通知静音已解除！");
            }
            if (config.结束震动)
                console.error("提示：结束震动提醒~~~");

            log(0);

            try {
                exit();
            } catch (e) {}
        }
    }

}

main();