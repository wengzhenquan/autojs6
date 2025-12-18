// 引入配置文件
if (typeof config === 'undefined' || !config ||
    Object.keys(config).length === 0) {
    try {
        config = require("./config.js");
    } catch (e) {
        config = {};
    }
}

// 签到截图目录
const CAPTURE_PIC_PATH = files.cwd() + "/tmp/pic.png"; // 验证码截图路径
const p2Path = "./tmp/pictures2.png";

// 小程序签到按钮坐标存储
const xcx_bt_center = "./tmp/xcx_bt_center.json";

// 本地YOLO
const YOLO_MODULE_PATH2 = "/yolov11/yolov11_w.js"; // YOLOv11 模块路径
const YOLO_PLUGIN_NAME2 = "com.circlefork.yolo"; // 插件包名
const YOLO_MODEL_SUBDIR2 = "/yolov11/model";
var yoloProcessor = null; // 初始化为 null
var enlocalYOLO = false;

// 识图服务器初始化
var serverInitStart = false;
var serverInitSum = -1;
var delayed = 10; //服务器请求超时时间s
var delayed_max = 30; //最大超时时间 

var hasRegEvent = 0; // 小程序报名活动

var dualRow = 0; // 分身序号

// 分身配置文件名数组
var dualConfigFilesNames = files.listDir('./', function(name) {
    return name.endsWith(".js") &&
        name.includes("config") &&
        name.includes("分身") &&
        files.isFile(files.join('./', name));
}).sort((a, b) => a - b);

// 滑块的四周坐标
var sliderRegion;
var centerX;
var centerY;
var rX;
var percentage;

// 验证码图标分界y
global.y_refer = null;
// 小图标x起始分界
global.x_refer = 200;

const wtimes = config.社区页面等待延迟 || 0;

// 活动桶
const xmsq_active = storages.create('xmsq_active');
var xmsq_act = false;

//------------ 成长值记录对象 ----------//
// 记录成长值对象
const 成长值记录 = {
    昵称: null,
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
        return this.详细记录.reduce((叠加量, 记录) => {
            return 叠加量 + 记录.值();
        }, 0);
    },
    预估日得() {
        let total = this.详细记录
            .filter(item => item.项目.length < 8 &&
                !item.项目.includes("活动") &&
                !item.项目.includes("报名") &&
                !item.项目.includes("奖励") &&
                !item.项目.includes("补偿"))
            .reduce((叠加量, 记录) => {
                return 叠加量 + 记录.值();
            }, 0);


        if (xmsq_act) {
            // 当有活动时(预估结果，不准确，就是日常结果加那么一点）
            // 取值最小的一项
            let prizePoints = this.详细记录
                .filter(item => !(item.项目.length < 8 &&
                    !item.项目.includes("活动") &&
                    !item.项目.includes("报名") &&
                    !item.项目.includes("奖励") &&
                    !item.项目.includes("补偿")))
                .reduce((min, item) => Math.min(min, item.值() || min), Infinity);
            // 有匹配取最小，无匹配0
            prizePoints = isFinite(prizePoints) ? prizePoints : 0;


            let prizePoint = xmsq_active.get("prizePoints");
            if (prizePoints < 1 && prizePoint)
                prizePoints = prizePoint;

            if (prizePoints > 0) {
                // 每17分开一次盒，中奖概率0.6
                total *= (prizePoints / 17 * 0.6 + 1);

                xmsq_active.put("prizePoints", prizePoints);
            }

        } else storages.remove("xmsq_active");

        return total;
    },
    // 直接新增
    add(new记录) {
        this.详细记录.push(new记录);
    },
    // 新添加并且更新
    addAndUpdate(new记录) {
        let existingRecord = this.详细记录.find((record) => record.项目 === new记录.项目);
        if (!existingRecord) {
            // 没有找到，当成新增处理
            this.详细记录.push(new记录);
        } else {
            // 找到了，对比值，把对象里的“结果”值改成“值”更大的那个
            let existingValue = existingRecord.值();
            let newValue = new记录.值();
            if (newValue > existingValue) {
                existingRecord.结果 = new记录.结果;
            }
        }
    },
    // 清除数据
    clearData() {
        this.昵称 = null;
        this.当前成长值 = 0;
        this.升级目标 = 0;
        this.详细记录 = [];

    }
};

function 记录() {
    this.项目 = "浏览帖子";
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


//------------ 识图签到初始化 ----------//

// --- 初始化识图模块 ---
function initImageReco(enforce) {
    console.info(">>>>→识图签到初始化←<<<<")
    if (enforce || config.本地YOLO识图) {
        try {
            log("开始加载本地识图模块……")
            let error = false;

            let name = app.isInstalled(YOLO_PLUGIN_NAME2);
            if (!name) {
                console.error("yolov11/Yolo-plugin.apk 插件未安装");
                error = true;
            }

            let yolojs = files.cwd() + YOLO_MODULE_PATH2;
            if (!files.exists(yolojs)) {
                console.error(YOLO_MODULE_PATH2 + " 文件缺失");
                error = true;
            }

            let yzmbin = files.cwd() + YOLO_MODEL_SUBDIR2 + "/yzm.bin";
            if (!files.exists(yzmbin)) {
                console.error(YOLO_MODEL_SUBDIR2 + "/yzm.bin" + " 文件缺失");
                error = true;
            }

            let yzmparam = files.cwd() + YOLO_MODEL_SUBDIR2 + "/yzm.param";
            if (!files.exists(yzmparam)) {
                console.error(YOLO_MODEL_SUBDIR2 + "/yzm.param" + " 文件缺失");
                error = true;
            }

            if (error) throw Error();

            // 加载 YOLO 模块
            console.error("----→>→加载YOLO←<←----")
            yoloProcessor = require(yolojs);
            if (!yoloProcessor || typeof yoloProcessor !== 'function') {
                throw Error(`模块 ${YOLO_MODULE_PATH2} 未导出函数`);
            }
            enlocalYOLO = true;
            console.error("YOLO 模块加载成功");
        } catch (e) {
            console.error(`加载本地 YOLO 模块失败: ${e}`);
            console.error(`将使用服务器识图！`);
            yoloProcessor = null;
            enlocalYOLO = false;
        }
    }
    if (!enlocalYOLO) {
        console.error("启用服务器识图签到！");
        //提前开始异步校验服务器，删除无效的服务器，确保签到认证时，服务器可用。
        threads.start(() => webTest());
    }
}


// 服务器校验
function webTest() {
    if (serverInitStart) return;
    serverInitStart = true;

    let sum_old = urls.length;
    let delayed_test;
    let startTime = new Date().getTime();
    for (let j = urls.length - 1; j > -1; j--) {
        let url = urls[j];
        switch (true) {
            case url.includes("clawc"):
                delayed_test = 10
                break;
            case url.includes("xcjd"):
                delayed_test = 7
                break;
            default:
                delayed_test = 5
        }

        let result = null;
        let thread = threads.start(() => {
            try {
                let res = http.get(url, {
                    timeout: delayed_test * 1000,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Connection': 'Keep-Alive'
                    }
                });
                if (res && res.statusCode === 200) {
                    result = res.body.json();
                }
            } catch (e) {}
        });
        // AutoJS 6.5.0版本超时时间无效，改用线程方式
        thread.join(delayed_test * 1000);
        thread.interrupt();
        if (!result)
            urls.splice(j, 1);
    }
    let time = (new Date().getTime() - startTime);
    console.error("提示：识图服务器准备就绪");
    console.error("检查服务器耗时：" + toSeconds(time));
    console.error('可用服务器数量：' + urls.length + '/' + sum_old);
    // 传递消息给主线程，阻塞
    sum.setAndNotify(urls.length);

    // 无阻塞赋值参数
    serverInitSum = urls.length;

}



var sum = threads.disposable();
let urls = [
    // "http://strz.wengzq.v6.rocks/upload", //0
    // "http://strz.wzq.dpdns.org/upload", //1
    // "http://strz.wzqw.zone.id/upload", //2

    // "http://xmst.wengzq.v6.rocks/upload", //3
    // "http://xmst.wzq.dpdns.org/upload", //4
    // "http://xmst.wzqw.zone.id/upload", //5

    // //001俄勒冈
    // "http://xcjd.wengzq.v6.rocks/upload", //6
    // "http://xcjd.wzq.dpdns.org/upload", //7
    // "http://xcjd.wzqw.zone.id/upload", //8

    //clawcloud run 
    "https://xcjdcf.clawc.dpdns.org/upload", //9
    "https://ijakryikwhug.ap-southeast-1.clawcloudrun.com/upload", // 10


    // "http://up.kuandana.v6.rocks/upload", //11
    "http://up.风中拾叶.top/upload", //12

];

//------------ 业务逻辑开始 ----------//

//关闭程序
function killAPP(packageN) {
    var appName = app.getAppName(packageN);
    console.info(">>>>>→关闭" + appName + "←<<<<<")
    //app.openAppSetting(packageN);
    sleep(1000)
    let i = 6;
    while (i-- && !( //textStartsWith("清除").exists() ||
            (text("结束运行").exists() ||
                text("强行停止").exists()) &&
            textStartsWith("权限").exists() &&
            textStartsWith("通知").exists() &&
            textStartsWith("卸载").exists())) {

        if (text("应用详情").exists()) {
            back();
            sleep(500);
            break;
        } else back();

        if (dualRow === 0) {
            if (i % 2 === 0) app.launchSettings(packageN)
            else app.openAppSetting(packageN);
        } else {
            // 分身
            if (i % 2 === 0) app.launchDualSettings(packageN)
            else app.openDualAppSetting(packageN);
        }
        sleep(1500);

        text('取消').exists() && clickCenter('取消');
    }
    clickCenter(text("结束运行").findOne(1500)) ||
        clickCenter(text("强行停止").findOne(1500));
    sleep(1000);

    let qx = className("android.widget.Button")
        .text("取消")
        .findOne(1500)

    if (qx && !qx.isSingleton()) {
        let qd = qx.nextSibling();
        log("点击：" + qd.text())
        //点击取消的下一个按钮(不管按钮是“确定”，还是别的文字)
        ableClick(qd);
    }
    whileClick("确定");

    toastLog("关闭" + appName + "！！！", "forcible");

}



//打开程序
function launchAPP(packageN) {
    if (packageName(packageN).exists()) return true;
    var appName = app.getAppName(packageN);
    console.info(">>>>>→启动" + appName + "←<<<<<")
    toastLog("尝试调起应用：" + appName, "forcible");
    // app.launch(packageN);
    let n = 0;
    // 这个循环走一遍至少需要1秒
    while (!wait(() => packageName(packageN).exists(), 3, 500)) {
        //链式调用权限触发，点“始终允许”
        if (textContains("想要打开").exists() ||
            textContains("尝试开启").exists() ||
            textContains("是否").exists()) {
            sleep(200)
            let yx = className("android.widget.Button")
                .textContains("允许").findOne(1500);
            ableClick(yx);
            break;
        }
        // 残留微信分身选项
        if (textContains("选择").exists() &&
            text("取消").exists()) {
            log("发现分身选项")
            sleep(500);
            let two = contentContains(appName)
                .find(2000);

            let index = Math.min(dualRow, two.length);

            if (two.length > 1) {
                log("选择第" + (index + 1) + "个")
                ableClick(two[index]);
                break;
            } else {
                log('点击：取消')
                whileClick('取消');
            }
        }

        if (packageName(packageN).exists()) break;

        if (dualRow === 0) {
            // 两种启动写法
            if (n % 2 === 0) app.launchPackage(packageN)
            else app.launchApp(app.getAppName(packageN));

        } else {
            // 分身
            if (n % 2 === 0) app.launchDualPackage(packageN)
            else app.launchDualApp(app.getAppName(packageN));
        }

        if (n > 5) {
            if (n === 6 && text('打开').exists() &&
                textStartsWith("权限").exists() &&
                textStartsWith("通知").exists() &&
                textEndsWith('卸载').exists()) {
                ableClick(text('打开'));
                sleep(1500)
                continue;
            }
            // 从详情页启动小米社区
            let yyxq = text("应用详情");
            if (text("应用信息").exists()) {
                toastError("堵车我就抄小路，\n看我排水沟过弯大法！", "long", "forcible");

                let gd = className("android.widget.LinearLayout")
                    .desc("更多");
                ableClick(gd.findOne(600));
                sleep(500)
                ableClick(yyxq.findOne(600));
                sleep(500)
            }
            if (yyxq.exists()) {
                let run = textContains("启动");
                //while (!scrollDown() || !run.exists()) {
                // 上滑寻找“启动”
                swipe(dwidth * 0.5, dheight * 0.8, dwidth * 0.5, dheight * 0.5, 300);
                sleep(300);
                //}
                ableClick(run.findOne(600));
                // clickCenter(run);
                break;
            }
            if (wait(() => packageName(packageN).exists(), 8, 500)) break;

            toastError("无法打开" + appName + "，(*꒦ິ⌓꒦ີ)", "forcible");
            if (config && config.通知提醒)
                notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("无法打开" + appName + "！"));

            return false;
        }
        n++;
    }
    toastLog("成功打开" + appName + "！！！", "forcible");

    return true;
}



//跳过广告
function skipAd() {
    while (!packageName(xmPckageName).exists()) sleep(500);

    let n = 3;
    while (n--) {
        //开屏广告
        if (n > 1 && wait(() => textStartsWith("跳过").exists(), 5, 200)) {
            ableClick(textStartsWith("跳过"));
            log("跳过了开屏广告!");
            sleep(2500);
        }

        let adClose = className("android.widget.ImageView")
            .desc("关闭");
        if (wait(() => adClose.exists(), 2)) {
            ableClick(adClose);
            log("关闭了1个广告!");
        }

        if (wait(() => text('发现新版本').exists(), 2)) {
            ableClick('以后再说');
            log("关闭了升级提示!");
        }
        let readed = textStartsWith('已阅读');
        if (readed.exists()) {
            console.error("发现未登录账号")
            log("开始登录账号...")
            log("√已阅读")
            ableClick(readed.findOne().previousSibling())
            sleep(1000)
            log("→登录")
            ableClick(text('登录'))
            sleep(1500)
            if (readed.exists()) {
                console.error("账号登录失败，请用户手动登录账号！")
                if (config && config.通知提醒)
                    notice(String('小米社区APP账号未登录！'), String('请用户手动登录账号'));

                exit();
            }

        }
        if (n > 0) sleep(500);
    }
    // 尝试刷新
    tryRefresh();
    backAppIndex();
}


//浏览帖子
function posts(n) {
    while (!packageName(xmPckageName).exists()) sleep(500);

    console.info(">>>>>>>→浏览帖子←<<<<<<<")
    toastLog("准备浏览帖子10s……", "long", "forcible")
    sleep(500)
    // 小米社区重置首页
    //backAppIndex();
    let k = 0;
    let pkly = descEndsWith("评论").findOne(3000);
    while (!pkly) {
        console.error("找不到控件，下滑刷新")
        log(`第 ${k+1} 次重试`)

        // 尝试刷新
        tryRefresh();

        if (k > 3 && k < 6)
            ableClick("OS")


        if (k > 6) ableClick("官方")

        if (k > 9) {
            console.error("找不到帖子！")
            return;
        }
        sleep(1000)
        swipe(dwidth * 0.5, dheight * 0.4, dwidth * 0.5, dheight * 0.8, 200);
        wait(() => false, 2000);
        pkly = descEndsWith("评论").findOne(2000);
        k++;

    }
    pkly = pkly.parent();
    ableClick(pkly);
    sleep(1500);


    let n = 6;
    while (n-- && (text("保存").exists() ||
            idStartsWith('videoPlayer_').exists() ||
            content("视频播放器").exists())) {

        console.warn("第" + (6 - n) + "次重试")
        // 误点开图片
        if (text("保存").exists()) {
            back();
            sleep(500);
            break;
        }
        // 点开视频贴
        if (idStartsWith('videoPlayer_').exists() ||
            content("视频播放器").exists()) {
            back();
        }

        // 小米社区重置首页
        backAppIndex();
        // 下滑刷新列表
        swipe(dwidth * 0.5, dheight * 0.4, dwidth * 0.5, dheight * 0.8, 200);
        wait(() => false, 3500);

        // 点击
        pkly = descEndsWith("评论").findOne().parent();
        ableClick(pkly);
        sleep(1500);
    }
    //空白页
    blankMaintain();

    log("正在浏览帖子……");
    for (i = 0; i < 4; i++) {
        wait(() => false, 1000);

        let ran = random(200, 300) * Math.pow(-1, i);
        //gesture(1000, [dwidth * 1 / 2, dheight * 0.8 + ran], [dwidth * 1 / 2, dheight * 0.8 - ran]);
        swipe(dwidth * 0.5, dheight * 0.7 + cY(ran), dwidth * 0.5, dheight * 0.7 - cY(ran), 1000);

        if (i < 3) toast("正在浏览帖子……", "forcible")
        else toastLog("浏览10s完成！Ｏ(≧▽≦)Ｏ ", "forcible");
        sleep(1000);
    }


    // 返回
    back();
    //backAppIndex();
    return;
}



// 重置到小米社区论坛页
function backAppIndex() {
    while (!packageName(xmPckageName).exists()) sleep(500);

    let n = 3;
    console.warn("--→确保重置到[论坛]首页")
    //发现退回图片
    let backImg = content("返回");
    while (backImg.exists() && n--) {
        ableClick(backImg.findOne(1500));
        sleep(300)
    }

    n = 3;
    //发现退回按钮
    let backBut = content("后退");
    while (backBut.exists() && n--) {
        ableClick(backBut.findOne(1500));
        sleep(300)
    }

    n = 3;
    // 返回“论坛”页
    let qdBt = className("android.widget.ImageView")
        .desc("签到");
    while (n-- && qdBt.exists()) {

        let qdbt1 = qdBt.findOne(2000);
        if (qdbt1 &&
            (qdbt1.bounds().centerX() < 0 ||
                qdbt1.bounds().centerY() < 0)) {

            ableClick(text("论坛").findOne(1500));
            sleep(300);
        }
    }

    n = 3;
    let pingLun = className("android.widget.ImageView")
        .desc("评论");
    while (n-- && pingLun.exists()) {

        let pinglun1 = pingLun.findOne(2000);
        if (pinglun1 &&
            (pinglun1.bounds().centerX() < 0 ||
                pinglun1.bounds().centerY() < 0)) {

            ableClick(text("论坛").findOne(1500));
            sleep(300);
        }
    }

    n = 3;
    while (n-- && !(content('论坛').exists() &&
            content('官方').exists() &&
            content('消息').exists() &&
            content('我的').exists())) {
        back();
        sleep(1000);
    }
    ableClick('论坛');
    sleep(1000);

}


//------------ 活动 ----------//

// 小程序报名活动
function xcxRegEvent() {
    if (!config.小程序报名活动提醒 || hasRegEvent) return;
    // 社区APP
    if (!hasRegEvent &&
        wait(() => packageName(xmPckageName).exists(), 2)) {
        if (descEndsWith("发布会报名").exists())
            hasRegEvent = 1;

        if ((text('今天').exists() &&
                text('签到').exists() &&
                text('全新升级').exists())) {

            let nb = textContains('报名活动');
            let button = className("android.widget.Button")
                .content('去报名');
            if (nb.exists() || button.exists())
                hasRegEvent = 1;
        }
    }

    // 小程序
    // if (!hasRegEvent &&
    //     wait(() => packageName(wchatpn).exists(), 3)) {
    //     if (content('活动报名').exists() ||
    //         content('我的报名').exists())
    //         hasRegEvent = 1;
    // }
}



// 进入签到页
function toSign() {
    if (!wait(() => packageName(xmPckageName), 10, 500)) {
        toastError("未打开社区APP", "forcible")
        return false;
    }


    backAppIndex();
    let qd = className("android.widget.ImageView")
        .desc("签到");
    if (!qd.exists()) {
        console.error('未找到签到入口')
        console.error('尝试从其它入口进入！')
        log('→我的');
        ableClick('我的');
        clickCenter('我的')
        log('→连续签到');
        qd = content('连续签到');
    }

    console.info("进入签到页……")
    ableClick(qd);
    clickCenter(qd);

    sleep(1500);

    sleep(wtimes * 1000);

    // 空白页
    blankMaintain();

    let n = 10;
    while (n-- &&
        !(text('今天').exists() &&
            text('签到').exists() &&
            text('全新升级').exists())) {
        // 尝试刷新
        tryRefresh();
        sleep(500);
    }

    if (!(text('今天').exists() &&
            text('签到').exists() &&
            text('全新升级').exists())) {
        console.error('进入签到页失败！')
        //back();
        return false;
    }

    // 小程序报名活动
    threads.start(() => xcxRegEvent());

    return true;

}


// 签到页入口
function signEntrance(name, pram) {
    let nb = textContains(name);

    let button = className("android.widget.Button")
        .content(pram);
    if (!button.exists()) button = content(pram);


    if (!wait(() => nb.exists() && button.exists(), 3, 1000)) {
        clearCache();
        toastError("未找到活动入口，重新进入", "forcible")
        back();

        // 重新进入签到页面
        sleep(1000);
        if (!toSign()) return false;
        sleep(1000);
    }

    log("点击按钮→" + pram)

    if (!nb.exists() || !ableClick(button.findOne(2000))) {
        console.error('未找到入口和按钮：' + pram)
        return false;
    }

    sleep(2000);

    sleep(wtimes * 1000);

    // 空白页
    blankMaintain();

    // 再点击一次，
    // 如果前面点击成功，页面跳转，新页面肯定找不到按钮
    if (pram !== '立即签到') {

        content(pram).exists() &&
            clickCenter(pram);

        // 尝试刷新
        tryRefresh();
    }


    return true;
}


//拔萝卜活动
function pullingCarrots(pram) {
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '去看看';

    while (!packageName(xmPckageName).exists()) sleep(500);
    console.info(">>>>>>→拔萝卜活动←<<<<<<")
    toastLog("拔萝卜活动签到……", "forcible");

    if (!signEntrance('拔萝卜', pram))
        return;

    if (wait(() => text("拔萝卜").exists() ||
            text('签到成功').exists() ||
            content("查看金币详情").exists() ||
            content('前往金币商城').exists(),
            3, 1000)) {
        toastLog("拔萝卜已签到！", "forcible");
        sleep(1000);
        back();
    }
}



//米粉节活动
function fans(pram) {
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '去参与';

    while (!packageName(xmPckageName).exists()) sleep(500);
    console.info(">>>>>>→米粉节活动←<<<<<<")
    toastLog("米粉节活动签到……", "forcible");

    if (!signEntrance('米粉节', pram))
        return;

    let dianl = className("android.widget.Button")
        .content("点亮今日足迹").findOne(1500);
    if (!dianl) {
        dianl = className("android.widget.Button")
            .content("抽取今日祝福").findOne(1500);
    }

    if (ableClick(dianl))
        toastLog("今日祝福已抽取", "forcible");

    back();
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
        ableClick(watch);
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


//加入圈子活动
function join() {
    let qujiaru = className("android.widget.Button")
        .content("去加入").findOne(1500)
    if (qujiaru) {
        ableClick(qujiaru)
        let join = className("android.widget.Button")
            .content("加入圈子").findOne(1500).click()
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
function ganenji(pram) {
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '去参加';

    while (!packageName(xmPckageName).exists()) sleep(500);
    console.info(">>>>>>→感恩季活动←<<<<<<")
    toastLog("感恩季活动签到……", "forcible");

    if (!ableClick(pram)) {
        //返回首页外层
        backAppIndex();
        log('→我的')
        ableClick(text("我的"));

        // 尝试刷新
        tryRefresh();

        swipe(dwidth * 0.5, dheight * 0.8, dwidth * 0.5, dheight * 0.6, 100); // 向下滚动查找
        //while (scrollDown());
        sleep(1000)
        log('进入活动页面')
        if (!ableClick(descContains('感恩').findOne(5000))) {
            console.error('找不到活动入口')
            return;
        }
    }

    开盒();
    back();

}


// 双旗舰
function dualFlagships(pram) {
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '去参加';

    while (!packageName(xmPckageName).exists()) sleep(500);
    console.info(">>>>>>>→旗舰活动←<<<<<<<")
    toastLog("开始双旗舰活动……", "forcible")
    if (!signEntrance('双旗舰', pram))
        return;

    开盒();
    back();

}



function 开盒() {
    // 有活动标志
    xmsq_act = true;

    let register = className("android.widget.Button")
        .content("立即报名");
    let qts = className("android.widget.Button").content("去提升");

    // 页面没成功加载
    if (!wait(() => register.exists() || qts.exists() || desc("后退").exists(), 6, 1000)) {
        // 尝试刷新
        tryRefresh();
        sleep(2000);
        // back();
        // return;
    }
    sleep(1000);

    // -------------- 报名页面(第一次才有)  ------------/
    if (wait(() => register.exists(), 2, 600)) {
        log("开始自动报名")
        register = register.findOne();
        // sleep(500)
        // 勾选 “我已阅读并同意”
        let checkBox = register.nextSibling();
        if (!checkBox.clickable() && checkBox.hasChildren())
            checkBox = checkBox.firstChild();

        sleep(500);
        if (ableClick(checkBox)) {
            log("勾选√我已阅读并同意")
            //立即报名
            ableClick(register);
            log("点击→立即报名")
            sleep(1000)
            let qd = className("android.widget.Button")
                .contentStartsWith("确定").findOne(1500);
            log("点击→确定")
            if (!ableClick(qd)) {
                //机型确认，识别不到组件，也无法识别到（“确定”）文字，
                //位置在右下角
                click(dwidth * 0.74, navBarY - cY(120));
            }
            sleep(1500);
        }
    }

    // -------------- 开箱页面  ------------/
    let ddjs = wait(() => text('等待解锁').exists(), 2, 800);
    let jpso = wait(() => text('可解锁').exists(), 2, 800);
    if (!ddjs && !jpso) {
        // if (1) {
        console.warn("不好了，布局分析失效了！")
        console.warn("无法判断是否有解锁次数，")
        console.warn("只能[摸黑]点击了再说。")
        console.warn('滑到最下面↓')
        for (let i = 0; i < 5; i++) {
            swipe(dwidth * (2 + i) / 8, navBarY * (0.5 + 0.02 * i), dwidth * (2 + i) / 8, navBarY * (0.3 + 0.02 * i), 100);
            gesture(100, [dwidth * (2 + (5 - i)) / 8, navBarY * (0.5 + 0.02 * i)], [dwidth * (2 + (5 - i)) / 8, navBarY * (0.3 + 0.02 * i)]);
            sleep(100);
        }
        sleep(600);
        let m = 3;
        while (m--) {
            console.warn(`[摸黑]点击第 ${3-m} 个`);
            for (let i = 0; i < 2; i++) {
                click(dwidth * (0.7 - m * 0.2), navBarY * 0.6);
                sleep(1000);
            }
            if (config.开盒活动关闭坐标) {
                log('开盒活动关闭坐标：')
                log('X_x：' + config.X_x)
                log('X_y：' + config.X_y)
                log('点击坐标关闭弹窗：' + click(config.X_x, config.X_y))

            } else {
                log('[摸黑]关闭弹窗')
                console.error('若关闭失败，可修改配置[开盒活动关闭坐标]')
                console.warn('自定义X按钮坐标')
                // 关闭提示
                for (let i = 0; i < 3; i++) {
                    click(dwidth * 0.5, navBarY * (0.82 + 0.01 * i));
                }
            }
            if (m > 0) {
                console.warn("等待3秒……")
                sleep(300);
                for (let i = 0; i < 5; i++) {
                    swipe(dwidth * (2 + i) / 8, navBarY * (0.5 + 0.02 * i), dwidth * (2 + i) / 8, navBarY * (0.3 + 0.02 * i), 100);
                    gesture(100, [dwidth * (2 + (5 - i)) / 8, navBarY * (0.5 + 0.02 * i)], [dwidth * (2 + (5 - i)) / 8, navBarY * (0.3 + 0.02 * i)]);
                    sleep(300);
                }
            }
        }
    } else if (!ddjs && jpso) {
        let j = 0;
        do {
            //开盒有3秒间隔限制
            if (j > 0) {
                log('等待3秒开下一个');
                sleep(3000);
            }
            //开盒
            ableClick(text('可解锁').findOne(2000));
            log("尝试第" + (j + 1) + "次解锁！(/≧▽≦)/~┴┴ ");
            sleep(500);

            let result = textStartsWith('恭喜获得')
                .textContains('奖品')
                .findOne(1500)

            if (result) {

                let pp = (result.sibling(1).text() ??
                        result.sibling(0).text())
                    .replace(/[\n\r]/g, ' ')

                console.warn(pp)

                let prize = result.text() ?? '';
                let idx = prize.indexOf('，');
                let part1 = prize.slice(0, idx);
                console.error(part1)

                if (prize.includes('实物')) {
                    let part2 = prize.slice(idx + 1);
                    console.error(part2)
                    if (config && config.通知提醒)
                        notice(String('小米社区中大奖啦！！！'),
                            String(pp + "\n" + part2))
                }

                // console.error(prize.split('，')[0])
            }
            if (!result)
                result = className("android.widget.Button")
                .content("炫耀一下").findOne(1000);

            // 关闭炫耀一下
            if (result) {
                ableClick(result.parent().nextSibling());
                // 关闭图形❌组件
                //clickCenter(xyyx);
            } else {
                // 无法识别到“炫耀一下”弹窗，也无法识别关闭图形❌组件
                // 只能靠坐标关闭
                for (let i = 0; i < 3; i++) {
                    click(dwidth * 0.5, navBarY * (0.82 + 0.01 * i));
                }
            }
            j++;
        } while (wait(() => text('可解锁').exists(), 3));
        toastLog("解锁次数已耗尽！", "forcible")
    } else {
        toastLog("本次无解锁次数！", "forcible");
    }
    if (ddjs || jpso) {
        let up = textStartsWith('再提升').findOne(2000);
        if (up) {
            console.warn(up.text() + "，可再次开盒！");
        }
    }

    sleep(1000);
}

//------------ 小程序签到 ----------//

function 小程序签到(pram) {
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '去微信';

    console.info(">>>>>>→小程序签到←<<<<<<")

    if (!app.isInstalled(wchatpn)) {
        console.error("微信APP未安装！")
        return;
    }

    toastLog("正在尝试打开小程序……", "forcible");

    //小米社区5.3.2以上版本进入小程序
    let isEnabled = isAtLeast(xmVersionName, xmAtLeastVersionName);
    let v53 = className("android.widget.Button")
        .content(pram).findOne(2500);
    if (isEnabled && v53 && !config.坐标点击) {
        openVChat(v53);

    } else {
        toastLog("尝试从桌面寻找小程序……", "forcible")
        // toHome();
        //  sleep(300);
        toHome();
        sleep(300);
        toHome();
        sleep(600);
        desktopRun();
    }
    clearCache();
    sleep(1500);

    if (config.小程序等待延迟)
        sleep(config.小程序等待延迟 * 500);


    let k = 3;
    // 微信打开验证（小程序依赖微信，使用微信的包名）
    while (k-- && !wait(() => packageName(wchatpn).exists(), 5, 600)) {
        //再次尝试打开一次，以确保能顺利打开小程序
        toastWarn("小程序未打开", "forcible")
        toastWarn("准备重试！", "forcible")
        toHome();
        sleep(1666);
        if (isEnabled && v53 && !config.坐标点击) {
            // console.error("社区APP跳转无法重试！", "forcible")

            // 打开社区APP
            launchAPP(xmPckageName);
            while (!packageName(xmPckageName).exists()) sleep(500);
            sleep(1666);
            let sign = className("android.widget.ImageView")
                .desc("签到");
            if (wait(() => sign.exists(), 3, 500)) {
                ableClick(sign.findOne());
                sleep(666);
            }
            // 点击按钮
            openVChat(v53);

            // 如果没打开小程序，就手动启动微信
            if (!wait(() => packageName(wchatpn).exists(), 8, 600)) {
                launchAPP(wchatpn);
                sleep(5000)
            }
        } else {
            desktopRun();
        }
        clearCache();
        sleep(1500);
    }


    if (config.小程序等待延迟)
        sleep(config.小程序等待延迟 * 500);


    //打开验证
    if (!wait(() => packageName(wchatpn).exists(), 10, 600)) {
        // if (!wait(() => xxcx.exists(), 6, 500)) {
        // 找不到微信的包名，自然也没能进入小程序
        console.error("packageName")
        toastError("进不了微信小程序，我尽力了！(ó﹏ò｡) ", "long", "forcible");
        if (config && config.通知提醒)
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("进不了微信小程序，我尽力了！"));
        back();
        return;
    }

    log("已启动微信包名应用")

    clearCache();

    let xxcx = className("android.widget.ImageButton")
        .desc("更多").packageName(wchatpn);
    // 已打开微信，但未打开小程序。模拟从微信进入小程序
    if (!wait(() => xxcx.exists(), 8, 600) &&
        (content("通讯录").exists() || desc("返回").exists() || descStartsWith("更多功能").exists())
    ) {
        toastWarn("已打开微信，但未打开小程序！", "forcible");
        toastWarn("尝试从微信进入小程序……", "long", "forcible");
        sleep(1000)
        // 确保回到微信首页
        let bak = className("android.widget.ImageView")
            .desc("返回");

        while (bak.exists() && clickCenter(bak)) sleep(1500);

        clickCenter("微信");

        // 微信下滑
        log("下滑")
        let n = 5;
        while (n--) {
            swipe(dwidth * 0.5, dheight * 0.4, dwidth * 0.5, dheight * 0.7, (n + 2) * 100);
            sleep(300)
        };

        while (bak.exists() && clickCenter(bak)) sleep(1500);

        if (textEndsWith('小程序').exists()) {
            let xlxcx = descStartsWith('小米社区').clickable();
            // 去“更多”，最近使用小程序，里寻找
            if (!wait(() => xlxcx.exists(), 5, 500)) {
                let gengd = className("android.widget.TextView")
                    .text("更多").findOne()
                ableClick(gengd);
                let m = 3;
                while (!xlxcx.exists() && m--) {
                    swipe(dwidth * 0.5, navBarY * 0.7, dwidth * 0.5, navBarY * 0.4, (m + 2) * 100);
                    sleep(1500);
                };
            }
            ableClick(xlxcx.findOne(1000));
            log("点击小程序图标")
        }
        clearCache();
        sleep(1500);
    }

    if (config.小程序等待延迟)
        sleep(config.小程序等待延迟 * 500);

    // 判断成功打开小程序
    let open = false;
    let wcl = 99;
    while (!open) {
        if (xxcx.exists() ||
            (text('我知道了').exists() && ableClick(text('我知道了')))) {
            open = true;
            break;
        }
        // 尝试刷新
        tryRefresh();
        // 布局分析可能失效
        if (wcl > 0 && wcl < 5) {
            sleep(2000);
            wcl = packageName(wchatpn).find(2000).length;
            if (wcl > 0 && wcl < 5) open = true;
            // break;
        }
        wcl = packageName(wchatpn).find(2000).length;
    }

    // 布局分析失效，点“我知道了”
    if (wcl > 0 && wcl < 5) {
        sleep(500)
        click(dwidth * 0.5, navBarY * 0.53);
        sleep(1500);
        click(cX(60), statusBarHeight + cY(65));
        sleep(1000);
    }


    log("成功打开小程序！")

    //sleep(1000);
    console.info("-----→>→签到操作←<←-----");
    let me = packageName(wchatpn).content("我的");

    if (wait(() => me.exists() ||
            (text('我知道了').exists() && ableClick(text('我知道了'))), 6, 600)) {
        toastLog("正在进入[我的]页面……", "forcible")
        // 使用能点击的父控件
        let mep = me.findOne(2000);
        //点我的
        ableClick(mep);
        //clickCenter(mep);
        sleep(1500);
        //点论坛
        ableClick("论坛");
        //click("论坛")
        sleep(1500);
        //再点“我的”
        ableClick(mep);
        //clickCenter(mep);

        // 等待页面加载
        if (wait(() => !text('编辑资料').exists() &&
                (text("未登录账号").exists() || contentStartsWith("登录").exists()),
                10, 500)) {
            console.error("发现账号未登录!!!")
            log("尝试一键登录...")
            xcxLoginAccounts(null, null)
        }


        //sleep(1500);
        if (wait(() => (text('去签到').exists() || text('已签到').exists()), 10, 500)) {
            let qqd = text("去签到").findOne(1000);
            if (qqd) {
                threads.start(() => saveXcXButton(qqd));
                ableClick(qqd);
                // 重复签到
                clickCenter(qqd);
                toastLog("小程序签到成功！✧٩(ˊωˋ*)و✧", "forcible")
            } else {
                threads.start(() => saveXcXButton("已签到"));
            }
        } else {
            toastWarn("不好了！布局分析失效了！Σ(ŎдŎ|||)ﾉﾉ", "forcible")
            toastWarn("只能摸黑操作，点击坐标试试看……")
            log('等待5秒后继续操作，确保页面加载')
            sleep(5000);
            // 点击"签到"
            mhqdClick();
        }

    } else {
        toastWarn("不好了！布局分析失效了！Σ(ŎдŎ|||)ﾉﾉ", "forcible")
        sleep(1500)
        toastWarn("只能摸黑操作，点击坐标试试看……")

        // 先点击"论坛"，以防页面卡顿
        let d = 2;
        while (d--) {
            click(dwidth * 0.15, navBarY - cY(35));
        }
        sleep(1500)

        // 点击"我的"
        d = 2;
        toastWarn("[不确定操作]摸黑→点击[我的]！")
        while (d--) {
            click(dwidth * 0.85, navBarY - cY(35));
        }
        // 确保页面加载完成，多等会儿吧！
        // 不能识别，只能盲目等待了！
        log('等待5秒后继续操作，确保页面加载')
        sleep(5000);
        mhqdClick();
    }

    // 小程序报名活动
    // xcxRegEvent();

    toastLog("小程序今日已签到！", "forcible")
    // 记录成长值
    if (config.成长值记录 === 2) level2();
    sleep(1000);
    // 确保完成之后小程序回到最外面一层，下次打开小程序不会在子页面。
    back();
    sleep(1000);
}

// 读取小程序签到按钮中心坐标
function getXcXButton() {
    if (!files.exists(xcx_bt_center))
        return false;

    try {

        let button = JSON.parse(files.read(xcx_bt_center));

        if (button.button_name) {
            if (button.button_name !== "去签到" &&
                button.button_name !== "已签到")
                return false;

            if (button.auto_button_x && button.auto_button_x > 0 &&
                button.auto_button_y && button.auto_button_y > 0) {

                return [
                    button.auto_button_x,
                    button.auto_button_y,
                    button.button_name
                ];

            }
        }
    } catch (e) {};

    return false;
}

// 保存小程序签到按钮中心坐标
function saveXcXButton(obj) {
    // 已存在
    if (getXcXButton() &&
        getXcXButton()[2] === "去签到")
        return;

    try {
        if (typeof obj === 'string') {
            obj = content(obj);
        }

        if (obj instanceof UiSelector) {
            obj = obj.findOne(2000);
        }

        if (obj && (obj instanceof UiObject)) {
            let x = obj.bounds().centerX();
            let y = obj.bounds().centerY();
            //log(x, y)

            // 1. 创建 Map 并添加数据
            let auto_button = new Map();
            auto_button.set("button_name",
                (obj.text() ?? obj.desc()))
            auto_button.set("auto_button_x", x);
            auto_button.set("auto_button_y", y);
            // log(Object.fromEntries(auto_button));
            files.write(xcx_bt_center,
                JSON.stringify(Object.fromEntries(auto_button),
                    null, 2));
        }
    } catch (e) {};
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
        sleep(1000);
        log("二击：" + click(x, y));
        sleep(1000);
        log("三击：" + click(x, y));
    } else {
        toastWarn("[不确定操作]摸黑→点击[签到]！")
        let xcXButton = getXcXButton();
        if (xcXButton) {
            log("发现自动识别的签到坐标：[" + xcXButton[0] + ", " + xcXButton[1] + "]")
            click(xcXButton[0], xcXButton[1]);
            sleep(500)
            click(xcXButton[0], xcXButton[1]);
            sleep(500)
        } else {
            for (i = 0; i < 5; i++) {
                click(dwidth * 0.73, navBarY * (0.48 + 0.01 * i));
                // click(dwidth * 0.77, dheight * (0.47 + 0.01 * i));
                click(dwidth * 0.817, navBarY * (0.48 + 0.01 * i));
                //  click(dwidth * 0.86, dheight * (0.47 + 0.01 * i));
                click(dwidth * 0.90, navBarY * (0.48 + 0.01 * i));
            }
        }

    }

    //  sleep(1000);
    toastWarn("[不确定][签到]，假装已完成！")
}


// 跳转打开微信小程序
function openVChat(button) {
    if (button)
        log("点击：" + (button.text() ?? "") + (button.desc() ?? ""))

    ableClick(button);
    //sleep(2000);

    let n = 3;
    while (n--) {

        if (wait(() => (textContains("选择").exists() && text("取消").exists()), 3, 600)) {
            // 存在微信分身，选择第1个
            let one = contentContains("微信").find(2000);

            let index = Math.min(dualRow, one.length);

            log('发现微信分身');
            if (one.length > 1) {
                sleep(1000);
                console.error('选择第 ' + (index + 1) + ' 个微信！');
                ableClick(one[index]);
                sleep(1000);
                if (clickCenter(one[index])) sleep(2000);
                break;
            }
            console.error('未找到微信选项');
        }
    }
    sleep(2000);
}


// 桌面打开小程序操作
function desktopRun() {
    if (config.坐标点击 === 1) {
        log("用户配置→{坐标点击:1}")
        toastLog("从第3屏，用户提供的坐标寻找……", "forcible")
        //第3屏获取小程序
        let tr = className("android.widget.ImageView")
            .desc("第3屏");
        //寻找第3屏
        if (!wait(() => tr.exists(), 5, 600)) {
            console.error('找不到第3屏（˃̣̣̥᷄⌓˂̣̣̥᷅）！');
            if (config && config.通知提醒)
                notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("找不到第3屏（˃̣̣̥᷄⌓˂̣̣̥᷅）！"));
            exit();
        }

        if (ableClick(tr.findOne()) || clickCenter(tr.findOne())) {
            sleep(1666);
            for (i = 0; i < 3; i++) {
                toastLog("点击坐标[" + config.x + "," + config.y + "]")
                log(click(config.x, config.y));
                sleep(1000);
            }
        }

    } else {
        log("用户配置→{坐标点击:" + config.坐标点击 + "}")
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
                    ableClick(xcx.get(i));
                    log("正在尝试打开→第[ " + (i + 1) + " ]个！");
                    if (wait(() => packageName(xmPckageName).exists(), 6, 500)) {
                        toastError("这个不对，尝试下一个！", "forcible");
                        toHome();
                        sleep(1600);
                    } else {
                        log("已找到小程序图标！");
                        ableClick(xcx.get(i));
                        toastLog("小程序打开缓慢，请耐心等待……", "long", "forcible");
                        break;
                    }
                }
                log("←----------—————————");
            } else {
                // 多点一下
                ableClick(xcx.get(0));
                sleep(1000);
                ableClick(xcx.get(0));
                sleep(1000);
                ableClick(xcx);
            }
        } else {
            toastError("也许你对我的爱藏的太深，让我无法发现……", "forcible")
            toastError("也许你根本就在骗我……（▼へ▼メ）", "forcible")
            console.error("请把小程序图标放在桌面上，无论放第几屏都好。")
            console.error("但不要藏在文件夹里，那样真找不到。")
            if (config && config.通知提醒)
                notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("我在桌面上找不到小程序图标，\n麻烦把它放在好找的地方（˃̣̣̥᷄⌓˂̣̣̥᷅）！"));
        }
    }
}

// 更换小程序账号
function xcxLoginAccounts(accounts, password) {
    // console.info(">>>>→更换账号(小程序)←<<<<")
    // log("→我的")
    // ableClick("我的")
    // sleep(1000)
    let acc = textStartsWith("小米ID")
        .findOne(2000)
    // let nickname = null;
    // if (acc) {
    //     nickname = acc.previousSibling().text();
    //     log("当前账号昵称：" + nickname)

    //     //  成长值记录.昵称 = nickname
    // }

    // if (!text("未登录账号").exists() && !text("登录").exists()) {
    //     console.warn("正在退出当前账号...")
    //     // log("→设置")
    //     ableClick(text('设置'))
    //     sleep(1000)

    //     //  log("→退出登录")
    //     ableClick(text('退出登录'))
    //     sleep(1500)
    //     //  log("→确定")
    //     ableClick(text('确定'))
    //     sleep(1000)
    //     clickCenter(text('确定'))

    // }
    console.warn("------>→ 登录账号 ←<------")
    //  sleep(2000)
    //  log("→我的")
    ableClick("我的")
    sleep(1000)
    //log("→登录")
    ableClick(text('登录'))
    sleep(1000)
    clickCenter(text('登录'))

    wait(() => text("小米社区").exists(), 10, 600)

    if (accounts && password) {
        // log("→其他账号登录")
        ableClick(text('其他手机号登录'))
        sleep(1500)
        log("→密码登录")
        ableClick(text('用户名密码登录'))
        sleep(500)
        log("输入账号：" + accounts)
        textStartsWith('邮箱/手机号码/小米ID').findOne().setText(accounts);
        sleep(500)

        log("输入密码")
        //  if (config.打印密码)
        console.error(password)

        let passw = className('EditText')
            .textStartsWith('请输入密码')
            .findOne(2000)
        if (passw) {
            passw.setText(password);
        }
        sleep(500)

    } else {
        log("微信绑定账户登录")
    }

    let readed = textStartsWith('已阅读').findOne(3000);
    if (readed) {
        // log("√已阅读")
        ableClick(readed.previousSibling())
        sleep(1000)
    }

    /// log("→登录")
    let loginButton = text("一键登录").findOne(3000) ||
        text('登录').findOne(3000);

    ableClick(loginButton)
    sleep(1000)
    //  clickCenter(loginButton)
    ableClick("同意")

    acc = textStartsWith("小米ID")
        .findOne(3000)
    // while (!acc) {

    //     sleep(2000)

    //     if (!acc && text('小米账号登录').exists()) {
    //         console.error("用户名密码错误")
    //         back()
    //         sleep(2000)
    //         back()

    //         while (text("小米社区").exists()) {
    //             let bb = text("小米社区").findOne(1000)
    //             if (!bb) bb = textStartsWith('已阅读').findOne(!000);
    //             if (!bb) bb = text('一键登录').findOne(!000);

    //             if (bb) {
    //                 bb.firstSibling();
    //                 ableClick(bb)
    //                 sleep(1000)
    //                 continue;
    //             }


    //         }
    //         return false;
    //     }
    //     acc = textStartsWith("小米ID")
    //         .findOne(2000)

    // }

    if (acc) {
        log("登录成功！")
        nickname = acc.previousSibling().text();
        log("现在账号昵称：" + nickname)

    } else console.error("登录失败!!!");

    console.warn("------>→ 登录 end ←<------")
    return true;
}



//------------ 社区APP签到 ----------//

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



function start(pram) {
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '立即签到';

    while (!packageName(xmPckageName).exists()) sleep(500);

    console.info(">>>>>>>→开始签到←<<<<<<<")
    if (!config.社区APP签到方式) {
        console.error(`配置[社区APP签到方式：${config.社区APP签到方式}]`);
        toastError("取消签到！", "forcible")
        //back();
        sleep(1000);
        return;
    }
    // percentage = logpercentage();
    var done = text("已签到");

    while (!done.exists() && !text(pram).exists()) sleep(1000)

    var done_success = false;
    try {
        if (!done.findOne(1666)) {
            //控制台缩小
            if (config.悬浮窗控制台_签到时最小化)
                consoleCollapse();

            consoleMin();

            //开始程序
            findCenter(pram);
        }
        if (done.findOne(1666)) {
            toastLog("今日已签到！", "forcible");
            done_success = true;
        }
        if (!done_success)
            toastError("签到失败！", "forcible")

    } catch (e) {
        global.unfinished_mark = 1;
        console.error("社区APP签到失败！");
        console.error(e.message);

        if (config && config.通知提醒)
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("社区APP签到失败了！"));

    } finally {
        //展开悬浮窗控制台
        console3();
        // 恢复最小化
        consoleExpand();
        try {
            images.stopScreenCapture();
        } catch (e) {}

    }

}



//社区APP，点击“立即签到”
function findCenter(pram) {

    toastLog("开始签到……", "forcible");

    clearCache();

    if (config.社区APP签到方式 === 1) {
        // 识图签到都不行了
        if ((!enlocalYOLO || !yoloProcessor) &&
            serverInitSum === 0) {
            global.unfinished_mark = 1;
            console.error('识图签到准备阶段失败');
            toastError("取消签到！", "forcible")
            back();
            sleep(1000);
            return;
        }
    }


    if (!signEntrance(pram, pram))
        return;


    // 等待验证图片的加载
    sleep(2000);
    let result = wait(() =>
        (content("关闭验证").exists() ||
            content("刷新验证").exists() ||
            content("视觉障碍").exists()),
        5, 800);

    // 加强识别
    let n = 3;
    while (!result && n--) {
        if (!ableClick(content('请点击此处重试').findOne(2000)))
            clickCenter(content(pram).findOne(2000));

        sleep(2000);
        result = className("android.widget.Button")
            .content("关闭验证").findOne(1500);
        if (!result) {
            result = className("android.widget.Button")
                .content("刷新验证").findOne(1500);
            if (!result) {
                result = className("android.widget.Button")
                    .content("视觉障碍").findOne(1500);
                if (!result) {
                    result = className("android.widget.Button")
                        .content("帮助反馈").findOne(1500);
                }
            }
        }
    }
    if (!result) {
        toastError("芭比Q了，点不开签到页面！", "forcible");
        toastError("建议清除社区应用数据，重新登录账号再试！", "forcible");
        throw Error();
        return;
    }
    //屏幕截图
    //captureScr();
    if (config.社区APP签到方式 === 1 ||
        textStartsWith("请在下图依次点击").findOne(3000)
    ) {
        // 未初始化
        if (!enlocalYOLO && !serverInitStart) {
            console.warn('识图签到未初始化！');
            log('启用初始化……');
            initImageReco(true);
        }
        textStartsWith("请在下图依次点击").findOne();
        sleep(1000);
        // 识图认证
        imageRecoSign();
    } else {
        captureScr();
        //滑块认证
        auth_hk();
    }

}



// 屏幕截图，并保存
function captureScr() {
    log("准备屏幕截图......")
    sleep(500)
    //悬浮窗控制台最小化
    //consoleCollapse();
    try {
        // 请求截图权限
        if (!images.requestScreenCapture()) {
            toastError("请求截图权限失败！˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
            console.error("可能涉及'投影媒体'权限、手机屏幕共享，或者手机重启试试！");
            return;
        }

        log("开始截图")
        sleep(2000);
        if (!captureScreen(p2Path)) {
            sleep(500)
            var pictures2 = images.captureScreen();
            images.save(pictures2, p2Path, "png", 100);
            pictures2.recycle();
        }

        log("屏幕截图成功！");
        // log("全屏截图路径：");
        // log(p2Path);
    } catch (e) {
        toastError("截图出错！")
        throw Error();
        return;
    }
    sleep(1000);

}


//------------ 识图签到 ----------//

// 识图签到
function imageRecoSign() {
    //剪图，并获得参数
    //let clipParam = getClipPic();
    // 坐标集合
    let success = false;
    let n = 2;
    while (!success && n--) {
        if (enlocalYOLO) {
            //使用本地YOLO模型
            success = localYOLOSign();
        } else {
            console.error('启用服务器识图签到');
            //使用服务器YOLO
            success = serverYOLOSign();
        }

        // 失败，准备重试
        if (!success) {
            console.error("遇到错误，提交失败");
            let salt = (enlocalYOLO ? 'local' : 'server') + '_unknown';
            // 备份错误图片
            saveErroFile(CAPTURE_PIC_PATH, salt);
            saveErroFile(p2Path, salt)

            console.error("准备重试……");
            clickCenter('请点击此处重试');

            //启用服务器签到
            enlocalYOLO = enlocalYOLO ? false : true;
            if (!serverInitStart) {
                threads.start(() => webTest());
            }

            let refresh = className("android.widget.Button")
                .content("刷新验证").findOne(2500);

            ableClick(refresh);
            // clickCenter(refresh);
            //重新截图
            // captureScr();
            //getClipPic();
            sleep(1000);

        }
    }
    if (!success) {
        if (enlocalYOLO || serverInitSum > 0) {
            console.error('可能验证码区域有遮挡');
            console.error('查看下面目录文件：');
            console.error(' 1.tmp/pic.png');
            console.error(' 2.tmp/error/子目录最新文件');
        }

        throw Error('签到失败，查看日志排查问题');
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
        h: (cY(1633) - y)
    };
    // sleep(1000);

    let n = 5;
    let tida = null;
    let ycdj = null;
    do {
        if (!tida) {
            tida = className("android.widget.Button")
                .content("确认").findOne(2000);
            if (!tida) {
                tida = className("android.widget.Button")
                    .content("提交答案").findOne(2000);
            }
        }

        if (!ycdj)
            ycdj = textStartsWith("请在下图依次点击").findOne(2000);


        if (!tida || !ycdj) {
            if (content('请点击此处重试').exists())
                ableClick(content('请点击此处重试').findOne(2000))

            continue;
        }

        // 若找到参照组件，就更新参数
        if (ycdj && tida) {
            const topX = ycdj.top();
            const bottomX = ycdj.bottom();

            if (ycdj.right() < tida.right()) {
                // 记录小图标起始x位置
                global.x_refer = ycdj.right() - ycdj.left() - cX(20);
            }


            //找到合适的父组件
            while (ycdj.right() < tida.right() ||
                (ycdj.parent() &&
                    ycdj.parent().top() > 0 &&
                    ycdj.parent().top() <= topX &&
                    ycdj.parent().top() < bottomX &&
                    ycdj.parent().left() > 0 &&
                    ycdj.parent().right() < dwidth &&
                    ycdj.parent().bottom() < tida.top() &&
                    ycdj.parent().bounds().centerY() < bottomX)) {
                ycdj = ycdj.parent();
            }

            if (ycdj.top() > topX ||
                ycdj.top() > bottomX ||
                ycdj.bottom() > tida.top() ||
                ycdj.right() < tida.right() ||
                ycdj.bounds().centerY() > bottomX) {
                sleep(500)
                tida = null;
                ycdj = null;
                continue;
            }

            // 二次校准数据
            // 左侧
            let left = ycdj.parent().left() < ycdj.left() &&
                ycdj.parent().left() > 0 ?
                ycdj.parent().left() : ycdj.left();
            // 顶部
            let top = ycdj.parent().top() < ycdj.top() &&
                ycdj.parent().top() > 0 ?
                ycdj.parent().top() : ycdj.top();
            // 右边缘
            let right = tida.parent().right() > ycdj.right() &&
                tida.parent().right() < dwidth ?
                tida.parent().right() : ycdj.right();

            param.x = left;
            param.y = top;
            param.w = right - param.x;
            param.h = tida.top() - param.y;

            // 上下图标分界y
            global.y_refer = ycdj.bottom() - param.y;

            // 反馈截图最上方高度 
            global.picY = param.y;

        }

    } while ((!tida || !ycdj || param.w < 1 || param.h < 1) && n--);


    // 修正控制台高度
    consoleMin();

    //屏幕截图
    captureScr();

    try {
        //剪小图
        let pictures2 = images.read(p2Path);
        let pic = images.clip(pictures2,
            param.x, param.y,
            param.w, param.h);

        images.save(pic, CAPTURE_PIC_PATH, "png", 100);

        // log("验证码图片路径：");
        // log(CAPTURE_PIC_PATH);

        pictures2.recycle();
        pic.recycle();

    } catch (e) {
        console.error("截图参数clipParam:")
        console.error(clipParam)
        throw e;
    }

    return param;
}


// 点击图标，返回是否成功
function clickPic(list, clipParam) {
    if (!list || list.length < 1) {
        console.error("坐标数据为空！");
        return false;
    }
    try {
        console.info("────────────");
        for (let i = 0; i < list.length; i++) {
            let x = list[i][0] + clipParam.x;
            let y = list[i][1] + clipParam.y;
            let icon = list[i][2];
            let prob = list[i][3];
            log(" ┌ 第" + (i + 1) + "个图标：" + icon);
            log(" ├ 置信度：" + prob)
            log(" ├ 坐标：(" + x + ", " + y + ")")
            console.warn("└ 点击结果：" + click(x, y));
            if (i < list.length - 1)
                console.info("--------------------");
            sleep(800)
        }
        console.info("────────────");

        log("图标点击完成！");
        sleep(1000);

        let tida = null;
        let n = 5;
        do {
            tida = className("android.widget.Button")
                .content("确认").findOne(3000);
            if (!tida) {
                tida = className("android.widget.Button")
                    .content("提交答案").findOne(2000);
            }
        } while (!tida && n--);

        if (!tida) {
            console.error("提交按钮属性被小米改了");
            console.error("快提醒脚本作者修改代码");
            throw Error();
        }

        console.info(' →点击提交按钮：' + ableClick(tida));
        sleep(2000);

        sleep(wtimes * 1000);
        if (wait(() => text("已签到").findOne(2000), 3)) {
            let today = text("今天").findOne(2000);
            if (today) {
                let value = today.previousSibling().text();
                console.warn("获得成长值：" + value)
            }
            toastLog("识图签到成功！！！(๑´∀`๑)");
            return true;
        }


    } catch (e) {
        throw e;
    }
    toastError("提交失败！");

    return false;
}



// 保存错误文件，用salt区分 类别
function saveErroFile(path, salt) {
    if (!files.exists(path)) return false;
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
    //保留10个错误文件
    for (i = arr.length - 1; arr.length > 20; i--) {
        files.remove(errorDir + arr[i])
    }

    console.error("保存错误图片路径：");
    console.error(errorDir + filename);

    //复制文件
    return files.copy(path, errorDir + filename);
}



//------------ 本地识图签到 ----------//

/**
 * 本地YOLO模型，返回坐标
 */
function localYOLOSign() {
    if (!yoloProcessor) {
        toastError("YOLO 模块未加载，无法本地识图签到");
        return null; // 表示签到失败
    }
    let clipParam = null;
    let result = false;
    for (let i = 0; i < 5; i++) {
        log(`开始第 ${i + 1} 次签到尝试`);
        if (text("已签到").exists()) {
            toastLog("识图签到成功！！！(๑´∀`๑)");
            return true;
        }
        clipParam = getClipPic();
        // 2. 调用 YOLO 识别
        log("调用 YOLO 模型识别...");
        let detectionResult = null;
        try {
            console.error("----→>→ 开始识别 ←<←----")
            detectionResult = yoloProcessor(CAPTURE_PIC_PATH);
        } catch (e) {
            console.error(`YOLO 识别调用出错: ${e}`);
            return null;
        }
        // 初始化失败
        if (!detectionResult)
            return null;


        // 3. 处理识别结果并点击
        if (detectionResult.length > 0) {
            log(`识别成功 ${detectionResult.length} 个目标`);
            // log(detectionResult)
            let list = transResult(detectionResult);
            result = clickPic(list, clipParam);
        }
        if (!result) {
            console.error("global.picY：" + global.picY)
            console.error("global.x_refer：" + global.x_refer)
            console.error("global.y_refer：" + global.y_refer)
            console.error("截图参数clipParam:")
            console.error(clipParam)

            // 备份错误图片
            saveErroFile(CAPTURE_PIC_PATH, 'local')
            saveErroFile(p2Path, 'local')

            console.error("刷新验证码重试！");

            clickCenter('请点击此处重试');

            let refresh = className("android.widget.Button")
                .content("刷新验证").findOne(2500);

            ableClick(refresh);
            //  clickCenter(refresh);
            //sleep(1000);
            //重新截图
            // captureScr();
            //clipParam = getClipPic();
            sleep(500);
            continue;

        }
        return true;
    }
    return null;
}


//转化JSON格式
function transResult(arr) {
    if (arr === null || arr.length < 1) return arr;
    // 正确判断：检查入参是否是 [centerX, centerY, label, prob] 数组格式
    const isTargetFormat = arr.every(item => {
        return typeof item === 'object' &&
            item.hasOwnProperty('centerX') &&
            item.hasOwnProperty('centerY') &&
            item.hasOwnProperty('label') &&
            item.hasOwnProperty('prob');
    });
    // 数据格式不正确，返回
    if (!isTargetFormat) {
        return arr;
    }
    // 转换格式
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
    log("等待服务器准备完毕……")
    if (!serverInitStart)
        webTest();

    //threads.shutDownAll(); //在此之前，所有子线程必须结束
    console.error('可用服务器数量：' + sum.blockedGet())
    if (urls.length < 1) {
        toastError("芭比Q了，所有服务器都挂了，没法签到了！");
        // throw Error();
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
    let n = 0,
        u = 0;

    let clipParam = null;
    // 发送请求
    while (u < urls.length && n < 3) {
        log("开始第" + (n + u + 1) + "次申请");
        clipParam = getClipPic();
        let url = urls[array[u]];
        try {
            console.error("----→>→ 上传识别 ←<←----")
            log(url);
            let res = upload(url);

            if (!res) throw Error();

            let result = false;

            if (res.statusCode === 200) {
                log("坐标分析成功啦！")
                let list = res.body.json();
                result = clickPic(list, clipParam);
            }
            if (!result) {
                console.error("global.picY：" + global.picY)
                console.error("global.x_refer：" + global.x_refer)
                console.error("global.y_refer：" + global.y_refer)
                console.error("截图参数clipParam:")
                console.error(clipParam)

                console.error("错误：statusCode：" + res.statusCode);
                let result = res.body.string();
                console.error("信息：" + result);

                if (!result) throw Error();

                // 备份错误图片
                saveErroFile(CAPTURE_PIC_PATH, 'server');
                saveErroFile(p2Path, 'server')

                console.error("刷新验证码重试！");

                clickCenter('请点击此处重试');

                let refresh = className("android.widget.Button")
                    .content("刷新验证").findOne(2500);

                ableClick(refresh);
                //  clickCenter(refresh);
                //sleep(1000);
                //重新截图
                // captureScr();
                //clipParam = getClipPic();
                sleep(500);
                n++;
                continue;

            }
            return true;

        } catch (e) {
            if (u > urls.length - 3)
                console.error(e.message);
            console.error("服务器错误，更换服务器重试！")
            clickCenter('请点击此处重试');
            u++;
            //n = 0;
        }
        // u++;
    }
    return null;

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
    let pic_dir = CAPTURE_PIC_PATH;

    let startTime = new Date().getTime();
    let res = null;
    let thread = threads.start(() => {
        try {
            // 正式发送请求
            res = http.postMultipart(url, {
                file: ["0.png", "image/png", pic_dir]
            }, {
                timeout: delayed * 1000,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Connection': 'Keep-Alive'
                }
            });

        } catch (e) {}
    });
    // AutoJS 6.5.0版本超时时间无效，改用线程方式
    thread.join(delayed * 1000);
    thread.interrupt();

    let time = (new Date().getTime() - startTime);
    log("服务器请求时间：" + toSeconds(time));
    return res;
}



//------------ 滑块签到 ----------//
// 滑块认证
function auth_hk() {
    var pictures2 = images.read(p2Path);
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
            toastError("新版签到失败，尝试使用旧版签到！")
            qd(); //开始签到
        }

    } else {
        toastError("没有找到滑块", "forcible");
        throw Error();
    }
}



// 读取滑块图片hk.png
function readHk() {
    //先根据分辨率读
    let hk = (`tmp/hk_${dwidth}x${dheight}` + `.png`);
    let wx = images.read("./" + hk);
    // 自动适配
    if (null === wx) {
        let pictures2 = images.read(p2Path);

        let x = cX(165);
        let y = cY(1276);
        let w = cX(349) - x;
        let h = cY(1460) - y;

        // 若找到参照组件，就更新参数

        //寻找滑块组件
        let gbyz = className("android.widget.Button")
            .content("关闭验证").findOne(1500);
        if (!gbyz) {
            gbyz = className("android.widget.Button")
                .content("刷新验证").findOne(1500);
            if (!gbyz) {
                gbyz = className("android.widget.Button")
                    .content("视觉障碍").findOne(1500);
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
        throw Error();
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

    let img3 = images.read(p2Path);
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
        throw Error();
    }
}

//------------ 风中拾页版，滑块签到 ----------//
//签到
function qd() {
    var len;
    var sta = "10(0{" + 50 + ",})1"

    var img2 = images.read(p2Path);
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
            if (config && config.通知提醒)
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

        return array;
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




//------------ 成长值统计 ----------//

//小程序版成长值
function level2() {
    console.info(">>>>→开始记录成长值←<<<<")
    toastLog("[小程序]：记录成长值……", "forcible")
    sleep(1500);
    var num = text("成长值").findOne(2000);
    if (!num) {
        toastWarn("布局分析失效，未找到成长值！", "forcible");
        toastWarn("[不确定操作]摸黑→点击[成长值]", "forcible");
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
        ableClick(num)
    }
    clearCache();
    sleep(2000);
    var newdate = date.replace(/-/g, "/").substr(0, 10);
    let jilu = text(newdate).find();
    if (jilu.length < 1) {
        //组件无法识别，无法继续了！除非返回重新进来
        toastError("布局分析失效！无法获得明细");
        back();
        return;
    }
    log('开始记录……')
    sleep(1000)
    // 成长值明细记录
    for (i = 0; i < jilu.length; i++) {
        let demo = jilu.get(i);
        if (demo.isSingleton()) {
            demo = demo.parent()
        }

        //结果 值
        let record = new 记录();
        record.项目 = demo.previousSibling().text();

        let result = demo.nextSibling();
        if (!result ||
            !result.text() ||
            !result.text().includes("+"))
            result = demo.parent().nextSibling();

        record.结果 = result.text();


        成长值记录.add(record);
    }
    log("记录完成")
    back();
    sleep(1000);

}

// 社区APP版 成长值
function level1() {
    while (!packageName(xmPckageName).exists()) sleep(500);
    console.info(">>>>→开始记录成长值←<<<<")
    toastLog("[社区APP]：记录成长值……");

    if (!ableClick('社区成长等级')) {
        backAppIndex();
        log('→我的')
        ableClick(text("我的"));

        // 尝试刷新
        tryRefresh();

        sleep(1000)
        if (!ableClick(contentStartsWith("成长值").findOne(5000))) {
            console.error('找不到入口')
            return;
        }
    }
    sleep(1000);
    // swipe(dwidth * 0.5, dheight * 0.6, dwidth * 0.5, dheight * 0.8, 100); // 向上滚动查找
    log('进入成长值页面')
    clearCache();
    sleep(1500);
    let n = 10;
    while (n-- && !(text('我的成长值').exists() &&
            text('当前等级').exists() &&
            text('成长记录').exists()))
        sleep(1000);

    log('开始记录……')

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

    swipe(dwidth * 0.5, dheight * 0.8, dwidth * 0.5, dheight * 0.6, 100); // 向上滚动查找
    sleep(1500);
    var newdate = date.replace(/-/g, "/").substr(0, 10);
    let jilu = text(newdate).find();
    for (i = 0; i < jilu.length; i++) {
        let demo = jilu.get(i);
        if (demo.isSingleton()) continue;
        //结果 值 
        let record = new 记录();
        record.结果 = demo.nextSibling().text();
        record.项目 = demo.previousSibling().text();
        //成长值记录.addAndUpdate(record);
        成长值记录.add(record);
    }

    // let record = new 记录();
    //     record.结果 = "+3";
    //     record.项目 = '秋冬新品感恩季活动奖励';
    //     成长值记录.add(record);

    log("记录完成")

    if (!czz.exists() || !jilu || jilu.length < 1) {
        console.error("布局分析失效")
        console.error("捕获数据出错")
        console.error("可以尝试改为从小程序记录")
    }
    back();
    sleep(1000);
}

// 列出成长值明细结果
function levelResult() {
    console.info(">>>>>>>→今日明细←<<<<<<<")
    if (config.成长值记录 < 1) {
        toastWarn("搞美雅！")
        toastWarn("配置[成长值记录:0]，没记录成长值！")
        return "恭喜完成！恭喜！\n没有记录成长值，这里没内容显示啦！";
    };
    let 今日获得 = 成长值记录.今日获得();
    let 距离升级还需 = 成长值记录.距离升级还需();
    let 还需时日 = Math.ceil(距离升级还需 / 成长值记录.预估日得());

    let outP1 = (`成长值：${成长值记录.当前成长值}(${成长值记录.当前等级()})`).padEnd(14) + (`目标：${成长值记录.升级目标}`).padStart(8);
    let outP2 = (`今日得：${今日获得}`).padEnd(7) + (`Up还需：${距离升级还需}(${还需时日}天`).padStart(15);
    log(outP1);
    log(outP2);
    console.error("升级还需天数仅供参考")
    log("------------------------------");
    log("详细记录：");
    var xcxsuccess = 0;
    成长值记录.详细记录.forEach((record) => {
        const item = record.项目.length > 10 ?
            (record.项目.length > 15 ? record.项目.padEnd(19) : record.项目.padEnd(14)) :
            record.项目.padEnd(12, '\u3000');

        if (item.startsWith('小程序')) {
            xcxsuccess = 1;
        }
        log(`${item}` + `${record.结果}`);
    });
    log("------------------------------");

    if (config.小程序签到 && config.小程序签到失败提示 &&
        成长值记录.详细记录.length > 0 && !xcxsuccess) {
        toastError('小程序签到失败了！');
        console.error('可能小程序未成功打开！');
        console.error('或摸黑签到失败！');
        console.error('(或尝试在config文件中修改摸黑签到坐标）');
        console.error('或社区APP与小程序账号未绑定！');
        if (config && config.通知提醒)
            notice(String('出错了！'), String('小程序签到失败了！\n可以再执行一次试试！'));
    }

    return outP1 + "\n" + outP2;

}

// 更换社区APP账号
function loginAccounts(accounts, password) {
    while (!packageName(xmPckageName).exists()) sleep(500);

    console.info(">>>>>>→ 更换账号 ←<<<<<<")
    backAppIndex();
    log("→我的")
    ableClick("我的")
    sleep(1000)
    let acc = idEndsWith('_nickname')
        .findOne()

    log("当前账号昵称：" + acc.text())

    成长值记录.昵称 = acc.text()

    if (!text("未登录账号").exists() && !text("登录").exists()) {
        console.warn("正在退出当前账号...")
        // log("→设置")
        ableClick(desc('设置'))
        sleep(2000)
        //  log("→上滑")
        let r = 2;
        while (r--) {
            swipe(dwidth * 0.8, dheight * 0.6, dwidth * 0.6, dheight * 0.4, 100);
            sleep(500)
        }
        //  log("→退出登录")
        ableClick(text('退出登录'))
        sleep(1500)
        //  log("→确定")
        ableClick(text('确定'))
    }
    console.info("------>→ 登录账号 ←<------")
    sleep(2000)
    log("→我的")
    ableClick("我的")
    sleep(1000)
    //log("→登录")
    ableClick(text('登录'))
    sleep(2000)

    if (accounts && password) {
        // log("→其他账号登录")
        ableClick(text('其他账号登录'))
        sleep(1500)
        log("→密码登录")
        ableClick(text('密码登录'))
        sleep(500)

        while (textContains("密码管理").exists()) {
            click(cX(500), cY(400))
            sleep(1000)
        }
        //账号
        log("输入账号：" + accounts)
        let acc = text('邮箱/手机号码/小米ID')
            .findOne(2000)
        if (!acc) acc = className('android.widget.AutoCompleteTextView')
            .findOne(2000)
        if (acc) acc.setText(accounts);
        sleep(500)
        while (textContains("密码管理").exists()) {
            click(cX(500), cY(400))
            sleep(1000)
        }
        // 密码
        let ycmm = desc('隐藏密码').findOne()
        ableClick(ycmm)

        sleep(500)
        while (textContains("密码管理").exists()) {
            click(cX(500), cY(400))
            sleep(1000)
        }

        log("输入密码")
        if (config.打印密码)
            console.error(password)
        let pasw = className('android.widget.AutoCompleteTextView')
            .findOnce(1)
        if (pasw) pasw.setText(password)
        else {
            ycmm.previousSibling().setText(password);
        }

        sleep(1000)
        while (textContains("密码管理").exists()) {
            click(cX(500), cY(400))
            sleep(1000)
        }

    } else log("小米系统绑定账户登录")

    let readed = textStartsWith('已阅读').findOne(2000);
    if (readed) {
        // log("√已阅读")
        ableClick(readed.previousSibling())
        sleep(1000)
        while (textContains("密码管理").exists()) {
            click(cX(500), cY(400))
            sleep(1000)
        }
        /// log("→登录")
        ableClick(text('登录'))
        sleep(1500)
        ableClick("我的")

    }

    acc = idEndsWith('_nickname')
        .findOne(1000)
    while (!acc) {
        text('取消').exists() && ableClick(text('取消'))

        sleep(1000)
        acc = idEndsWith('_nickname')
            .findOne(1500)

        if (!acc && text('小米账号登录').exists()) {
            console.error("账号密码不匹配")
            back()

            text('取消').exists() && ableClick(text('取消'))

            back()
            console.error("登录失败！")
            return false;
        }
        text('我的').exists() && ableClick("我的")
    }

    log("登录成功！")
    log("现在账号昵称：" + acc.text())
    sleep(1000)
    return true;
}

//主程序
function run() {

    if (!app.isInstalled(xmPckageName)) {
        console.error("小米社区APP未安装！")
        return;
    }

    // exit();
    // 开始
    if (config.社区APP签到 &&
        config.社区APP签到方式 &&
        config.社区APP签到方式 === 1) {
        // 识图签到初始化
        initImageReco(false);
    }

    let mulAccounts = false; //多账号
    let runLen = 0;
    if (config.启用多账号) {
        try {
            config1 = require("./config_多账号.js");
            runLen = config1.更换账号密码.length;
            mulAccounts = true;
        } catch (e) {
            runLen = dualConfigFilesNames.length;
        }
    } else {
        runLen = dualConfigFilesNames.length;
    }

    for (let row = 0; row <= runLen; row++) {

        成长值记录.clearData();

        if (row > 0) {
            if (!config.启用分身 && !config.启用多账号) break;

            if (!mulAccounts) {
                console.error(">>>>>→开始分身签到←<<<<<")
                sleep(1000);
                console.warn(`第${row}个分身`)

                let configName = dualConfigFilesNames[row - 1];
                log("加载配置文件：" + configName)
                try {
                    let config2 = require("./" + configName);
                    Object.assign(config, config2);
                } catch (e) {
                    console.error(configName + "文件错误")
                    exit()
                }
                dualRow = row;
            }

            global.maxRuntime += 2 * 60 * 1000;

        }


        // 进入正题
        if (!mulAccounts || row === 0) {
            toHome();
            killAPP(xmPckageName);
        }
        if (launchAPP(xmPckageName)) {
            skipAd();

            // 小程序报名活动
            threads.start(() => xcxRegEvent());

            // 空白页
            blankMaintain();

            //backAppIndex();

            if (config.浏览帖子) posts(1);

            //sleep(1666);

            if (toSign()) {

                // 签到
                if (config.社区APP签到) start(config.社区APP签到);

                // 按配置启用功能
                // if (config.加入圈子) join();

                if (config.拔萝卜) pullingCarrots(config.拔萝卜);
                if (config.米粉节) fans(config.米粉节);
                //  if (config.观看视频) watchVideo();

                if (!config.执行顺序) {
                    if (config.双旗舰) dualFlagships(config.双旗舰);
                    if (config.感恩季) ganenji(config.感恩季);
                }

                if (config.小程序签到) {
                    小程序签到(config.小程序签到);
                    // if (config.成长值记录 === 2)
                    //     level2();
                }

                if (config.执行顺序) {
                    if (!packageName(xmPckageName).exists()) {
                        //回到小米社区app
                        launchAPP(xmPckageName);
                    }
                    if (config.双旗舰) dualFlagships(config.双旗舰);
                    if (config.感恩季) ganenji(config.感恩季);
                }

                if (config.成长值记录 === 1) {
                    if (!packageName(xmPckageName).exists()) {
                        //回到小米社区app
                        launchAPP(xmPckageName);
                    }
                    level1();
                }

                // sleep(500)
                //back();

            } else {
                toastError("可能打开了空白页", "forcible");
                console.error("可能社区在维护，请稍后再试");
                if (config && config.通知提醒)
                    notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("进不了签到页，可能打开了空白页"));

                return;
            }


        } else {
            sleep(500);
            toastError("(*꒦ິ⌓꒦ີ) 为什么打不开社区APP？", "forcible");
            toastError("哪里出错了？", "forcible");
            if (config && config.通知提醒)
                notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("芭比Q了，小米社区里的操作都没完成。"));

            return;
        }

        // 打印明细
        let lResult = levelResult();

        if (mulAccounts) {
            if (!packageName(xmPckageName).exists()) {
                //回到小米社区app
                launchAPP(xmPckageName);
            }

            Object.assign(config, config1);

            // 切换账号
            if (row === runLen) {
                // 最后一次，恢复默认账号
                if (config.默认账号)
                    loginAccounts(config.账号, config.密码)
                else loginAccounts(null, null);

            } else {
                let acc = config.更换账号密码[row];
                loginAccounts(acc[0], acc[1])
            }
            backAppIndex();

        }

        if (global.unfinished_mark) {
            //启动小米社区
            launchAPP(xmPckageName);
            // 控制台缩小
            //consoleMin();
            if (config && config.通知提醒)
                notice(String('未完成(' + nowDate().substr(5, 14) + ')[' + getDurTime(date) + ']'), String(lResult));
            console.error("有某个流程未完成！˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚");

        } else {
            // 关闭小米社区APP
            if (!mulAccounts || row === runLen)
                killAPP(xmPckageName);

            if (!mulAccounts) {
                toHome();
                sleep(300);
                toHome();
            }
            if (config && config.通知提醒) {
                let name = 成长值记录.昵称 ?? "已完成";
                notice(String('(' + nowDate().substr(5, 14) + ')[' + getDurTime(date) + ']' + name), String(lResult));
            }
            toastError("全部已完成！(๑•॒̀ ູ॒•́๑)啦啦啦", "forcible");
        }

    }
    consoleMax();

    if (hasRegEvent) {
        console.error('小程序又有报名活动啦!!!＼(`Δ’)／')
        console.error('只需填个报名表，又得一大波成长值！')
        if (config && config.通知提醒)
            notice(String('小米社区活动提醒'), String('小程序又有报名活动啦!!!＼(`Δ’)／'));

    }

    device.cancelKeepingAwake();


    return;
}

module.exports = run; // 导出主程序