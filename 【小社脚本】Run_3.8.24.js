// 引入配置文件
if (typeof config === 'undefined' || !config) {
    config = require("./config.js");
}
// 签到截图目录
var CAPTURE_PIC_PATH = files.cwd() + "/tmp/pic.png"; // 验证码截图路径
var p2Path = "./tmp/pictures2.png";

// 本地YOLO
var YOLO_MODULE_PATH2 = "/yolov11/yolov11_w.js"; // YOLOv11 模块路径
var YOLO_PLUGIN_NAME2 = "com.circlefork.yolo"; // 插件包名
var YOLO_MODEL_SUBDIR2 = "/yolov11/model";
var yoloProcessor = null; // 初始化为 null
var enlocalYOLO = false;

// 识图服务器初始化
var serverInitStart = false;
var serverInitSum = -1;
var delayed = 10; //服务器请求超时时间s
var delayed_max = 30; //最大超时时间 

// 滑块的四周坐标
var sliderRegion;
var centerX;
var centerY;
var rX;
var percentage;


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
    // 直接新增
    add(new记录) {
        this.详细记录.push(new记录);
    },
    // 新添加并且更新
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


//------------ 识图签到初始化 ----------//

// --- 初始化识图模块 ---
function initImageReco() {
    console.info(">>>>→识图签到初始化←<<<<")

    if (config.本地YOLO识图 &&
        files.exists(files.cwd() + YOLO_MODULE_PATH2)) {
        try {
            log("开始加载本地识图模块")
            let name = app.isInstalled(YOLO_PLUGIN_NAME2);
            let error = false;
            if (!name) {
                console.error("yolov11/Yolo-plugin.apk 插件未安装");
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
            yoloProcessor = require(files.cwd() + YOLO_MODULE_PATH2);
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
                delayed_test = 4
                break;
            case url.includes("xcjd"):
                delayed_test = 1.5
                break;
            default:
                delayed_test = 0.7
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


    //  "http://up.kuandana.v6.rocks/upload", //11
    "http://up.风中拾叶.top/upload", //12

];

//------------ 业务逻辑开始 ----------//

//关闭程序
function killAPP(packageN) {
    console.info(">>>>>→关闭社区APP←<<<<<")
    app.openAppSetting(packageN);
    sleep(1000)
    let i = 6;
    while (i-- && !(textStartsWith("清除").exists() ||
            text("结束运行").exists() ||
            text("强行停止").exists() ||
            textStartsWith("权限").exists() ||
            text("通知管理").exists())) {

        if (text("应用详情").exists()) {
            back();
            sleep(500);
            break;
        }
        if (i % 2 === 0) app.launchSettings(packageN)
        else app.openAppSetting(packageN);
        sleep(1000);
    }
    clickCenter("结束运行");
    clickCenter("强行停止");
    sleep(500);
    while (click("确定"));
    toastLog("关闭小米社区！！！", "forcible");

}

//打开程序
function launchAPP(packageN) {
    console.info(">>>>>→启动社区APP←<<<<<")
    toastLog("尝试直接调起小米社区APP……", "forcible");
    app.launch(packageN);
    let n = 0;
    // 这个循环走一遍至少需要1秒
    while (!wait(() => packageName(packageN).exists(), 3, 500)) {
        //链式调用权限触发，点“始终允许”
        if (textContains("想要打开").exists() ||
            textContains("尝试开启").exists() ||
            textContains("是否").exists()) {
            sleep(200)
            let yx = className("android.widget.Button")
                .contentContains("允许").findOne(1000);
            ableClick(yx);
            break;
        }
        // 两种启动写法
        if (n % 2 === 0) app.launchPackage(packageN)
        else app.launch(packageN);
        if (n > 3) {
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

            toastError("无法打开小米社区，(*꒦ິ⌓꒦ີ)", "forcible");
            if (config && config.通知提醒)
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
    while (!packageName(xmPckageName).exists()) sleep(500);
    // let n = 5;
    // while (n-- && !(content('签到').exists() ||
    //         content('论坛').exists() ||
    //         content('我的').exists())) {
    //开屏广告
    let skilCloseBtn = textStartsWith("跳过").findOne(800);
    if (ableClick(skilCloseBtn)) {
        log("跳过了开屏广告!");
    }
    //sleep(1000);
    let adClose = className("android.widget.ImageView")
        .desc("关闭");

    if (wait(() => adClose.exists(), 4, 500) &&
        ableClick(adClose.findOne(800))) {
        log("关闭了1个广告!");
    }
    //}
}

//浏览帖子
function posts(n) {
    while (!packageName(xmPckageName).exists()) sleep(500);
    console.info(">>>>>>>→浏览帖子←<<<<<<<")
    toastLog("准备浏览帖子10s……", "long", "forcible")
    sleep(500)
    // 小米社区重置首页
    //backAppIndex();
    let pkly = descEndsWith("评论");
    if (wait(() => pkly.exists(), 6, 500)) {
        let pkly1 = pkly.findOne().parent();
        ableClick(pkly1);
        sleep(1500);
        let gz = className("android.widget.TextView")
            .text("关注");
        let gz2 = className("android.view.View")
            .text("关注");
        while (!(gz.exists() || gz2.exists())) {
            if (n > 5) {
                toastError("打开帖子失败！")
                global.unfinished_mark = 1;
                //backAppIndex();
                return;
            }
            console.warn("第" + n + "次重试")
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
        console.warn("第" + n + "次重试")
        // 小米社区重置首页
        backAppIndex();
        // 下滑刷新列表
        swipe(dwidth * 0.5, dheight * 0.5, dwidth * 0.5, dheight * 0.8, 300);
        sleep(1500);
        if (n > 5) {
            toastError("打开帖子失败！")
            global.unfinished_mark = 1;
            //backAppIndex();
            return;
        }
        return posts(n + 1);
    }
    log("正在浏览帖子……");
    for (i = 0; i < 4; i++) {
        wait(() => false, 1000);

        let ran = random(200, 300) * Math.pow(-1, i);
        //gesture(1000, [dwidth * 1 / 2, dheight * 0.8 + ran], [dwidth * 1 / 2, dheight * 0.8 - ran]);
        swipe(dwidth * 0.5, dheight * 0.7 + cY(ran), dwidth * 0.5, dheight * 0.7 - cY(ran), 1000);

        if (i < 3) toast("正在浏览帖子……", "forcible")
        else toastLog("浏览10s完成！Ｏ(≧▽≦)Ｏ ", "forcible");

        sleep(700);
    }

    // 返回
    back();
    backAppIndex();
    return;
}

// 重置到小米社区论坛页
function backAppIndex() {
    console.warn("--→确保重置到[论坛]首页")
    //发现退回图片
    let backImg = content("返回");
    while (backImg.exists()) {
        ableClick(backImg.findOne(1500));
        sleep(300)
    }
    //发现退回按钮
    let backBut = content("后退");
    while (backBut.exists()) {
        ableClick(backBut.findOne(1500));
        sleep(300)
    }
    // 返回“论坛”页
    let qdBt = className("android.widget.ImageView")
        .desc("签到");
    while (qdBt.exists() &&
        (qdBt.findOne().centerX() < 0 || qdBt.findOne().centerY() < 0)) {
        ableClick(text("论坛").findOne(1500));
        sleep(300);
    }
    let pingLun = className("android.widget.ImageView")
        .desc("评论");
    while (pingLun.exists() &&
        (pingLun.findOne().centerX() < 0 || pingLun.findOne().centerY() < 0)) {
        ableClick(text("论坛").findOne(1500));
        sleep(300);
    }

    while (!(content('论坛').exists() ||
            content('官方').exists() ||
            content('消息').exists() ||
            content('我的').exists())) {
        back();
        sleep(1000);
    }
    ableClick('论坛');

}

//------------ 社区APP签到 ----------//

function start(pram) {
    while (!packageName(xmPckageName).exists()) sleep(500);
    while (!(text('今天').exists() || text('签到').exists() || text('全新升级').exists())) sleep(500);

    console.info(">>>>>>>→开始签到←<<<<<<<")
    if (!config.社区APP签到方式) {
        console.error(`配置[社区APP签到方式：${config.社区APP签到方式}]`);
        toastError("取消签到！", "forcible")
        //back();
        sleep(1000);
        return;
    }
    // percentage = logpercentage();
    let done = text("已签到").findOne(1666);
    try {
        if (!done) {
            //控制台缩小
            if (config.悬浮窗控制台签到时最小化)
                consoleCollapse();

            consoleMin();

            //开始程序
            findCenter(pram);
        }
        toastLog("今日已签到！", "forcible");
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
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '立即签到';

    toastLog("开始签到……", "forcible");
    //点击签到按钮
    let qdbt = text(pram);

    // 没找到入口
    while (!wait(() => qdbt.exists(), 3, 800)) {
        toastWarn("未找到活动入口，重新进入", "forcible")
        back();
        // 小米社区重置首页
        //backAppIndex();
        sleep(1000);
        let qd = className("android.widget.ImageView")
            .desc("签到").findOne(1000);
        ableClick(qd);
        sleep(1000);
    }

    if (config.社区APP签到方式 === 1) {
        // 识图签到都挂了
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


    if (!ableClick(qdbt.findOne(2000))) {
        toastError('未找到活动入口')
        return;
    }

    // 等待验证图片的加载
    sleep(2000);
    let result = wait(() =>
        (content("关闭验证").exists() ||
            content("刷新验证").exists() ||
            content("视觉障碍").exists()),
        5, 800);
    // 加强识别
    if (!result) {
        clickCenter(qdbt.findOne(2000));
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
        throw Error();
        return;
    }
    //屏幕截图
    captureScr();
    let ycdj = textStartsWith("请在下图依次点击").findOne(1500);
    if (ycdj || (config.社区APP签到方式 === 1)) {
        // 未初始化
        if (!enlocalYOLO && !serverInitStart) {
            console.warn('识图签到未初始化！');
            log('启用初始化……');
            initImageReco();
        }
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

        log("屏幕截图成功！")
    } catch (e) {
        toastError("截图出错！")
        throw Error();
        return;
    }

    //展开悬浮窗控制台
    //consoleExpand();
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

            console.error("准备重试……");

            //启用服务器签到
            enlocalYOLO = enlocalYOLO ? false : true;
            if (!serverInitStart) {
                threads.start(() => webTest());
            }

            let refresh = className("android.widget.Button")
                .content("刷新验证").findOne(2500);

            ableClick(refresh);
            clickCenter(refresh);
            //重新截图
            captureScr();
            getClipPic();
            sleep(500);

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
        h: (cY(1622) - y)
    };
    // 若找到参照组件，就更新参数
    let ycdj = textStartsWith("请在下图依次点击").findOne(1500);
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
        .content("确认").findOne(1500);
    if (!tida) {
        tida = className("android.widget.Button")
            .content("提交答案").findOne(1500);
    }
    if (tida) {
        param.h = tida.top() - param.y;
    }
    
     // 反馈截图最上方高度
    global.picY = y;
    // 修正控制台高度
    threads.start(() => consoleMin());
    sleep(500);

    //剪小图
    let pictures2 = images.read(p2Path);
    let pic = images.clip(pictures2,
        param.x, param.y,
        param.w, param.h);

    images.save(pic, CAPTURE_PIC_PATH, "png", 100);
    pictures2.recycle();
    pic.recycle();

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
            // console.warn(" 点击→");
            log(" ┌ 第" + (i + 1) + "个图标：" + icon);
            log(" ├ 置信度：" + prob)
            log(" ├ 坐标：(" + x + ", " + y + ")")
            console.warn("└ 点击结果：" + click(x, y));
            console.info("────────────");
            sleep(800)
        }
        log("图标点击完成！");
        sleep(500);

        let tida = className("android.widget.Button")
            .content("确认").findOne(1500);
        if (!tida) {
            tida = className("android.widget.Button")
                .content("提交答案").findOne(1500);
        }
        if (!tida) {
            console.error("提交按钮属性被小米改了");
            console.error("快提醒脚本作者修改代码");
            throw Error();
        }

        console.info(' →点击提交按钮：' + ableClick(tida));
        sleep(500);

        if (text("已签到").findOne(2000)) {
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
    for (i = arr.length - 1; arr.length > 10; i--) {
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
        toastError("YOLO 模块未加载，无法本地识图签到");
        return null; // 表示签到失败
    }
    let clipParam = getClipPic();
    let result = false;
    for (let i = 0; i < 3; i++) {
        log(`开始第 ${i + 1} 次签到尝试`);
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
            console.error("刷新图片重试！");

            // 备份错误图片
            saveErroFile(CAPTURE_PIC_PATH, 'local')

            let refresh = className("android.widget.Button")
                .content("刷新验证").findOne(2500);

            ableClick(refresh);
            clickCenter(refresh);
            //重新截图
            captureScr();
            clipParam = getClipPic();
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

    let clipParam = getClipPic();
    // 发送请求
    while (u < urls.length && n < 3) {
        log("开始第" + (n + u + 1) + "次申请");
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
                console.error("错误：statusCode：" + res.statusCode);
                let result = res.body.string();
                console.error("信息：" + result);

                if (!result) throw Error();

                console.error("识别失败，刷新图片重试！");

                // 备份错误图片
                saveErroFile(CAPTURE_PIC_PATH, 'server');

                let refresh = className("android.widget.Button")
                    .content("刷新验证").findOne(2500);

                ableClick(refresh);
                clickCenter(refresh);
                //重新截图
                captureScr();
                clipParam = getClipPic();
                sleep(500);
                n++;
                continue;

            }
            return true;

        } catch (e) {
            if (u > urls.length - 3)
                console.error(e.message);
            console.error("服务器错误，更换服务器重试！")
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


//------------ 活动 ----------//
//拔萝卜活动
function pullingCarrots(pram) {
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '去看看';

    while (!packageName(xmPckageName).exists()) sleep(500);
    console.info(">>>>>>>→萝卜活动←<<<<<<<")
    toastLog("拔萝卜活动签到……", "forcible");

    let blb = textContains('拔萝卜');

    var button = className("android.widget.Button").content(pram);
    if (!wait(() => blb.exists() && button.exists(), 5, 500)) {
        toastError("未找到活动入口，重新进入", "forcible")
        back();
        // 小米社区重置首页
        //backAppIndex();
        // 重新进入签到页面
        sleep(1000);
        let qd = className("android.widget.ImageView")
            .desc("签到").findOne(1000);
        ableClick(qd);
        sleep(1000);
    }
    //while (!existsOne(text('今天'), text('签到'), text('全新升级'))) sleep(500);
    while (!(text('今天').exists() || text('签到').exists() || text('全新升级').exists())) sleep(500);

    //while (scrollDown());
    swipe(dwidth * 0.5, dheight * 0.8, dwidth * 0.5, dheight * 0.6, 100); // 向下滚动查找
    sleep(1000);

    if (!blb.exists() || !ableClick(button.findOne(2000))) {
        console.error('未找到活动入口')
        return;
    }

    sleep(1000);
    // 尝试刷新
    tryRefresh();

    let ckjb = className("android.widget.Button")
        .content("查看金币详情")
    if (wait(() => ckjb.exists(), 6, 400)) {
        toastLog("拔萝卜已签到！", "forcible");
        sleep(1000);
    }

    back();
}

//米粉节活动
function fans() {
    var button = className("android.widget.Button")
        .content("去参与").findOne(1500);
    if (button) {
        ableClick(button);
        toastLog("打开米粉节活动", "forcible")
        var dianl = className("android.widget.Button")
            .content("点亮今日足迹").findOne(1200);
        var chouka = className("android.widget.Button")
            .content("抽取今日祝福").findOne(1200);
        if (dianl || chouka) {
            clickAndLog(dianl || chouka);
            back();
        } else {
            toastError("未找米粉节参与按钮", "forcible");
        }
    } else {
        toastLog("未找到'去参与'按钮", "forcible");
    }
}

//米粉节活动按钮
function clickAndLog(button) {
    if (button) {
        ableClick(button);
        log("点击了按钮: " + button.text());
        button2 = className("android.widget.Button")
            .content("抽取今日祝福").findOne(1200).click();
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

    let zngn = textContains('周年感恩');

    let qucanyu = className("android.widget.Button").content(pram);

    // 没找到入口
    if (!wait(() => zngn.exists() && qucanyu.exists(), 5, 500)) {
        toastError("未找到活动入口，重新进入", "forcible")
        back();
        sleep(1000);
        // 小米社区重置首页
        //backAppIndex();
        // 重新进入签到页面
        let qd = className("android.widget.ImageView")
            .desc("签到").findOne(1000);
        ableClick(qd);
        sleep(1000);
    }
    //  while (!existsOne(text('今天'), text('签到'), text('全新升级'))) sleep(500);
    while (!(text('今天').exists() || text('签到').exists() || text('全新升级').exists())) sleep(500);


    if (!zngn.exists() || !ableClick(qucanyu.findOne(1500))) {
        log('尝试寻找其它入口')
        back();
        //返回首页外层
        backAppIndex();
        log('→我的')
        ableClick(text("我的"));
        swipe(dwidth * 0.5, dheight * 0.8, dwidth * 0.5, dheight * 0.6, 100); // 向下滚动查找
        //while (scrollDown());
        sleep(1000)
        qucanyu = descContains('周年感恩');
        log('进入活动页面')
        if (!ableClick(qucanyu.findOne(5000))) {
            console.error('找不到活动入口')
            return;
        }
    }


    解锁(qucanyu);
    back();

}

// 双旗舰
function dualFlagships(pram) {
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '去参加';

    while (!packageName(xmPckageName).exists()) sleep(500);
    console.info(">>>>>>>→旗舰活动←<<<<<<<")
    toastLog("开始双旗舰活动……", "forcible")
    let qj = textContains('双旗舰');

    let cj = className("android.widget.Button").content(pram);
    if (!wait(() => qj.exists() && cj.exists(), 5, 500)) {
        toastError("未找到活动入口，重新进入", "forcible")
        back();
        sleep(1000);
        // 小米社区重置首页
        //backAppIndex();
        // 重新进入签到页面
        let qd = className("android.widget.ImageView")
            .desc("签到").findOne(1000);
        ableClick(qd);
        sleep(1000);
    }
    //while (!existsOne(text('今天'), text('签到'), text('全新升级'))) sleep(500);
    while (!(text('今天').exists() || text('签到').exists() || text('全新升级').exists())) sleep(500);

    if (!qj.exists() || !ableClick(cj.findOne(2000))) {
        console.error('未找到活动入口')
        return;
    }


    解锁(cj);
    back();

}

function 解锁(button) {
    sleep(1000);
    // 尝试刷新
    tryRefresh();
    // -------------- 报名页面(第一次才有)  ------------/
    let register = className("android.widget.Button")
        .content("立即报名");
    if (wait(() => register.exists(), 4, 600)) {
        register = register.findOne();
        // sleep(500)
        // 勾选 “我已阅读并同意”
        let checkBox = register.nextSibling();
        if (!checkBox.clickable() && checkBox.hasChildren())
            checkBox = checkBox.firstChild();

        sleep(500);
        if (ableClick(checkBox)) {
            //立即报名
            ableClick(register);
            sleep(1000)
            let qd = className("android.widget.Button")
                .contentStartsWith("确定").findOne(1500);
            if (!ableClick(qd)) {
                //机型确认，识别不到组件，也无法识别到（“确定”）文字，
                //位置在右下角
                for (i = 0; i < 5; i++) {
                    click(dwidth * 0.734, dheight * (0.895 + 0.008 * i));
                }
            }
            sleep(1500);
        }
    }

    // -------------- 开箱页面  ------------/
    let qts = className("android.widget.Button").content("去提升");
    // 页面没成功加载
    if (!wait(() => qts.exists(), 5, 800)) {
        //重新进入
        back();
        sleep(1000);
        ableClick(button.findOne());
        sleep(1000);
    }

    let ddjs = wait(() => text('等待解锁').exists(), 3, 800);
    let jpso = wait(() => text('可解锁').exists(), 3, 800);
    if (!ddjs && !jpso) {
        // if (1) {
        log("不好了，布局分析失效了！")
        log("无法判断是否有解锁次数，")
        log("只能[摸黑]点击了再说。")
        log('滑到最下面')
        for (let i = 0; i < 5; i++) {
            swipe(dwidth * 5 / 8, dheight * 0.5, dwidth * 5 / 8, dheight * 0.3, 100);
            gesture(100, [dwidth * 3 / 8, dheight * 0.5], [dwidth * 3 / 8, dheight * 0.3]);
            sleep(100);
        }
        sleep(600);
        log("解锁最后一个");
        for (let i = 0; i < 2; i++) {
            click(dwidth * 0.88, dheight * (0.63 - 0.2 * i));
            sleep(500);
        }
        // 关闭提示
        for (let i = 0; i < 3; i++) {
            click(dwidth * 0.5, dheight * (0.83 + 0.01 * i));
        }
        log("等待3秒……")
        sleep(3000);
        log("再解锁一个");
        for (let i = 0; i < 2; i++) {
            click(dwidth * 0.13, dheight * (0.63 - 0.2 * i));
            sleep(500);
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
            // 关闭炫耀一下
            let xyyx = className("android.widget.Button")
                .content("炫耀一下").findOne(888);
            if (xyyx) {
                xyyx = xyyx.parent().nextSibling();
                ableClick(xyyx);
                // 关闭图形❌组件
                //clickCenter(xyyx);
            } else {
                // 无法识别到“炫耀一下”弹窗，也无法识别关闭图形❌组件
                // 只能靠坐标关闭
                for (let i = 0; i < 3; i++) {
                    click(dwidth * 0.5, dheight * (0.83 + 0.01 * i));
                }
            }
            j++;
        } while (wait(() => text('可解锁').exists(), 3));
        toastLog("解锁次数已耗尽！", "forcible")
    } else {
        toastLog("本次无解锁次数！", "forcible");
    }
    sleep(1000);
}

//------------ 小程序签到 ----------//

function 小程序签到(pram) {
    if (pram === '0') return;
    if (pram === 1 || pram === '1') pram = '去微信';

    console.info(">>>>>>→小程序签到←<<<<<<")
    toastLog("正在尝试打开小程序……", "forcible");

    //小米社区5.3.2以上版本进入小程序
    let isEnabled = isAtLeast(xmVersionName, xmAtLeastVersionName);
    let v53 = className("android.widget.Button")
        .content(pram).findOne(2500);
    if (isEnabled && v53 && !config.坐标点击) {
        openVChat(v53);

    } else {
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
        //再次尝试打开一次，以确保能顺利打开小程序
        toastWarn("小程序未打开", "forcible")
        toastWarn("准备重试！", "forcible")
        home();
        sleep(666);
        if (isEnabled && v53 && !config.坐标点击) {
            launchAPP(xmPckageName);
            while (!packageName(xmPckageName).exists()) sleep(500);
            sleep(666);
            let sign = className("android.widget.ImageView")
                .desc("签到");
            if (wait(() => sign.exists(), 3, 500)) {
                ableClick(sign.findOne());
                sleep(666);
            }
            openVChat(v53);
        } else {
            desktopRun();
        }
    }


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

    let xxcx = className("android.widget.ImageButton")
        .desc("更多").packageName(wchatpn);
    // 已打开微信，但未打开小程序。模拟从微信进入小程序
    if (!wait(() => xxcx.exists(), 8, 600) &&
        (text("通讯录").exists() || desc("返回").exists() || descStartsWith("更多功能").exists())
    ) {
        toastWarn("已打开微信，但未打开小程序！", "forcible");
        toastWarn("尝试从微信进入小程序……", "long", "forcible");
        sleep(1000)
        // 确保回到微信首页
        let bak = className("android.widget.ImageView")
            .desc("返回");

        if (clickCenter(bak)) sleep(1000);

        clickCenter("微信");

        // 微信下滑
        let n = 5;
        while (n--) {
            swipe(dwidth * 0.5, dheight * 0.4, dwidth * 0.5, dheight * 0.7, (n + 2) * 100);
            sleep(300)
        };

        //if (clickCenter(bak)) sleep(1000);

        if (textEndsWith('小程序').exists()) {
            let xlxcx = descStartsWith('小米社区').clickable();
            // 去“更多”，最近使用小程序，里寻找
            if (!wait(() => xlxcx.exists(), 5, 500)) {
                let gengd = className("android.widget.TextView").text("更多").findOne()
                ableClick(gengd);
                let m = 3;
                while (!xlxcx.exists() && m--) {
                    swipe(dwidth * 0.5, dheight * 0.7, dwidth * 0.5, dheight * 0.4, (m + 2) * 100);
                    sleep(1500);
                };
            }
            ableClick(xlxcx.findOne(1000));
        }
    }

    while (!packageName(wchatpn).exists()) sleep(500);

    // 因为小程序布局分析可能失效，无法使用小程序的控件来判断，只能尽量等待
    wait(() => xxcx.exists(), 8, 600);

    log("成功打开小程序！")

    // 尝试刷新
    tryRefresh();

    //sleep(1000);
    console.info("-----→>→签到操作←<←-----");
    let me = text("我的");
    if (wait(() => me.exists(), 6, 600)) {
        // 使用能点击的父控件
        let mep = me.findOne();
        //点我的
        ableClick(mep);
        //clickCenter(mep);
        sleep(1500);
        //点论坛
        ableClick(text("论坛"));
        //click("论坛")
        sleep(1500);
        //再点“我的”
        ableClick(mep);
        //clickCenter(mep);
        toastLog("正在进入[我的]页面……", "forcible")
        // 等待页面加载
        wait(() => text('编辑资料').exists(), 10, 500);
        //sleep(1500);
        if (wait(() => (text('去签到').exists() || text('已签到').exists()), 10, 500)) {
            let qqd = text("去签到").findOne(1000);
            if (qqd) {
                ableClick(qqd);
                // 重复签到
                clickCenter(qqd);
                toastLog("小程序签到成功！✧٩(ˊωˋ*)و✧", "forcible")
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
        click(dwidth * 0.15, dheight * 0.939);
        click(dwidth * 0.15, dheight * 0.9415);
        click(dwidth * 0.15, dheight * 0.944);
        sleep(1500)
        // 点击"我的"
        toastWarn("[不确定操作]摸黑→点击[我的]！")
        click(dwidth * 0.90, dheight * 0.939);
        click(dwidth * 0.90, dheight * 0.9415);
        click(dwidth * 0.90, dheight * 0.944);

        // 确保页面加载完成，多等会儿吧！
        // 不能识别，只能盲目等待了！
        log('等待5秒后继续操作，确保页面加载')
        sleep(5000);
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
        sleep(1000);
        log("二击：" + click(x, y));
        sleep(1000);
        log("三击：" + click(x, y));
    } else {
        toastWarn("[不确定操作]摸黑→点击[签到]！")
        for (i = 0; i < 5; i++) {
            click(dwidth * 0.73, dheight * (0.47 + 0.01 * i));
            // click(dwidth * 0.77, dheight * (0.47 + 0.01 * i));
            click(dwidth * 0.817, dheight * (0.47 + 0.01 * i));
            //  click(dwidth * 0.86, dheight * (0.47 + 0.01 * i));
            click(dwidth * 0.90, dheight * (0.47 + 0.01 * i));
        }
    }

    //  sleep(1000);
    toastWarn("[不确定][签到]，假装已完成！")
}
// 跳转打开微信小程序
function openVChat(button) {
    ableClick(button);
    sleep(1000);
    // 存在微信分身，选择第1个
    let one = className("android.widget.ImageView")
        .descContains("微信");

    if (wait(() => textContains("选择").exists(), 5, 500) &&
        (one.find().length > 1)) {
        let wx = one.findOne();
        ableClick(wx);
        sleep(500);
        clickCenter(wx);
        sleep(2000);
    }

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
                        home();
                        sleep(600);
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
                sleep(500);
                ableClick(xcx.get(0));
                sleep(500);
                ableClick(xcx);
            }
        } else {
            toastError("也许你对我的爱藏的太深，让我无法发现……", "forcible")
            toastError("也许你根本就是在骗我……（▼へ▼メ）", "forcible")
            console.error("请把小程序图标放在桌面上，无论放第几屏都好。")
            console.error("但不要藏在文件夹里，那样真找不到。")
            if (config && config.通知提醒)
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
    sleep(1500);
    var newdate = date.replace(/-/g, "/").substr(0, 10);
    let jilu = text(newdate).find();
    if (jilu.length < 1) {
        //组件无法识别，无法继续了！除非返回重新进来
        toastError("布局分析失效！无法获得明细");
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
    while (!packageName(xmPckageName).exists()) sleep(500);
    console.info(">>>>→开始记录成长值←<<<<")
    toastLog("[社区APP]：记录成长值……");
    let button = text("社区成长等级");
    // 没找到入口
    if (!wait(() => button.exists(), 5, 500)) {
        //返回首页外层
        backAppIndex();
        log('→我的')
        ableClick(text("我的"));
        button = contentStartsWith("成长值");
    }

    //while (scrollUp());
    swipe(dwidth * 0.5, dheight * 0.6, dwidth * 0.5, dheight * 0.8, 100); // 向上滚动查找
    sleep(1000);
    log('进入成长值页面')
    if (!ableClick(button.findOne(2000))) {
        console.error('未找到入口')
        return;
    }

    sleep(1000);
    while (!(text('我的成长值').exists() ||
            text('当前等级').exists()))
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
    sleep(1000);
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

    let outP1 = (`成长值：${成长值记录.当前成长值}(${成长值记录.当前等级()})`).padEnd(15) + (`目标：${成长值记录.升级目标}`);
    let outP2 = (`今日获得：${成长值记录.今日获得()}`).padEnd(11) + (`升级还需：${成长值记录.距离升级还需()}`);
    log(outP1);
    log(outP2);
    log("------------------------------");
    log("详细记录：");

    成长值记录.详细记录.forEach((record) => {
        const item = record.项目.length > 10 ?
            (record.项目.length > 15 ? record.项目.padEnd(20) : record.项目.padEnd(14)) :
            record.项目.padEnd(12, '\u3000');
        log(`${item}` + `${record.结果}`);
    });
    log("------------------------------");

    return outP1 + "\n" + outP2;

}

//主程序
function run() {
    // exit();
    // 开始
    if (config.本地YOLO识图 &&
        config.社区APP签到方式 && config.社区APP签到方式 === 1) {
        // 识图签到初始化
        initImageReco();
    }

    home();

    // 进入正题
    killAPP(xmPckageName);
    if (launchAPP(xmPckageName)) {
        skipAd();
        // 尝试刷新
        tryRefresh();

        //backAppIndex();

        if (config.浏览帖子) posts(1);

        //sleep(1666);
        let sign = className("android.widget.ImageView")
            .desc("签到");
        if (wait(() => sign.exists(), 5, 888)) {
            ableClick(sign.findOne(2000));
            sleep(500);
            // 尝试刷新
            tryRefresh();
            // 签到
            if (config.社区APP签到) start(config.社区APP签到);
            if (config.小程序签到) 小程序签到(config.小程序签到);

            if (!packageName(xmPckageName).exists()) {
                //回到小米社区app
                launchAPP(xmPckageName);
            }
            // 按配置启用功能
            // if (config.加入圈子) join();

            if (config.拔萝卜) pullingCarrots(config.拔萝卜);
            //  if (config.米粉节) fans();
            //  if (config.观看视频) watchVideo();
            if (config.双旗舰) dualFlagships(config.双旗舰);

            if (config.感恩季) ganenji(config.感恩季);
            if (config.成长值记录) level1();

            // sleep(500)
            //back();

        }


    } else {
        sleep(500);
        toastError("(*꒦ິ⌓꒦ີ) 为什么打不开社区APP？", "forcible");
        toastError("哪里出错了？", "forcible");
        console.error('请检查权限')
        console.error('无障碍服务可能故障了')
        if (config && config.通知提醒)
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("芭比Q了，小米社区里的操作都没完成。"));
    }

    // 打印明细
    let lResult = levelResult();

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
        killAPP(xmPckageName);
        consoleMax();
        home();
        sleep(300);
        home();
        if (config && config.通知提醒)
            notice(String('已完成(' + nowDate().substr(5, 14) + ')[' + getDurTime(date) + ']'), String(lResult));
        toastLog("全部已完成！(๑•॒̀ ູ॒•́๑)啦啦啦", "forcible");

    }

    device.cancelKeepingAwake();


    return;
}

module.exports = run; // 导出主程序