/*

*****小米社区自动签到脚本*****

原作者  by：PJ小宇
修改    by：风中拾叶
三改    by：wengzhenquan
版本号：v3.6.1

yolov11_w.js 版本号：v2

[github更新地址]：

https://github.com/wengzhenquan/autojs6

*/
var github = "https://github.com/wengzhenquan/autojs6";
var update_script_name = "【小社脚本】一键更新程序.js";
var serverVersion = null;

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

var YOLO_MODULE_PATH2 = "./yolov11/yolov11_w.js"; // YOLOv11 模块路径
var YOLO_PLUGIN_NAME2 = "com.circlefork.yolo"; // 插件包名
var YOLO_MODEL_SUBDIR2 = "./yolov11/model";
var CAPTURE_PIC_PATH = "./tmp/pic.png"; // 验证码截图路径
var yoloProcessor = null; // 初始化为 null
var enlocalYOLO = false;

// 滑块的四周坐标
var sliderRegion;
var centerX;
var centerY;
var rX;
var percentage;

// 设备信息
var dwidth = device.width;
var dheight = device.height;
// 获取设备制造商
var manufacturer = android.os.Build.MANUFACTURER;
// 获取设备品牌
var brand = device.brand;

var jsversion = (engines.myEngine().getSource().getName()
    .match(/\d[\s\S]*/) || [""])[0];

// 签到未完成标志
var unfinished_mark = 0;

var delayed = 6; //服务器请求超时时间s
var delayed_max = 15; //最大超时时间

//打开悬浮窗控制台
console.reset();
consoleShow();
consoleShow();
//consoleShow();

log("—-----★--- Start ---★-----—");
log(("小社脚本 版本：").padStart(17) + jsversion)
log(("AutoJS6 版本：").padStart(21) + autojs.versionName)
log(("Android 版本：").padStart(21) + device.release)
log(("微信 Ver：") + String(wchatVersionName).padStart(20))
log(("小米社区 Ver：") + String(xmVersionName).padStart(14))
log("制造商：" + manufacturer + "，品牌：" + brand);
log("产品：" + device.product + "，型号：" + device.model);
log(`设备分辨率：${dwidth}x${dheight}`);
log(`现在是：${date}`);
console.error("提示：[音量+]键可停止脚本运行");

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

//------------ 成长值记录对象 ----------//
// 记录成长值对象
const 成长值记录 = {
    // 只需赋值这三个，特别是详细记录，是数组，存放 “记录” 对象
    当前成长值: 0,
    升级目标: 0,
    详细记录: [],
    // 计算函数
    距离升级还需() {
        return (this.升级目标 - this.当前成长值);
    },
    当前等级() {
        return level段(this.当前成长值);
    },
    今日获得() {
        let total = this.详细记录.reduce((叠加量, 记录) => {
            return 叠加量 + 记录.值();
        }, 0);
        return total;
    },
    // 新添加的方法
    addAndUpdate(new记录) {
        const existingRecord = this.详细记录.find((record) => record.项目 === new记录.项目);
        if (!existingRecord) {
            // 没有找到，当成新增处理
            this.详细记录.push(new记录);
        } else {
            // 找到了，对比值，把对象里的“结果”值改成“值”更大的那个
            const existingValue = existingRecord.值();
            const newValue = new记录.值();
            if (newValue > existingValue) {
                existingRecord.结果 = new记录.结果;
            }
        }
    }
};

function 记录() {
    this.项目 = "每日签到";
    this.结果 = "+1";
    this.值 = function() {
        return parseInt(this.结果.replace("+", ""));
    };
};

// 级别划分
function level段(n) {
    if (n < 50) return "1段";
    if (n < 200) return "2段";
    if (n < 500) return "3段";
    if (n < 1000) return "4段";
    if (n < 3000) return "5段";
    if (n < 6000) return "6段";
    if (n < 15000) return "7段";
    if (n < 30000) return "8段";
    if (n < 50000) return "9段";
    return "10段";
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
            contentTextSize: 16,
            contentBackgroundAlpha: 0.8,
            touchable: false,
            exitOnClose: 6e3,
        });

        //console.setContentTextColor({log: 'green'});
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

//悬浮窗控制台调节高
function consoleH(h) {
    if (console.isShowing()) {
        console.setSize(0.96, h);
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
    console.info("---→>★脚本检查更新★<←---")
    //本地不存在version文件，不检查更新
    if (!files.exists("./version")) {
        console.error("缺失version文件，无法检查更新")
        return;
    }

    //本地版本信息
    let localVersion = JSON.parse(files.read("./version"));

    // if (jsversion !== localVersion.version) {
    //     console.error("version文件与当前脚本不匹配")
    //     console.log("脚本版本：" + jsversion)
    //     console.log("version版本：" + localVersion.version)
    //     console.log("无法检查更新")
    //     console.log("请自行更新到匹配的版本")
    //     return;
    //     //exit();
    // }


    // 乱序数组
    let arr = getRandomNumbers(proxys.length - 1);


    for (let i = 0; i < proxys.length; i++) {
        //let startTime = new Date().getTime();
        let url = proxys[arr[i]] +
            "https://raw.githubusercontent.com/wengzhenquan/autojs6/refs/heads/main/version";

        try {
            let thread = threads.start(() => {
                try {
                    serverVersion = http.get(url, {
                        timeout: 3 * 1000,
                    }).body.json();
                } catch (e) {}
            });
            thread.join(3 * 1000);
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
                let name = !file.includes('/') ? ''.padStart(10) + file : file;
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
                let name = !file.includes('/') ? ''.padStart(10) + file : file;
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
    var filebytes = null;
    for (let i = 0; i < proxys.length; i++) {
        let url = proxys[arr[i]] +
            "https://github.com/wengzhenquan/autojs6/blob/main/" +
            update_script;

        log('使用加速器：' + proxys[arr[i]]);
        // log(url);
        try {
            var res = null;
            let thread = threads.start(() => {
                try {
                    res = http.get(url, {
                        timeout: 3 * 1000,
                    });
                } catch (e) {}
            });
            thread.join(3 * 1000);
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

//------------ 识图签到初始化 ----------//

// --- 初始化识图模块 ---
function initImageReco() {
    log(">>>>★识图签到初始化★<<<<")
    if (files.exists(YOLO_MODULE_PATH2)) {
        try {
            console.info("发现YOLO本地文件")
            console.info("开始加载本地识图模块")
            let name = getAppName(YOLO_PLUGIN_NAME2);
            let error = false;
            if (!name) {
                console.error("Yolo-plugin.apk 插件未安装");
                error = true;
            }
            let yzmbin = YOLO_MODEL_SUBDIR2 + "/yzm.bin";
            if (!files.exists(yzmbin)) {
                console.error(yzmbin + " 文件缺失");
                error = true;

            }
            let yzmparam = YOLO_MODEL_SUBDIR2 + "/yzm.param";
            if (!files.exists(yzmparam)) {
                console.error(yzmparam + " 文件缺失");
                error = true;

            }
            if (error) throw '';

            // 加载 YOLO 模块
            console.info("----→>★加载YOLO★<←----")
            yoloProcessor = require(YOLO_MODULE_PATH2);
            if (typeof yoloProcessor !== 'function') {
                throw new Error(`模块 ${YOLO_MODULE_PATH} 未导出函数`);
            }
            enlocalYOLO = true;
            console.info("YOLO 模块加载成功");
        } catch (e) {
            console.error(`加载本地 YOLO 模块失败: ${e}`);
            console.error(`将使用服务器识图！`);
        }
    }
    if (!enlocalYOLO) {
        console.info("启用服务器识图签到");
        //提前开始异步校验服务器，删除无效的服务器，确保签到认证时，服务器可用。
        threads.start(() => webTest());
    }
}

// 服务器校验
function webTest() {
    let sum_old = urls.length;
    let delayed_test;
    let startTime = new Date().getTime();
    for (let j = urls.length - 1; j > -1; j--) {
        let url = urls[j];
        switch (true) {
            case url.includes("clawc"):
                delayed_test = 3
                break;
            case url.includes("xcjd"):
                delayed_test = 1
                break;
            default:
                delayed_test = 0.6
        }

        let res;
        try {
            let thread = threads.start(() => {
                try {
                    res = http.get(url, {
                        timeout: delayed_test * 1000
                    });
                } catch (e) {}
            });
            // AutoJS 6.5.0版本超时时间无效，改用线程方式
            thread.join(delayed_test * 1000);
            thread.interrupt();
            res.body.json();
        } catch (e) {
            // log('删除：'+url)
            //删除不能用的服务器
            urls.splice(j, 1);
        }
    }
    let time = (new Date().getTime() - startTime);
    console.info("提示：识图服务器准备就绪");
    console.info("检查服务器耗时：" + time + " ms");
    console.info('可用服务器数量：' + urls.length + '/' + sum_old);
    //传递消息给主线程
    sum.setAndNotify(urls.length);

}

var sum = threads.disposable();
let urls = [
    "http://strz.wengzq.v6.rocks/upload", //0
    "http://strz.wzq.dpdns.org/upload", //1
    "http://strz.wzqw.zone.id/upload", //2

    "http://xmst.wengzq.v6.rocks/upload", //3
    "http://xmst.wzq.dpdns.org/upload", //4
    "http://xmst.wzqw.zone.id/upload", //5

    //001俄勒冈
    "http://xcjd.wengzq.v6.rocks/upload", //6
    "http://xcjd.wzq.dpdns.org/upload", //7
    "http://xcjd.wzqw.zone.id/upload", //8

    //clawcloud run 
    "https://xcjdcf.clawc.dpdns.org/upload", //9
    "https://ijakryikwhug.ap-southeast-1.clawcloudrun.com/upload", // 10


    "http://up.kuandana.v6.rocks/upload", //11
    "http://up.风中拾叶.top/upload", //12

];

//------------ 业务逻辑开始 ----------//
//解锁
function unLock() {
    log(">>>>>>>★设备解锁★<<<<<<<")
    device.keepScreenDim(60 * 1000);
    log("开始解锁设备……");
    //多次上滑
    for (i = 0; i < 2; i++) {
        swipe(dwidth * 5 / 8, dheight * 0.99, dwidth * 5 / 8, dheight * (0.6 - 0.2 * i), 200 * (i + 1));
        gesture(300 * (2 - i), [dwidth * 3 / 8, dheight * (0.99 - 0.3 * i)], [dwidth * 3 / 8, dheight * (0.3 - 0.1 * i)]);
        sleep(100)
    }
    log("上滑成功！");
    for (i = 0; i < 3; i++) {
        sleep(300);
        home();
    }
    sleep(666);

    let n = 0;
    while (!existsOne('电话', '拨号', '短信', '信息', '微信', '小米社区')) {
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

        n++;
        if (n > 3) break;
    }

    let result = wait(() => existsOne('电话', '拨号', '短信', '信息', '微信', '小米社区'), 5, 1000);
    if (!result) {
        console.error("屏幕解锁失败！！！");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String('屏幕解锁失败了！'));
        exit();
    }
    log("屏幕解锁成功！！！(∗❛ั∀❛ั∗)✧*。");
    return;
}

//关闭程序
function killAPP(packageN) {
    log(">>>>>★关闭社区APP★<<<<<")
    app.openAppSetting(packageN);
    sleep(600)
    let i = 0;
    while (!existsOne(text("结束运行"), text("强行停止"))) {
        if (text("应用详情").exists()) {
            back();
            sleep(500);
            break;
        }
        app.openAppSetting(packageN);
        i++;
        sleep(600);
        if (i > 3) {
            console.error("打开应用详情页失败了！");
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String('打开应用详情页失败了！'));
            exit();
        }
    }

    click("结束运行");
    click("强行停止");
    sleep(500);
    while (click("确定"));
    toastLog("关闭小米社区！！！", "forcible");

}

//打开程序
function launchAPP(packageN) {
    log(">>>>>★启动社区APP★<<<<<")
    toastLog("尝试直接调起小米社区APP……", "forcible");
    app.launch(packageN);
    let n = 0;
    // 这个循环走一遍至少需要1秒
    while (!wait(() => packageName(packageN).exists(), 3, 500)) {
        //链式调用权限触发，点“始终允许”
        if (textContains("想要打开").exists()) {
            sleep(200)
            className("android.widget.Button")
                .textContains("允许").findOne().click();
            break;
        }
        // 两种启动写法
        if (n % 2 === 0) app.launchApp("小米社区")
        else app.launchPackage(packageN);
        if (n > 3) {
            // 从详情页启动小米社区
            let yyxq = text("应用详情");
            if (text("应用信息").exists()) {
                toastLog("堵车我就抄小路，\n看我排水沟过弯大法！", "long", "forcible");

                className("android.widget.LinearLayout")
                    .desc("更多").findOne().click();
                sleep(300)
                clickCenter(yyxq.findOne());
                sleep(300)
            }
            if (yyxq.exists()) {
                let run = textContains("启动");
                while (!run.exists()) {
                    // 上滑寻找“启动”
                    swipe(dwidth * 0.5, dheight * 0.8, dwidth * 0.5, dheight * 0.5, 300);
                    sleep(300);
                }
                run = run.findOne();
                while (!run.clickable())
                    run = run.parent();
                run.click();
                // clickCenter(run);
                break;
            }
            if (wait(() => packageName(packageN).exists(), 8, 500)) break;

            toastLog("无法打开小米社区，(*꒦ິ⌓꒦ີ)", "forcible");
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("无法打开小米社区APP！"));

            return false;
        }
        n++;
    }
    toastLog("成功打开小米社区！！！", "forcible");
    return true;
}

//跳过广告
function skipAd() {
    while (!packageName(xmPckageName).exists());
    //开屏广告
    let skilCloseBtn = textStartsWith("跳过").findOne(600);
    if (skilCloseBtn) {
        skilCloseBtn.click();
        log("跳过了开屏广告!");
    }
    let adClose = className("android.widget.ImageView")
        .desc("关闭");
    if (wait(() => adClose.exists(), 3, 600)) {
        adClose.findOne().click();
        log("关闭了1个广告!");
    }
}

//浏览帖子
function posts(n) {
    while (!packageName(xmPckageName).exists());
    log(">>>>>>>★浏览帖子★<<<<<<<")
    toastLog("准备浏览帖子10s……", "long", "forcible")
    sleep(500)
    // 小米社区重置首页
    //backAppIndex();
    let pkly = className("android.widget.ImageView")
        .desc("评论");
    if (wait(() => pkly.exists(), 6, 500)) {
        let pkly1 = pkly.findOne();
        // 由于兼容性问题，识别父组件层次不同，
        // 于是向上爬父组件
        let tiezi = pkly1.parent();
        while (tiezi.indexInParent() > 0 && !tiezi.clickable()) {
            tiezi = tiezi.parent();
        }
        tiezi.click();

        //click(tiezi.bounds().centerX() + 100, tiezi.bounds().centerY() - 90);
        sleep(1500);
        let gz = className("android.widget.TextView")
            .text("关注");
        let gz2 = className("android.view.View")
            .text("关注");
        while (!(gz.exists() || gz2.exists())) {
            if (n > 5) {
                toastLog("打开帖子失败！")
                unfinished_mark = 1;
                return;
            }
            toastLog("第" + n + "次重试")
            // 误点开图片
            if (text("保存").exists()) {
                back();
                sleep(500);
                break;
            }
            // 点开视频贴
            if (idStartsWith('videoPlayer_').exists() ||
                text("视频播放器").exists()) {
                back();
            }

            // 小米社区重置首页
            backAppIndex();
            // 下滑刷新列表
            swipe(dwidth * 0.5, dheight * 0.6, dwidth * 0.5, dheight * 0.9, 300);
            sleep(1500);

            // 坐标点击第一个“评论”入口上方
            pkly1 = pkly.findOne();
            click(pkly1.bounds().centerX(), pkly1.bounds().centerY() - cY(90));
            sleep(1500);
            n++;
        }

    } else {
        toastLog("第" + n + "次重试")
        // 小米社区重置首页
        backAppIndex();
        // 下滑刷新列表
        swipe(dwidth * 0.5, dheight * 0.5, dwidth * 0.5, dheight * 0.8, 300);
        sleep(1500);
        if (n > 5) {
            toastLog("打开帖子失败！")
            unfinished_mark = 1;
            return;
        }
        return posts(n + 1);
    }
    log("正在浏览帖子……");
    for (i = 0; i < 4; i++) {
        sleep(700);

        let ran = random(200, 300) * Math.pow(-1, i);
        //gesture(1000, [dwidth * 1 / 2, dheight * 0.8 + ran], [dwidth * 1 / 2, dheight * 0.8 - ran]);
        swipe(dwidth * 0.5, dheight * 0.7 + cY(ran), dwidth * 0.5, dheight * 0.7 - cY(ran), 1000);

        if (i < 3) toast("正在浏览帖子……", "forcible");
        else toastLog("浏览10s完成！Ｏ(≧▽≦)Ｏ ", "forcible");

        wait(() => false, 1000);
    }

    // 返回
    back();
    return;
}

// 重置到小米社区论坛页
function backAppIndex() {
    log("返回[论坛]页面")
    //发现退回图片
    let backImg = className("android.widget.Image")
        .text("返回");
    while (backImg.exists()) {
        backImg.findOne().click();
        sleep(300)
    }
    //发现退回按钮
    let backBut = className("android.widget.Button")
        .text("后退");
    while (backBut.exists()) {
        backBut.findOne().click();
        sleep(300)
    }
    // 返回“论坛”页
    let index = className("android.widget.TextView")
        .text("论坛");
    let qdBt = className("android.widget.ImageView")
        .desc("签到");
    while (qdBt.exists() &&
        (qdBt.findOne().centerX() < 0 || qdBt.findOne().centerY() < 0)) {
        let indexAble = index.findOne(1500);
        if (indexAble) {
            indexAble.click();
            indexAble.parent().click();
            sleep(300);
        }
    }
    let pingLun = className("android.widget.ImageView")
        .desc("评论");
    while (pingLun.exists() &&
        (pingLun.findOne().centerX() < 0 || pingLun.findOne().centerY() < 0)) {
        let indexAble = index.findOne(1500);
        if (indexAble) {
            indexAble.click();
            indexAble.parent().click();
            sleep(300);
        }
    }

}

//------------ 社区APP签到 ----------//

function start() {
    while (!packageName(xmPckageName).exists());
    log(">>>>>>>★开始签到★<<<<<<<")
    // percentage = logpercentage();
    var done = text("已签到").findOne(1666);
    try {
        if (!done) {
            //控制台缩小
            consoleMin();
            //开始程序
            findCenter();
        }
        toastLog("今日已签到！", "forcible");
    } catch (e) {
        unfinished_mark = 1;
        console.error("社区APP签到失败！");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("社区APP签到失败了！"));
        console.error(e.message);
        return;
    } finally {
        //展开悬浮窗控制台
        console3();
        consoleExpand();
    }

}

//社区APP，点击“立即签到”
function findCenter() {
    toastLog("开始签到……", "forcible");
    //点击签到按钮
    let qdbt = text("立即签到");

    // 没找到入口
    while (!wait(() => qdbt.exists(), 3, 800)) {
        toastLog("未找到活动入口，重新进入", "forcible")
        back();
        // 小米社区重置首页
        //backAppIndex();
        sleep(1000);
        className("android.widget.ImageView")
            .desc("签到").findOne().click();
        sleep(1000);
    }
    qdbt.findOne().click()

    // 等待验证图片的加载
    sleep(2000);
    let result = wait(() => existsOne(text("关闭验证"), text("刷新验证"), text("视觉障碍")), 6, 800);
    //let ycdj = textStartsWith("请在下图依次点击").findOne(1500);

    if (!(result)) {
        toastLog("芭比Q了，点不开签到页面！", "forcible");
        throw e;
        return;
    }
    //屏幕截图
    captureScr();
    let ycdj = textStartsWith("请在下图依次点击").findOne(1500);
    if (ycdj) {
        // 识图认证
        imageRecoSign();
    } else {
        //滑块认证
        auth_hk();
    }
}

// 屏幕截图，并保存
function captureScr() {
    log("准备屏幕截图......")
    sleep(500)
    //悬浮窗控制台最小化
    consoleCollapse();
    try {
        // 请求截图权限
        if (!images.requestScreenCapture()) {
            toastLog("请求截图权限失败！˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
            console.error("可能涉及'投影媒体'权限、手机屏幕共享，或者手机重启试试！");
            return;
        }
    } catch (e) {
        throw e;
        return;
    }
    wait(() => false, 1000);
    //开始截图
    // log("正在屏幕截图！")
    var pictures2 = images.clip(captureScreen(), 0, 0, dwidth, dheight);
    images.save(pictures2, "./tmp/pictures2.png", "png", 100);
    pictures2.recycle();
    sleep(500)
    log("屏幕截图成功！")
    //展开悬浮窗控制台
    consoleExpand();

}

//------------ 识图签到 ----------//

// 识图签到
function imageRecoSign() {
    //剪图，并获得参数
    let clipParam = getClipPic();
    // 坐标集合
    let list = null;
    let success = false;
    let n = 0;
    while (!success) {
        if (enlocalYOLO) {
            //使用本地YOLO模型
            list = localYOLOSign();
        }
        if (!list || list.length < 1) {
            //使用服务器YOLO
            list = serverYOLOSign();
        }
        if (list && list.length > 0) {
            success = clickPic(list, clipParam);
            // 失败，准备重试
            if (!success) {
                console.error("遇到未知错误，提交失败");
                console.error("准备重试……");
                log('第 ' + (n + 1) + ' 次重试')
                list = null;
                if (n > 1) enlocalYOLO = false;
                let salt = (enlocalYOLO ? 'local' : 'server') + '_unknown';
                // 备份错误图片
                saveErroFile(CAPTURE_PIC_PATH, salt);

                //重新截图
                captureScr();
                clipParam = getClipPic();
            }
        }

        if (n > 2) {
            //失败
            throw e;
        }
        n++;
    }

}

// 剪图pic，且返回clip参数
function getClipPic() {
    let x = cX(101);
    let y = cY(638);
    var param = {
        x: x,
        y: y,
        w: (cX(979) - x),
        h: (cY(1622) - y)
    };
    // 若找到参照组件，就更新参数
    let ycdj = textStartsWith("请在下图依次点击").findOne(2500);
    if (ycdj) {
        //找到合适的父组件
        while (ycdj.right() < dwidth * 2 / 3) {
            ycdj = ycdj.parent();
        }
        param.x = ycdj.left();
        param.y = ycdj.top();
        param.w = ycdj.right() - param.x;
    }

    let tida = className("android.widget.Button")
        .text("确认").findOne(2500);
    if (!tida) {
        tida = className("android.widget.Button")
            .text("提交答案").findOne(2500);
    }
    if (tida) {
        param.h = tida.top() - param.y;
    }

    //剪小图
    var pictures2 = images.read("./tmp/pictures2.png");
    var pic = images.clip(pictures2,
        param.x, param.y,
        param.w, param.h);

    images.save(pic, CAPTURE_PIC_PATH, "png", 100);
    pictures2.recycle();
    pic.recycle();

    return param;
}

// 点击图标，返回是否成功
function clickPic(list, clipParam) {
    for (let i = 0; i < list.length; i++) {
        x = list[i][0] + clipParam.x;
        y = list[i][1] + clipParam.y;
        let icon = list[i][2]
        log("点击第" + (i + 1) + "个图标：" + icon);
        log("坐标：(" + x + ", " + y + ")")
        log("点击结果：" + click(x, y));
        sleep(500)
    }
    log("图标点击完成！");
    click("确认");
    click("提交答案");
    sleep(1000);
    if (text("已签到").findOne(3000)) {
        toastLog("识图签到成功！！！(๑´∀`๑)");
        return true;
    }
    return false;
}

// 保存错误文件，用salt区分 类别
function saveErroFile(path, salt) {
    if (!files.isFile(path)) return false;
    // 组装文件名
    let name = files.getNameWithoutExtension(path); //无后缀文件名
    let ext = files.getExtension(path); //后缀
    let time = nowDate().substr(5, 14).replace(/[- :]/g, '');
    // let time = String("05-11 15:37:56").replace(/[- :]/g, '');

    let filename = name + '_error_' + salt + '_' + time + '.' + ext;

    //存放错误文件目录
    let errorDir = './tmp/error/' + salt + '/';
    files.ensureDir(errorDir)
    // 文件列表
    let arr = files.listDir(errorDir, function(fname) {
        return fname.startsWith(name + '_error_' + salt);
    }).sort().reverse();
    //保留30个错误文件
    for (i = arr.length - 1; arr.length > 30; i--) {
        files.remove(errorDir + arr[i])
    }
    //复制文件
    return files.copy(path, errorDir + filename);
}



//------------ 本地识图签到 ----------//

/**
 * 本地YOLO模型，返回坐标
 */
function localYOLOSign() {
    if (!yoloProcessor) {
        log("YOLO 模块未加载，无法进行验证码识别签到");
        return null; // 表示签到失败
    }
    for (let i = 0; i < 3; i++) {
        log(`开始第 ${i + 1} 次签到尝试`);
        // 2. 调用 YOLO 识别
        log("调用 YOLO 模型识别...");
        let detectionResult = null;
        try {
            detectionResult = yoloProcessor(CAPTURE_PIC_PATH);
        } catch (e) {
            console.error(`YOLO 识别调用出错: ${e}`);
        }
        // 3. 处理识别结果并点击
        if (detectionResult && detectionResult.length > 0) {
            log(`识别成功 ${detectionResult.length} 个目标`);
            // log(detectionResult)
            return transResult(detectionResult);

        } else {
            console.error("刷新图片重试！");
            className("android.widget.Button")
                .text("刷新验证").findOne(2500).click();

            // 备份错误图片
            saveErroFile(CAPTURE_PIC_PATH, 'local')

            //重新截图
            captureScr();
            getClipPic();
        }
    }
    return null;
}

//转化JSON格式
function transResult(arr) {
    if (arr === null || arr.length < 1) return arr;
    // 判断是否已经是目标格式
    const isTargetFormat = arr.every(subArr =>
        typeof subArr[0] === 'number' &&
        typeof subArr[1] === 'number' &&
        typeof subArr[2] === 'string');
    if (isTargetFormat) {
        return arr;
    }

    return arr.map((obj) => [
        obj.centerX,
        obj.centerY,
        obj.label,
        obj.prob
    ]);
}



//------------ 服务器识图签到 ----------//

// 服务器识图，返回坐标
function serverYOLOSign() {
    log("将请求服务器，来识别坐标！")
    threads.shutDownAll(); //在此之前，所有子线程必须结束
    console.error('可用服务器数量：' + urls.length)
    if (urls.length < 1) {
        console.error("芭比Q了，所有服务器都挂了，没法签到了！");
        throw e;
        return null;
    }
    // 发送请求，获取坐标
    // url随机排列，变相负载均衡
    let array = getRandomNumbers(urls.length - 1);
    let m = 0;
    while (urls[array[0]].includes('xcjd') || urls[array[0]].includes('clawc') ||
        (urls.length > 1 &&
            (urls[array[1]].includes('xcjd') || urls[array[1]].includes('clawc')))) {
        // 前两次请求，不用xcjd开头的服务器（超慢）
        // 换顺序，再排列一次
        array = getRandomNumbers(urls.length - 1);
        m++;
        if (urls.length < 3 || m > urls.length) break;
    }
    let i = 0,
        n = 0,
        u = 0;
    let url = urls[array[u]];

    // 发送请求
    while (true) {
        log("开始第" + (i + 1) + "次申请");
        try {
            log(url);
            let res = upload(url);
            if (res.statusCode === 200) {
                log("坐标分析成功啦！")
                return res.body.json();
                // clickPic(res.body.json(), clipParam);
                // return;
            } else {
                n++
                // if (n > 2) {
                //     toast("识别失败了˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
                //     console.error("向程序员反馈，识别不了！");
                //     //throw e;
                //     return;
                // }                

                console.error("错误：statusCode：" + res.statusCode);
                console.error("信息：" + res.body.json());

                console.error("识别失败，刷新图片重试！");
                className("android.widget.Button")
                    .text("刷新验证").findOne(2500).click();

                // 备份错误图片
                saveErroFile(CAPTURE_PIC_PATH, 'server')

                //重新截图
                captureScr();
                getClipPic();

            }

        } catch (e) {
            u++;
            if (u === urls.length) {
                toast("识别失败了˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
                console.error("所有服务器都挂了，放弃吧！");
                console.error(e.message);
                throw e;
                return null;
            }
            log("服务器错误，更换服务器重试！")
            url = urls[array[u]];

        }
        i = n + u;
        if (i > (urls.length + 3)) {
            toast("识别失败了˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
            console.error("重试好多次了，我也不知道发生了什么问题！");
            throw e;
            return null;
        }
    }
}



//上传图片
function upload(url) {
    let delayed_bak = delayed;
    switch (true) {
        case url.includes("clawc"):
            delayed = 20
            break;
        case url.includes("xcjd"):
            delayed = delayed_max
            break;
        default:
            delayed = delayed_bak
    }
    let pic_dir = files.cwd() + "/tmp/pic.png";

    let startTime = new Date().getTime();
    let res;
    try {
        let thread = threads.start(() => {
            try {
                // 正式发送请求
                res = http.postMultipart(url, {
                    file: ["0.png", pic_dir]
                }, {
                    timeout: delayed * 1000
                });
            } catch (e) {}
        });
        // AutoJS 6.5.0版本超时时间无效，改用线程方式
        thread.join(delayed * 1000);
        thread.interrupt();
    } catch (e) {
        //异常不处理
        //console.error(e.message);
        //丢给外面处理
        throw e;
    } finally {
        let time = (new Date().getTime() - startTime);
        log("服务器请求时间：" + time + " ms");
    }

    return res;
}

//------------ 滑块签到 ----------//
// 滑块认证
function auth_hk() {
    var pictures2 = images.read("./tmp/pictures2.png");
    // 读取滑块图片
    var wx = readHk();
    //找图
    var p = findImage(pictures2, wx, {
        //region: [cX(165), cY(1276), (cX(349)-cX(165)), (cY(1460)-cX(1276))],
        threshold: 0.8
    });
    if (p) {
        // 计算小图在大图中的中心坐标
        centerX = p.x + wx.width / 2;
        centerY = p.y + wx.height / 2;
        rX = p.x + wx.width * 3 / 4;
        pY = p.y
        //滑块宽度
        sliderRegion = [p.x, p.y, p.x + wx.width, p.y + wx.height];

        // 显示找到的小图中心坐标
        log("滑块中心坐标：(" + centerX + ", " + centerY + ")");
        //回收图片
        pictures2.recycle();
        wx.recycle();

        try {
            qd2(0); //新版签到
        } catch (e) {
            console.error(e.message);
            toastLog("新版签到失败，尝试使用旧版签到！")
            qd(); //开始签到
        }

    } else {
        toastLog("没有找到滑块", "forcible");
        throw e;

    }
}

// 读取滑块图片hk.png
function readHk() {
    //先根据分辨率读
    let hk = (`tmp/hk_${dwidth}x${dheight}` + `.png`);
    let wx = images.read("./" + hk);
    // 自动适配
    if (null === wx) {
        var pictures2 = images.read("./tmp/pictures2.png");

        let x = cX(165);
        let y = cY(1276);
        let w = cX(349) - x;
        let h = cY(1460) - y;

        // 若找到参照组件，就更新参数

        //寻找滑块组件
        let gbyz = className("android.widget.Button")
            .text("关闭验证").findOne(1500);
        if (!gbyz) {
            gbyz = className("android.widget.Button")
                .text("刷新验证").findOne(1500);
            if (!gbyz) {
                gbyz = className("android.widget.Button")
                    .text("视觉障碍").findOne(1500);
            }
        }
        if (gbyz) {
            while (gbyz.right() < dwidth * 2 / 3) {
                gbyz = gbyz.parent();
            }
            // 滑块组件所在的集合
            let hk_auto = gbyz.previousSibling();

            if (hk_auto.hasChildren())
                hk_auto = hk_auto.lastChild();

            if (hk_auto.right() > dwidth * 0.4 ||
                hk_auto.bottom() <= gbyz.previousSibling().bottom()) {

                let hks = gbyz.previousSibling().find();
                for (i = (hks.length - 1); i > 0; i--) {

                    hk_auto = hks.get(i);
                    if (hk_auto.right() < dwidth * 0.4 &&
                        hk_auto.bottom() > gbyz.previousSibling().bottom()) {
                        x = hk_auto.left();
                        y = hk_auto.top();
                        w = hk_auto.right() - x;
                        h = hk_auto.bottom() - y;
                    }
                }
            } else {
                x = hk_auto.left();
                y = hk_auto.top();
                w = hk_auto.right() - x;
                h = hk_auto.bottom() - y;
            }
        }
        // 剪滑块
        wx = images.clip(pictures2, x, y, w, h);
        images.save(wx, "./tmp/hk_auto.png", "png", 100);
        pictures2.recycle();
    }

    return wx;
}

//------------ 新版滑块签到 ----------//

//新版签到
function qd2(n) {
    if (n > 3) {
        console.error("没找到缺口！！");
        throw e;
    }
    // 滑块的中心坐标
    let sliderCenter = [centerX, centerY];
    // 滑块宽度
    let sliderWidth = sliderRegion[2] - sliderRegion[0];

    // 为了得到滑动终点的横坐标

    //2400分辨率标准，截图起始位置
    let chight = 1110 - (90 * n);
    //截图高度
    let hight = 200;

    let img3 = images.read("./tmp/pictures2.png");
    // 开始截图
    let gapImage = images.clip(img3, sliderCenter[0], cY(chight),
        cX(800) - sliderCenter[0], hight);
    // 灰度化缺口区域
    let grayGapImage = images.grayscale(gapImage);
    // 二值化缺口区域
    let binaryGapImage = images.threshold(grayGapImage, 95, 255, "BINARY");

    // 保存图片到目录，留作记录，其实没啥用
    images.save(gapImage, "./tmp/gap_image.png");
    //images.save(grayGapImage, "./tmp/gray_gap_image.png");
    images.save(binaryGapImage, "./tmp/binary_gap_image.png");
    // 回收图片
    img3.recycle();
    gapImage.recycle();
    grayGapImage.recycle();

    //n开始迭代
    n++;
    // 寻找第一个黑色点，参照图右边缘
    let point = findColor(binaryGapImage, "#000000", {
        region: [0, 0],
        threshold: 4
    });
    if (point === null || point.x === 0) {
        // 点在图片左侧边缘
        binaryGapImage.recycle();
        return qd2(n); // 截图位置上移
    }
    // 第二个黑色点，缺口左边缘，位置必须在滑块右侧
    let point2 = findColor(binaryGapImage, "#000000", {
        region: [sliderWidth * 0.5, 0],
        threshold: 4
    });
    if (point2 === null || point2.x === point.x) {
        //没找到，或者找到的跟第一个点一样
        binaryGapImage.recycle();
        return qd2(n); // 截图位置上移
    }
    // ------  寻找缺口右边缘  ------
    // 缺口标准宽度120，凹凸形状25

    // 用它做参照，忽略该宽度左侧的干扰
    let excluWidth = 96;
    // 第三个点，缺口右边缘
    let point3 = findColor(binaryGapImage, "#000000", {
        region: [point2.x + excluWidth, 0, (binaryGapImage.width - (point2.x + excluWidth)), 70],
        threshold: 4
    });
    if (point3 === null || (point3.x - point2.x) > cX(140)) {
        //找到的点太离谱，或者没找到
        binaryGapImage.recycle();
        return qd2(n); // 截图位置上移
        //使用预估宽度当成点
        //point3x = notchWidth + point2.x;
    }
    binaryGapImage.recycle();
    // --------  误差  ----------
    //1080宽度滑块110
    //滑块宽度
    let notchWidth = point3.x - point2.x;
    if (notchWidth < excluWidth + 5)
        notchWidth = notchWidth + cX(random(8, 14));
    if (notchWidth < excluWidth + 10)
        notchWidth = notchWidth + cX(random(3, 7));
    if (notchWidth > cX(120))
        notchWidth = notchWidth - random(8, 14);

    let longx = point2.x + notchWidth - point.x;
    log("需要移动的距离为：" + longx);
    log("终点坐标：(" + (longx + sliderCenter[0]) + "," + sliderCenter[1] + ")")

    //签到！滑动！
    toastLog("开始模拟滑动……", "forcible");
    // 把移动距离x10当成滑动时间，并确保在3秒以内
    let time = (longx > cX(250) ? longx * 0.5 : longx) * 10;
    gesture(time, sliderCenter, [(longx + sliderCenter[0]), sliderCenter[1]]);
    sleep(1000);
    let done = text("已签到").findOne(3000);
    if (done) {
        toastLog("签到完成！！！(๑´∀`๑)", "forcible");
    } else {
        console.error("新版签到失败！！");
        throw e;
    }

}

//------------ 风中拾页版，滑块签到 ----------//
//签到
function qd() {
    var len;
    var sta = "10(0{" + 50 + ",})1"

    var img2 = images.read("./tmp/pictures2.png");
    var pictures = images.clip(img2, rX, dheight * 1 / 3 + 30, dwidth * 5 / 6 - rX, pY - dheight * 1 / 3 - 30);
    images.save(pictures, "./tmp/pictures.png", "png", 100);
    img2.recycle();
    var img = images.read("./tmp/pictures.png");
    var result = images.inRange(img, "#000000", "#858585")
    images.save(result, "./tmp/result.png", "png", 100);
    img.recycle();
    var image = images.read("./tmp/result.png");
    var path = "./tmp/test.txt";
    if (files.exists(path)) {
        files.write(path, "");
    }
    var width = image.getWidth();
    var height = image.getHeight();
    for (let i = 1; i < height; i += 4) {
        var s = "";
        for (let j = 1; j < width; j += 2) {
            var number = images.pixel(image, j, i);
            var color = colors.toString(number);
            var ss = color == "#000000" ? 1 : 0;
            s += ss;
        }
        files.append(path, s + "\n");
        var matches = s.match(new RegExp(sta, "g"));
        if (matches) {
            var sum = 0;
            for (let i = 0; i < matches[0].length; i++) {
                if (matches[0][i] == 0) {
                    sum += 1
                }
            }
            log("缺口长度为" + sum)
            length = matches[0].length - 1;
            image.recycle();
            break;
        }
    }
    len = -1;
    let index = s.indexOf(matches);
    if (index > -1) {
        len = rX + index * 2 + length;
        log("缺口中心:" + len);
    }
    if (len > -1) {
        toastLog("开始模拟滑动", "forcible");
        let random1 = parseInt(random(-5, 5))
        let xyDis = len - centerX;
        let sx = centerX;
        let ex = sx + xyDis;
        let sy = centerY + random1;
        let ey = centerY + parseInt(random(-30, 30));
        log("贝塞尔曲线滑动");
        swipeBezierzier(sx, sy, ex, ey);

        var done = text("已签到").findOne(3000);
        if (done) {
            toastLog("签到完成！！！(๑´∀`๑)", "forcible");
            return;
        } else {
            console.error("签到失败1");
            notice(String('签到失败！(' + nowDate().substr(5, 14) + ')'), String("重新执行一次脚本试试吧！"));

        }
    } else {
        console.error("签到失败2");
    }
}

// 贝塞尔曲线滑动
function swipeBezierzier(sx, sy, ex, ey) {
    function bezierCreate(x1, y1, x2, y2, x3, y3, x4, y4) {
        //构建参数
        var h = 100;
        var cp = [{
            x: x1,
            y: y1 + h
        }, {
            x: x2,
            y: y2 + h
        }, {
            x: x3,
            y: y3 + h
        }, {
            x: x4,
            y: y4 + h
        }];
        var numberOfPoints = 100;
        var curve = [];
        var dt = 1.0 / (numberOfPoints - 1);

        //计算轨迹
        for (var i = 0; i < numberOfPoints; i++) {
            var ax, bx, cx;
            var ay, by, cy;
            var tSquared, tCubed;
            var result_x, result_y;

            cx = 3.0 * (cp[1].x - cp[0].x);
            bx = 3.0 * (cp[2].x - cp[1].x) - cx;
            ax = cp[3].x - cp[0].x - cx - bx;
            cy = 3.0 * (cp[1].y - cp[0].y);
            by = 3.0 * (cp[2].y - cp[1].y) - cy;
            ay = cp[3].y - cp[0].y - cy - by;

            var t = dt * i
            tSquared = t * t;
            tCubed = tSquared * t;
            result_x = (ax * tCubed) + (bx * tSquared) + (cx * t) + cp[0].x;
            result_y = (ay * tCubed) + (by * tSquared) + (cy * t) + cp[0].y;
            curve[i] = {
                x: result_x,
                y: result_y
            };
        }

        //轨迹转路数组
        var array = [];
        for (var i = 0; i < curve.length; i++) {
            try {
                var j = (i < 100) ? i : (199 - i);
                xx = parseInt(curve[j].x)
                yy = parseInt(Math.abs(100 - curve[j].y))
            } catch (e) {
                break
            }
            array.push([xx, yy])
        }

        return array
    }

    function randomSwipe(sx, sy, ex, ey) {
        //设置随机滑动时长范围
        var timeMin = 1000
        var timeMax = 2200
        //设置控制点极限距离
        var leaveHeightLength = 60
        //log([sx, sy, ex, ey]);
        if (Math.abs(ex - sx) > Math.abs(ey - sy)) {
            var my = (sy + ey) / 2
            var y2 = my + random(0, leaveHeightLength)
            var y3 = my - random(0, leaveHeightLength)

            var lx = (sx - ex) / 3
            if (lx < 0) {
                lx = -lx
            }
            var x2 = sx + lx / 2 + random(0, lx)
            var x3 = sx + lx + lx / 2 + random(0, lx)
        } else {
            var mx = (sx + ex) / 2
            var y2 = mx + random(0, leaveHeightLength)
            var y3 = mx - random(0, leaveHeightLength)

            var ly = (sy - ey) / 3
            if (ly < 0) {
                ly = -ly
            }
            var y2 = sy + ly / 2 + random(0, ly)
            var y3 = sy + ly + ly / 2 + random(0, ly)
        }

        //获取运行轨迹，及参数
        var time = [0, random(timeMin, timeMax)]
        var track = bezierCreate(sx, sy, x2, y2, x3, y3, ex, ey)

        // log("随机控制点A坐标："+x2+","+y2)
        // log("随机控制点B坐标："+x3+","+y3)
        // log("随机滑动时长："+time[1])

        //滑动
        gestures(time.concat(track))
    }
    randomSwipe(sx, sy, ex, ey)
}


//------------ 活动 ----------//
//拔萝卜活动
function see() {
    log(">>>>>>>★萝卜活动★<<<<<<<")
    toastLog("拔萝卜活动签到……", "forcible");
    sleep(1000);
    var button = className("android.widget.Button").text("去看看");
    if (!wait(() => button.exists(), 5, 500)) {
        toastLog("未找到活动入口，重新进入", "forcible")
        back();
        // 小米社区重置首页
        //backAppIndex();
        // 重新进入签到页面
        sleep(1000);
        className("android.widget.ImageView")
            .desc("签到").findOne().click();
        sleep(1000);
    }
    // while (scrollDown());
    button.findOne().click();

    let blb = className("android.widget.Button")
        .text("查看金币详情")
    if (wait(() => blb.exists(), 6, 400)) {
        toastLog("拔萝卜已签到！", "forcible");
    }

    back();
}

//米粉节活动
function fans() {
    var button = className("android.widget.Button")
        .text("去参与").findOne(1500);
    if (button) {
        button.click();
        toastLog("打开米粉节活动", "forcible")
        var dianl = className("android.widget.Button")
            .text("点亮今日足迹").findOne(1200);
        var chouka = className("android.widget.Button")
            .text("抽取今日祝福").findOne(1200);
        if (dianl || chouka) {
            clickAndLog(dianl || chouka);
            back();
        } else {
            toastLog("未找米粉节参与按钮", "forcible");
        }
    } else {
        toastLog("未找到'去参与'按钮", "forcible");
    }
}

//米粉节活动按钮
function clickAndLog(button) {
    if (button) {
        button.click();
        log("点击了按钮: " + button.text());
        button2 = className("android.widget.Button")
            .text("抽取今日祝福").findOne(1200).click();
        if (button2) {
            toastLog("今日祝福已抽取", "forcible");
        }
    } else {
        toastLog("按钮为空，无法点击", "forcible");
    }

}

//观看视频
function watchVideo() {
    var watch = className("android.widget.Button")
        .text("去浏览").findOne(1000); //查找'去浏览'按钮 
    if (watch) {
        var randomsleep = random(10000, 15000);
        var stime = new Date().getTime(); //记录开始时间 
        var lastprinttime = -1;
        var randomgesture = random(-100, 100);
        watch.click();
        toastLog("开始浏览视频", "forcible");
        while (true) {
            var spendTime = Math.floor((new Date().getTime() - stime) / 1000) / 60; //计算已观看时间   
            var watchtime = Math.floor(spendTime);
            if (watchtime !== lastprinttime && watchtime !== 5 && watchtime !== 0) {
                toastLog(`已观看${watchtime}分钟`, "forcible");
                lastprinttime = watchtime;
            }
            sleep(randomsleep);
            gesture(200, [540 + randomgesture, 1900 + randomgesture], [540 + randomgesture, 1200 + randomgesture]);
            if (spendTime >= 5) {
                toastLog("已观看5分钟，退出", "forcible");
                back();
                break;
            }
        }
    } else {
        toastLog("未找到'去浏览'按钮", "forcible");
    }
}

//签到+1概率
function logpercentage() {
    var percentageUi = textContains("当前签到+1的概率：").findOne(1500)
    if (percentageUi) {
        var percentageText = percentageUi.text()
        var regex = "\\d{1,3}(?:\\.\\d{1,3}?%)";
        var percentage = percentageText.match(regex)[0]
        log("当前签到+1的概率：" + percentage)
        return percentage;
    } else {
        log("未找到签到概率")
    }

}
//加入圈子活动
function join() {
    let qujiaru = className("android.widget.Button")
        .text("去加入").findOne(1500)
    if (qujiaru) {
        qujiaru.click()
        let join = className("android.widget.Button")
            .text("加入圈子").findOne(1500).click()
        if (join) {
            toastLog("加入圈子成功", "forcible")
        } else {
            toastLog("未找到加入按钮", "forcible")
        }
        sleep(2000)
        back()
    } else {
        toastLog("未找到'加入圈子'按钮", "forcible")
    }
}

//感恩季活动
function ganenji() {
    let qucanyu = className("android.widget.Button").text("去参与");

    // 没找到入口
    while (!wait(() => qucanyu.exists(), 5, 500)) {
        toastLog("未找到活动入口，重新进入", "forcible")
        back();
        sleep(1000);
        // 小米社区重置首页
        //backAppIndex();
        // 重新进入签到页面
        className("android.widget.ImageView")
            .desc("签到").findOne(3000).click();
        sleep(1000);
    }
    qucanyu.findOne(1500).click()

    sleep(500);
    解锁(qucanyu);
    sleep(500);
    back();
    sleep(500);

}

function 活动1() {
    while (!packageName(xmPckageName).exists());
    log(">>>>>>>★旗舰活动★<<<<<<<")
    toastLog("开始双旗舰活动……", "forcible")
    let cj = className("android.widget.Button").text("去参加");
    if (!wait(() => cj.exists(), 5, 500)) {
        toastLog("未找到活动入口，重新进入", "forcible")
        back();
        sleep(1000);
        // 小米社区重置首页
        //backAppIndex();
        // 重新进入签到页面
        className("android.widget.ImageView")
            .desc("签到").findOne().click();
        sleep(1000);
    }

    cj.findOne().click();

    let register = className("android.widget.Button")
        .text("立即报名");
    if (wait(() => register.exists(), 3, 600)) {
        register = register.findOne();
        // sleep(500)
        // 勾选 “我已阅读并同意”
        let checkBox = register.nextSibling();
        if (!checkBox.clickable() && checkBox.hasChildren())
            checkBox = checkBox.firstChild();

        sleep(500);
        if (checkBox.click()) {
            //立即报名
            register.click();
            sleep(1000)
            let qd = className("android.widget.Button")
                .textStartsWith("确定").findOne(1500);
            if (qd) {
                qd.click();
            } else {
                //机型确认，识别不到组件，也无法识别到（“确定”）文字，
                //位置在右下角
                for (i = 0; i < 5; i++) {
                    click(dwidth * 0.734, dheight * (0.895 + 0.008 * i));
                }
            }
            sleep(1500);
        }
    }
    解锁(cj);
    back();

}

function 解锁(button) {
    let qts = className("android.widget.Button").text("去提升");
    // 页面没成功加载
    if (!wait(() => qts.exists(), 3, 600)) {
        //重新进入
        back();
        sleep(1000);
        button.findOne().click();
        sleep(1000);
    }

    let ddjs = wait(() => text('等待解锁').exists(), 3);
    let jpso = wait(() => text('可解锁').exists(), 3);
    if (!ddjs && !jpso) {
        //  if (1) {
        log("不好了，布局分析失败了！")
        log("无法判断是否有解锁次数，")
        log("只能[摸黑]点击了再说。")
        //滑到最下面
        for (i = 0; i < 5; i++) {
            swipe(dwidth * 5 / 8, dheight * 0.5, dwidth * 5 / 8, dheight * 0.3, 100);
            gesture(100, [dwidth * 3 / 8, dheight * 0.5], [dwidth * 3 / 8, dheight * 0.3]);
            sleep(100);
        }
        sleep(600);
        log("解锁最后一个");
        for (i = 0; i < 2; i++) {
            click(dwidth * 0.88, dheight * (0.63 - 0.2 * i));
            sleep(300);
        }
        // 关闭提示
        for (i = 0; i < 5; i++) {
            click(dwidth * 0.5, dheight * (0.815 + 0.01 * i));
        }
        log("等待3秒……")
        sleep(3000);
        log("再解锁一个");
        for (i = 0; i < 2; i++) {
            click(dwidth * 0.13, dheight * (0.63 - 0.2 * i));
            sleep(300);
        }

    } else if (!ddjs && jpso) {
        jpso = text('可解锁').find(2000);
        for (i = 0; i < jpso.length; i++) {
            //开盒有3秒间隔限制
            if (i > 0 && wait(() => text('等待解锁').exists(), 5, 600)) {
                toastLog("解锁次数已耗尽！", "forcible")
                break;
            }

            //开盒
            let control = jpso.get(i);
            while (!control.clickable()) {
                control = control.parent();
            }
            control.click();
            log("尝试第" + (i + 1) + "次解锁！(/≧▽≦)/~┴┴ ");
            sleep(500);
            // 关闭炫耀一下
            let xyyx = className("android.widget.Button")
                .text("炫耀一下").findOne(888);
            if (xyyx) {
                xyyx = xyyx.parent().nextSibling();
                xyyx.click();
                // 关闭图形❌组件
                clickCenter(xyyx);
            } else {
                // 无法识别到“炫耀一下”弹窗，也无法识别关闭图形❌组件
                // 只能靠坐标关闭
                for (i = 0; i < 5; i++) {
                    click(dwidth * 0.5, dheight * (0.815 + 0.01 * i));
                }
            }
            sleep(600);
        }
    } else {
        toastLog("本次无解锁次数！", "forcible");
    }
    sleep(1000);
}

//------------ 小程序签到 ----------//

function 小程序签到() {
    log(">>>>>>★小程序签到★<<<<<<")
    toastLog("正在尝试打开小程序……", "forcible");
    //小米社区5.3.2以上版本进入小程序
    let isEnabled = isAtLeast(xmVersionName, xmAtLeastVersionName);
    let v53 = className("android.widget.Button")
        .text("去微信").findOne(1500);
    if (isEnabled && v53) {
        v53.click();
        // 存在微信分身，选择第1个
        let fenshen = textContains("选择");
        let one = className("android.widget.ImageView")
            .descContains("微信");
        // let two = className("android.widget.ImageView")
        //     .desc("双开微信");

        if (wait(() => fenshen.exists(), 5, 400) &&
            (one.find().length > 1)) {
            let wx = one.findOne();
            while (!wx.clickable()) {
                wx = wx.parent();
            }
            wx.click();
            clickCenter(wx);
        }

    } else {
        toastLog("不支持应用内跳转小程序，", "forcible")
        toastLog("尝试从桌面寻找小程序……", "forcible")
        // home();
        //  sleep(300);
        home();
        sleep(300);
        home();
        sleep(600);
        desktopRun();
    }
    sleep(1500);
    // 微信打开验证（小程序依赖微信，使用微信的包名）
    if (!wait(() => packageName(wchatpn).exists(), 10, 600)) {
        // 找不到微信的包名，自然也没能进入小程序
        console.error("packageName")
        toastLog("进不了微信小程序，我尽力了！(ó﹏ò｡) ", "long", "forcible");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("进不了微信小程序，我尽力了！"));
        back();
        return;
    }


    let xxcx = className("android.widget.ImageButton")
        .desc("更多").packageName(wchatpn);
    // 已打开微信，但未打开小程序。模拟从微信进入小程序
    if (!wait(() => xxcx.exists(), 6, 300) &&
        existsOne(text("通讯录"), desc("返回"), descStartsWith("更多功能"))
    ) {
        toastLog("已打开微信，但未打开小程序！", "forcible");
        toastLog("尝试从微信进入小程序……", "long", "forcible");
        sleep(1000)
        // 确保回到微信首页
        let bak = className("android.widget.ImageView")
            .desc("返回");
        while (bak.exists()) back();
        sleep(666)

        let wxindex = text("微信").findOne(2500);
        if (wxindex) {
            while (!wxindex.clickable()) {
                wxindex = wxindex.parent()
                sleep(666)
            }
            wxindex.click()
            clickCenter(wxindex);
        }

        // 微信下滑
        let zjsy = text("最近使用小程序");
        while (scrollUp() || !zjsy.exists()) {
            // swipe(dwidth * 0.6, dheight * 0.2, dwidth * 0.4, dheight * 0.8, 500);
            gesture(500, [dwidth * 0.6, dheight * 0.4], [dwidth * 0.4, dheight * 0.8]);
        }
        sleep(500)
        while (bak.exists()) back();
        sleep(500)

        let xlxcx = descStartsWith('小米社区').clickable();
        // 去“更多”，最近使用小程序，里寻找
        if (!wait(() => xlxcx.exists(), 5, 500)) {
            className('android.widget.RelativeLayout')
                .desc('更多小程序').findOne().click();
            let m = 0;
            while (!xlxcx.exists()) {
                swipe(dwidth * 0.6, dheight * 0.8, dwidth * 0.4, dheight * 0.2, 500);
                m++;
                if (m > 6) {
                    //sleep(500);
                    toastLog("好累啊，你多久没用小米社区小程序了？", "forcible")
                    toastLog("翻遍了你的小程序使用记录都没有！", "forcible")
                    toastLog("老子不玩了！", "forcible")
                    notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("找不到小米社区小程序！"));

                    return;
                }
                sleep(1500);
            }
        }
        xlxcx.findOne().click();
        // sleep(600);
    }
    //真正的小程序打开验证
    if (!wait(() => xxcx.exists(), 6, 500)) {
        //无法通过打开小程序校验，可能因为小程序布局分析失效导致
        // 不能确保成功打开小程序
        if (config.跳过小程序打开验证) {
            //再次尝试打开一次，以确保能顺利打开小程序
            toastLog("无法验证小程序是否已打开，", "forcible")
            toastLog("只好再打开一次，以求安心！", "forcible")
            if (isEnabled && v53) {
                home();
                sleep(666);
                launchAPP(xmPckageName);
                while (!packageName(xmPckageName).exists());
                //sleep(666);
                let sign = className("android.widget.ImageView")
                    .desc("签到");
                if (wait(() => sign.exists(), 3, 600)) {
                    sign.findOne().click();
                    sleep(666);
                }
                v53.click();
            } else {
                home();
                sleep(666);
                desktopRun();
            }
            while (!packageName(wchatpn).exists());
            sleep(1000);

        } else {
            toastLog("进不了微信小程序，我尽力了！(ó﹏ò｡) ", "long", "forcible");
            console.error("如果您确定小程序已打开，就能肯定布局分析失效了，")
            console.error("那么请把配置[跳过小程序打开验证 : 0]的值改成1 ");
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("进不了微信小程序，我尽力了！(ó﹏ò｡)"));
            back();
            return;
        }
    }
    log("成功打开小程序！")

    log("--------- 签到操作 ---------");
    let me = text("我的");
    if (wait(() => me.exists(), 5, 600)) {
        // 使用能点击的父控件
        let mep = me.findOne().parent();
        if (!mep.clickable()) {
            mep = mep.parent();
        }
        //点我的
        mep.click();
        clickCenter(mep);
        sleep(1500)
        //点论坛
        mep.previousSibling().click()
        //click("论坛")
        sleep(1500);
        //再点“我的”
        mep.click();
        toastLog("正在进入[我的]页面……", "forcible")
        //sleep(1500);
        if (wait(() => existsOne(text('已签到'), text('去签到')), 6, 500)) {
            let qdbt = text("去签到");
            if (wait(() => qdbt.exists(), 3, 600)) {
                qdbt = qdbt.findOne();
                qdbt.click();
                clickCenter(qdbt);
                toastLog("小程序签到成功！✧٩(ˊωˋ*)و✧", "forcible")
            }
        } else {
            toastLog("不好了！布局分析失效了！Σ(ŎдŎ|||)ﾉﾉ", "forcible")
            sleep(500)
            toastLog("只能摸黑操作，点击坐标试试看……")
            // 点击"签到"
            mhqdClick();
        }

    } else {
        toastLog("不好了！布局分析失效了！Σ(ŎдŎ|||)ﾉﾉ", "forcible")
        sleep(1500)
        toastLog("只能摸黑操作，点击坐标试试看……")
        // 先点击"论坛"，以防页面卡顿
        click(dwidth * 0.25, dheight * 0.939);
        click(dwidth * 0.25, dheight * 0.9415);
        click(dwidth * 0.25, dheight * 0.944);
        sleep(1500)
        // 点击"我的"
        toastLog("[不确定操作]摸黑→点击[我的]！")
        click(dwidth * 0.75, dheight * 0.939);
        click(dwidth * 0.75, dheight * 0.9415);
        click(dwidth * 0.75, dheight * 0.944);

        // 确保页面加载完成，多等会儿吧！
        // 不能识别，只能盲目等待了！
        sleep(2500);
        mhqdClick();
    }

    toastLog("小程序今日已签到！", "forcible")
    // 记录成长值
    //if (config.成长值记录) level2();
    sleep(1000);
    // 确保完成之后小程序回到最外面一层，下次打开小程序不会在子页面。
    back();
}
//摸黑签到
function mhqdClick() {
    // 点击"签到"
    if (config.小程序签到坐标) {
        log("配置[小程序签到坐标：" + config.小程序签到坐标 + "]")
        let x = config.button_x;
        let y = config.button_y;
        log("配置[button_x：" + x + "]")
        log("配置[button_y：" + y + "]")
        log("点击：" + click(x, y));
        log("二击：" + click(x, y))
        log("三击：" + click(x, y))
    } else {
        toastLog("[不确定操作]摸黑→点击[签到]！")
        for (i = 0; i < 5; i++) {
            click(dwidth * 0.73, dheight * (0.47 + 0.01 * i));
            // click(dwidth * 0.77, dheight * (0.47 + 0.01 * i));
            click(dwidth * 0.817, dheight * (0.47 + 0.01 * i));
            //  click(dwidth * 0.86, dheight * (0.47 + 0.01 * i));
            click(dwidth * 0.90, dheight * (0.47 + 0.01 * i));
        }
    }

    //  sleep(1000);
    log("[不确定][签到]，假装已完成！")
}

// 桌面打开小程序操作
function desktopRun() {
    if (config.坐标点击) {
        log("用户配置→{坐标点击:1}")
        toastLog("从第3屏，用户提供的坐标寻找……", "forcible")
        //第3屏获取小程序
        let tr = className("android.widget.ImageView")
            .desc("第3屏");
        //寻找第3屏
        if (!wait(() => tr.exists(), 5, 600)) {
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("我找不到第3屏（˃̣̣̥᷄⌓˂̣̣̥᷅）！"));
            exit();
        }

        tr.findOne().click()
        sleep(1666);
        for (i = 0; i < 3; i++) {
            toastLog("点击坐标[" + config.x + "," + config.y + "]")
            log(click(config.x, config.y));
            sleep(400);
        }

    } else {
        log("用户配置→{坐标点击:0}")
        toastLog("桌面所有屏，自动搜索中……", "forcible")

        let xcx = desc("小米社区").clickable().find();
        if (xcx.length > 0) {
            log("已找到[小米社区]名称的图标！");
            if (xcx.length > 1) {
                log("符合条件的图标，有[ " + xcx.length + " ]个！！！");
                log("其中可能包含：")
                log("→ 小米社区APP、微信分身小程序！")
                log("—————————----------→");

                for (i = 0; i < xcx.length; i++) {
                    xcx.get(i).click();

                    log("正在尝试打开→第[ " + (i + 1) + " ]个！");
                    if (wait(() => packageName(xmPckageName).exists(), 6, 500)) {
                        toastLog("这个不对，尝试下一个！", "forcible");
                        home();
                        sleep(600);
                    } else {
                        log("已找到小程序图标！");
                        toastLog("小程序打开缓慢，请耐心等待……", "long", "forcible");
                        break;
                    }
                }
                log("←----------—————————");
            } else {
                // 多点一下
                xcx.get(0).click();
                xcx.click();
            }
        } else {
            toastLog("也许你对我的爱藏的太深，让我无法发现……", "forcible")
            toastLog("也许你根本就是在骗我……（▼へ▼メ）", "forcible")
            console.error("请把小程序图标放在桌面上，无论放第几屏都好。")
            console.error("但不要藏在文件夹里，那样真找不到。")
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("我在桌面上找不到小程序图标，\n麻烦把它放在好找的地方（˃̣̣̥᷄⌓˂̣̣̥᷅）！"));
        }
    }
}

//------------ 成长值统计 ----------//

//小程序版成长值
function level2() {
    log("-----→");
    toastLog("[小程序]：记录成长值ing……", "forcible")
    var num = text("成长值").findOne(2000);
    if (!num) {
        toastLog("布局分析失效，未找到成长值！", "forcible");
        toastLog("[不确定操作]摸黑→点击[成长值]", "forcible");
        //点击查看明细
        click(dwidth * 0.5, dheight * 0.6);
        click(dwidth * 0.25, dheight * 0.6);
        click(dwidth * 0.75, dheight * 0.6);

    } else {
        // 记录成长值
        var num1 = num.nextSibling().child(0).text();
        var num2 = num.nextSibling().child(1).text();
        //当前成长值
        var numValue = parseInt(String(num1).replace("/", ""));
        if (成长值记录.当前成长值 < numValue)
            成长值记录.当前成长值 = numValue;
        //升级成长值
        var num2Value = parseInt(String(num2).replace("/", ""));
        if (成长值记录.升级目标 < num2Value)
            成长值记录.升级目标 = num2Value;
        //点击查看明细
        num.click()

    }
    sleep(1500);
    var newdate = date.replace(/-/g, "/").substr(0, 10);
    let jilu = text(newdate).find();
    if (jilu.length < 1) {
        //组件无法识别，无法继续了！除非返回重新进来
        log("布局分析失效！无法获得明细");
        back();
        return;
    }
    // 成长值明细记录
    for (i = 0; i < jilu.length; i++) {
        let demo = jilu.get(i);
        if (demo.isSingleton()) continue;
        //结果 值
        let result = demo.parent().nextSibling();
        if (!result) continue;
        let record = new 记录();
        record.结果 = result.text();
        record.项目 = demo.previousSibling().text();
        成长值记录.addAndUpdate(record);
    }
    back();

}

// 社区APP版 成长值
function level1() {
    while (!packageName(xmPckageName).exists());
    log("-----→");
    toastLog("[社区APP]：记录成长值ing……")
    let button = text("社区成长等级");
    // 没找到入口
    while (!wait(() => button.exists(), 5, 500)) {
        back();
        sleep(1000);
        // 小米社区重置首页
        //backAppIndex();
        // 重新进入签到页面
        className("android.widget.ImageView")
            .desc("签到").findOne().click();
        sleep(1000);
    }

    button = button.findOne();
    while (!button.clickable()) {
        button = button.parent();
    }
    button.click();
    clickCenter(button);
    sleep(1000);

    let czz = textStartsWith("成长值");
    if (wait(() => czz.exists(), 5, 500)) {
        let str = czz.findOne().text();
        let parts = str.match(/\d+/g);
        if (parts && parts.length >= 2) {
            let num1 = parseInt(parts[0]);
            if (成长值记录.当前成长值 < num1)
                成长值记录.当前成长值 = num1;
            let num2 = parseInt(parts[1]);
            if (成长值记录.升级目标 < num2)
                成长值记录.升级目标 = num2;
        }
    }

    var newdate = date.replace(/-/g, "/").substr(0, 10);
    let jilu = text(newdate).find();
    for (i = 0; i < jilu.length; i++) {
        let demo = jilu.get(i);
        if (demo.isSingleton()) continue;
        //结果 值
        let record = new 记录();
        record.结果 = demo.nextSibling().text();
        record.项目 = demo.previousSibling().text();
        成长值记录.addAndUpdate(record);
    }
    back();
}

// 列出成长值明细结果
function levelResult() {
    log(">>>>>>>★今日明细★<<<<<<<")
    if (config.成长值记录 < 1) {
        log("搞美雅！")
        log("配置[成长值记录:0]，没记录成长值！")
        return "恭喜完成！恭喜！\n没有记录成长值，这里没内容显示啦！";
    };

    let outP1 = ((`成长值：${成长值记录.当前成长值}(${成长值记录.当前等级()})`).padEnd(17) + (`升级目标：`).padStart(0) + `${成长值记录.升级目标}`);
    let outP2 = ((`今日获得：${成长值记录.今日获得()}`).padEnd(13) + (`距离升级还需：`).padStart(0) + `${成长值记录.距离升级还需()}`);
    log(outP1);
    log(outP2);
    log("----------------------------");
    log("详细记录：");

    成长值记录.详细记录.forEach((record) => {
        const item = record.项目.length > 10 ?
            record.项目.padEnd(17) : record.项目.padEnd(27);
        log(`${item}` + `${record.结果}`);
    });
    log("----------------------------");

    return outP1 + "\n" + outP2;

}





// 权限验证
function permissionv() {

    log(">>>>>>>★权限验证★<<<<<<<")
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

    //音量加，停止脚本
    events.setKeyInterceptionEnabled("volume_up", true);
    events.observeKey();
    events.onKeyDown("volume_up", () => {
        //volume_down
        //volume_up
        console.error("[音量+]停止脚本！！！");
        console.setTouchable(true);
        //console.hide();
        exit();
        console.error("3…2…1…停！哎~快停！");
    });

    // exit();
}

// 单元测试用例
function test() {


    exit();
}

//主程序
function run() {
    // exit();
    // 开始
    // 识图签到初始化
    initImageReco();

    home();

    // 进入正题
    killAPP(xmPckageName);
    if (launchAPP(xmPckageName)) {
        skipAd();
        if (config.浏览帖子) posts(1);
        //sleep(1666);
        let sign = className("android.widget.ImageView")
            .desc("签到");
        if (wait(() => sign.exists(), 5, 888)) {
            sign.findOne().click();
            //toastLog("打开[签到]页面……", "forcible");
            sleep(666);
            let refresh = text("重新加载");
            if (refresh.exists()) {
                refresh.findOne().click();
                sleep(666);
            }

            // 签到
            if (config.社区APP签到) start();
            if (config.小程序签到) 小程序签到();
            //回到小米社区app
            launchAPP(xmPckageName);
            // 按配置启用功能
            // if (config.加入圈子) join();
            // if (config.感恩季) ganenji();
            if (config.拔萝卜) see();
            //  if (config.米粉节) fans();
            //  if (config.观看视频) watchVideo();
            if (config.双旗舰) 活动1();
            if (config.成长值记录) level1();
        }

    } else {
        sleep(500);
        toastLog("(*꒦ິ⌓꒦ີ) 为什么打不开社区APP？", "forcible");
        toastLog("哪里出错了？", "forcible");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("芭比Q了，小米社区里的操作都没完成。"));
    }

    if (unfinished_mark) {
        //启动小米社区
        launchAPP(xmPckageName);
        // 控制台缩小
        consoleMin();
        notice(String('未完成(' + nowDate().substr(5, 14) + ')[' + getDurTime(date) + ']'), String(levelResult()));
        console.error("有某个流程未完成！˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚");

    } else {
        // 关闭小米社区APP
        killAPP(xmPckageName);
        consoleMax();
        home();
        sleep(300);
        home();
        notice(String('已完成(' + nowDate().substr(5, 14) + ')[' + getDurTime(date) + ']'), String(levelResult()));
        toastLog("全部已完成！(๑•॒̀ ູ॒•́๑)啦啦啦", "forcible");

    }

    device.cancelKeepingAwake();
    log("      —— 耗时[ " + getDurTime(date) + " ] ——");
    log("—-----★--- End ---★-----—");

    return;
}

function main() {

    // test();
    //  exit();
    //return;

    //解锁
    if (!device.isScreenOn()) {
        console.info("-----→");
        console.info("设备已锁定！！！");
        console.info("启动解锁程序……");
        device.wakeUpIfNeeded();
        device.wakeUp();
        sleep(500);
        unLock();
        wait(() => false, 20, 100);
    }
    device.keepScreenDim(2 * 60 * 1000);

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

    try {
        //启动悬浮窗关闭按钮
        stopButton();

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