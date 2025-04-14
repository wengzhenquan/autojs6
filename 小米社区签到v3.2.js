/*

*****小米社区自动签到脚本*****

原作者  by：PJ小宇    QQ：898811295
修改    by：风中拾叶
三改    by：wengzhenquan
版本号：v3.2

[github更新地址]：

https://github.com/wengzhenquan/autojs6

*/
// 引入配置文件
var config = require("./config.js");
//设置参考坐标，不能动，开发环境标准比例。
setScaleBaseX(1080);
setScaleBaseY(2400);
date = nowDate();
var xmPckageName = "com.xiaomi.vipaccount"; // 社区APP包名
var wchatpn = "com.tencent.mm"; //微信包名，用来校验小程序是否打开
// 滑块的四周坐标
var sliderRegion;
var centerX;
var centerY;
var rX;
var percentage;
var dwidth = device.width;
var dheight = device.height;
// 获取设备制造商
var manufacturer = android.os.Build.MANUFACTURER;
// 获取设备品牌
var brand = android.os.Build.BRAND;
// 签到未完成标志
var unfinished_mark = 0;

//打开悬浮窗控制台
consoleShow();

log("—------★--- Start ---★------—");
log(("AutoJS6 版本：").padStart(22) + autojs.versionName)
console.error("提示：[音量+]键可停止脚本运行");
log(`现在是：${date}`);
log(`设备分辨率：${dwidth}x${dheight}`);
log("制造商：" + manufacturer + "， 品牌：" + brand);
sleep(500);

//打开悬浮窗控制台
function consoleShow() {
    if (config.悬浮窗控制台) {
        //悬浮窗控制台配置
        console.reset();
        console.build({
            size: [0.96, 0.3],
            position: [0.02, 0.02],
            title: '会装逼的控制台',
            titleTextSize: 20,
            titleTextColor: 'green',
            titleIconsTint: 'yellow',
            titleBackgroundAlpha: 0.8,
            titleBackgroundTint: 'dark-blue',
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
        console.show();
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

//悬浮窗控制台变大
function consoleMax() {
    if (console.isShowing()) {
        console.setContentBackgroundAlpha(1)
        console.setSize(0.96, 0.8);
        console.setTouchable(true);
    }
}

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

// 返回间隔时长 01:23 （分：秒）
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

//解锁
function unLock() {
    log("★★★★★★解锁设备★★★★★★");
    device.keepScreenDim(60 * 1000);
    log("开始解锁设备……");
    //两种方式重复上滑
    swipe(dwidth * 5 / 8, dheight * 0.98, dwidth * 5 / 8, dheight * 2 / 4, 1000);
    sleep(500);
    gesture(1000, [dwidth * 5 / 8, dheight * 0.98], [dwidth * 5 / 8, dheight * 2 / 4]);
    log("上滑成功！");
    sleep(300);
    home();
    sleep(300);
    home();
    sleep(300);
    home();
    sleep(666);
    if (!existsOne(desc('第1屏'), desc('电话'), desc('短信'), '微信', '小米社区')) {
        if (config.解锁方式 === 1) {
            log("→图案解锁");
            gesture(800, config.锁屏图案坐标);
        } else if (config.解锁方式 === 2) {
            log("→数字密码解锁");
            for (let i = 0; i < config.锁屏数字密码.length; i++) {
                let num = content(config.锁屏数字密码[i]).findOne();
                clickCenter(num);
                sleep(300);
            }
        }
        sleep(300);
        home();
        sleep(300);
        home();
        sleep(300);
        home();
        sleep(666);
    }

    let result = wait(() => existsOne(desc('第1屏'), desc('电话'), desc('短信'), '微信', '小米社区'), 5, 1000);
    if (!result) {
        console.error("屏幕解锁失败！！！");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String('屏幕解锁失败了！'));
        exit();
    }
    log("屏幕解锁成功！！！(∗❛ั∀❛ั∗)✧*。");
}

//关闭程序
function killAPP(packageName) {
    log("★★★★★关闭社区APP★★★★★")
    //log("确保下次打开社区APP时，会在[论坛]默认页。")
    app.openAppSetting(packageName);
    sleep(600)
    //  let yyxx = text("结束运行" || "强行停止" || "应用信息" || "卸载" || "清除数据");
    let i = 0;
    while (!existsOne(text("结束运行"), text("强行停止"), text("应用信息"), textContains("卸载"), text("清除数据"))) {
        //log(nowDate() + '进来执行了' + i)
        let yyxq = className("android.widget.TextView").text("应用详情")
        if (yyxq.exists()) {
            back();
            sleep(500);
            break;
        }
        if (i % 2 === 0) app.openAppSetting(app.getPackageName("小米社区"))
        else app.openAppSetting(packageName);
        i++;
        sleep(600);

    }

    click("结束运行" || "强行停止");
    sleep(500);
    while (click("确定"));
    toastLog("关闭小米社区！！！", "forcible");

}

//打开程序
function launchAPP(packageN) {
    log("★★★★★启动社区APP★★★★★")
    toastLog("尝试直接调起小米社区APP……", "forcible");
    app.launch(packageN);
    let n = 0;
    // 这个循环走一遍至少需要1秒
    while (!packageName(packageN).findOne(500)) {

        //链式调用权限触发，点“始终允许”
        let dk = className("android.widget.TextView").textContains("想要打开");
        if (dk.exists()) {
            sleep(200)
            className("android.widget.Button").textContains("允许").findOne().click();
            break;
        }
        // 两种启动写法
        if (n % 2 === 0) app.launchApp("小米社区")
        else app.launchPackage(packageN);
        if (n > 3) {
            // 从详情页启动小米社区
            let yyxx = className("android.widget.TextView").text("应用信息").findOne(500);
            let yyxq = className("android.widget.TextView").text("应用详情")
            if (yyxx) {
                toastLog("堵车我就抄小路，\n看我排水沟过弯大法！", "long", "forcible");

                className("android.widget.LinearLayout").desc("更多").findOne().click();
                sleep(300)
                clickCenter(yyxq.findOne());
                sleep(300)
            }
            if (yyxq.exists()) {
                let run1 = className("android.widget.TextView").textContains("启动");
                while (!run1.exists()) {
                    // 上滑寻找“启动”
                    swipe(dwidth * 1 / 2, dheight * 4 / 5, dwidth * 1 / 2, dheight * 1 / 2, 300);
                    sleep(300);

                }
                clickCenter(run1.findOne());
                sleep(1000);
                break;
            }
            if (wait(() => packageName(packageN).exists(), 5, 500)) break;

            toastLog("无法打开小米社区，(*꒦ິ⌓꒦ີ)", "forcible");
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("无法打开小米社区APP！"));

            return false;
        }
        n++;
    }
    toastLog("成功打开小米社区！！！", "forcible");
    return true;
}

//浏览帖子
function posts(n) {
    log("★★★★★★浏览帖子★★★★★★")
    toastLog("准备浏览帖子10s……", "long", "forcible")
    sleep(1500)
    // 小米社区重置首页
    //backAppIndex();

    let pkly = className("android.widget.ImageView").desc("评论").findOne(888);
    if (pkly) {
        // 由于兼容性问题，识别父组件层次不同，
        // 于是向上爬父组件
        //let i = 0;
        // for (; pkly.parent(i).indexInParent() > 0; i++);
        // let tiezi = pkly.parent(i).click();
        // 兼容性改造
        let tiezi = pkly.parent();
        while (tiezi.indexInParent() > 0 || !tiezi.clickable()) {
            tiezi = tiezi.parent();
        }
        tiezi.click();

        //click(tiezi.bounds().centerX() + 100, tiezi.bounds().centerY() - 90);
        sleep(1000);
        let gz = className("android.widget.TextView").text("关注");
        while (!gz.findOne(1666)) {
            if (n > 5) {
                toastLog("打开帖子失败！")
                unfinished_mark = 1;
                return;
            }
            toastLog("第" + n + "次重试")
            // 误点开图片 
            let bc = className("android.widget.TextView").text("保存");
            if (bc.findOne(888)) {
                back();
                sleep(500);
                break;
            }
            // 小米社区重置首页
            backAppIndex();
            // 下滑刷新列表
            swipe(dwidth * 1 / 2, dheight * 3 / 5, dwidth * 1 / 2, dheight * 4 / 5, 300);
            sleep(1000);

            // 坐标点击第一个“评论”入口上方
            click(pkly.bounds().centerX(), pkly.bounds().centerY() - cY(90));
            sleep(1000);
            n++;

        }

    } else {
        toastLog("第" + n + "次重试")
        // 小米社区重置首页
        backAppIndex();
        // 下滑刷新列表
        swipe(dwidth * 1 / 2, dheight * 3 / 5, dwidth * 1 / 2, dheight * 4 / 5, 300);
        sleep(1000);
        if (n > 5) {
            toastLog("打开帖子失败！")
            unfinished_mark = 1;
            return;
        }
        return posts(n + 1);
    }
    log("正在浏览帖子……");
    for (i = 0; i < 4; i++) {
        if (i < 3) toast("正在浏览帖子……", "forcible");
        else toastLog("浏览10s完成！Ｏ(≧▽≦)Ｏ ", "forcible");
        wait(() => false, 1000);
        sleep(1000);
        let ran = random(2, 4) * 100 * Math.pow(-1, i);
        //gesture(1000, [dwidth * 1 / 2, dheight * 0.8 + ran], [dwidth * 1 / 2, dheight * 0.8 - ran]);
        swipe(dwidth * 1 / 2, dheight * 0.8 + ran, dwidth * 1 / 2, dheight * 0.8 - ran, 1000);
    }

    // 返回
    back();
    return;
}

// 重置到小米社区论坛页
function backAppIndex() {
    log("返回[论坛]页面")
    //发现退回图片
    let backImg = className("android.widget.Image").text("返回");
    while (backImg.exists()) {
        backImg.findOne(666).click();
        sleep(300)
    }
    //发现退回按钮
    let backBut = className("android.widget.Button").text("后退");
    while (backBut.exists()) {
        backBut.findOne(666).click();
        sleep(300)
    }
    // 返回“论坛”页
    let index = className("android.widget.TextView").text("论坛");
    let qdBt = className("android.widget.ImageView").desc("签到");
    while (qdBt.exists() &&
        (qdBt.findOne(888).centerX() < 0 || qdBt.findOne(888).centerY() < 0)) {
        let indexAble = index.findOne(1500);
        if (indexAble) {
            indexAble.click();
            indexAble.parent().click();
            sleep(300);
        }
    }
    let pingLun = className("android.widget.ImageView").desc("评论");
    while (pingLun.exists() &&
        (pingLun.findOne(888).centerX() < 0 || pingLun.findOne(888).centerY() < 0)) {
        let indexAble = index.findOne(1500);
        if (indexAble) {
            indexAble.click();
            indexAble.parent().click();
            sleep(300);
        }
    }

}

//寻找坐标
function findCenter() {
    toastLog("开始签到……", "forcible");
    //点击签到按钮
    let qdbt = className("android.widget.TextView").text("立即签到");
    // 没找到入口
    while (!wait(() => qdbt.exists(), 5, 500)) {
        toastLog("未找到活动入口，返回重新进入", "forcible")
        back();
        // 小米社区重置首页
        //backAppIndex();

        className("android.widget.ImageView").desc("签到").findOne(3000).click();
    }
    qdbt.findOne(1500).click()

    // 等待验证图片的加载
    sleep(2000);
    let renew = text("刷新验证").findOne(2000);
    if (!renew) {
        toastLog("芭比Q了，点不开签到页面！", "forcible");
        throw e;
        return;
    }
    //屏幕截图
    captureScr();

    let ycdj = className("android.widget.TextView").textStartsWith("请在下图依次点击").findOne(2500);

    if (ycdj) {
        // 识图认证
        newSign();
    } else {
        //滑块认证
        auth_hk();
    }
}
// 屏幕截图，并保存
function captureScr() {
    log("准备屏幕截图......")
    //悬浮窗控制台最小化
    consoleCollapse();
    // 请求截图权限
    if (!images.requestScreenCapture()) {
        toastLog("请求截图权限失败！˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
        console.error("可能涉及'投影媒体'权限、手机屏幕共享，或者手机重启试试！");
        return;
    }
    wait(() => false, 500);
    //开始截图
   // log("正在屏幕截图！")
    var pictures2 = images.clip(captureScreen(), 0, 0, dwidth, dheight);
    images.save(pictures2, "./tmp/pictures2.png", "png", 100);
    pictures2.recycle();
    log("屏幕截图成功！")
    //展开悬浮窗控制台
    consoleExpand();

}

function newSign() {
    log("将会请求服务器上的程序识别坐标！")
    // 发送请求，获取坐标
    //let url = "http://35.215.183.201:5000/upload";
    let urls = [
        "http://xmst.wengzq.v6.rocks/upload",
        "http://xmst.wzq.dpdns.org/upload",
        "http://xmst.wzqw.zone.id/upload"
    ];
    let i = 0,
        n = 0,
        u = 0;
    let url = urls[u];

    while (true) {
        log("开始第" + (i + 1) + "次申请");
        let res = upload(url);
        if (res.statusCode == 200) {
            log("坐标分析成功啦！")
            clickPic(res.body.json());
            return;
        } else if (res.statusCode == 500) {
            n++
            if (n > 2) {
                toast("识别失败了˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
                console.error("向程序员反馈，自动适配分辨率不成功！");
                throw e;
                return;
            }
            log("截图尺寸不合适，刷新图片重试！");
            text("刷新验证").findOne(2000).click();
            sleep(1000);
            //重新截图
            captureScr();

        } else {
            u++;
            if (u === urls.length) {
                toast("识别失败了˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
                console.error("所有服务器都挂了，放弃吧！");
                throw e;
                return;
            }
            log("服务器错误，跟换服务器重试！")
            url = urls[u];

        }
        i = n + u;

        if (i > 5) {
            toast("识别失败了˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
            console.error("重试好多次了，我也不知道发生了什么问题！");
            throw e;
            return;
        }
    }

}

//上传图片
function upload(url) {
    //再次截图，以便传输
    var pictures2 = images.read("./tmp/pictures2.png");
    var pic = images.clip(pictures2, cX(101), cY(638),
        (cX(979) - cX(101)), (cY(1622) - cY(638)));

    images.save(pic, "./tmp/pic.png", "png", 100);
    pictures2.recycle();
    pic.recycle();

    let pic_dir = files.cwd() + "/tmp/pic.png";

    let startTime = new Date().getTime();
    try {
        var res1 = http.postMultipart(url, {
            file: ["0.jpg", pic_dir]
        }, {
            timeout: 30 * 1000
        });
    } catch (e) {
        //异常不处理
        //console.error(e.message);
    }

    let time = (new Date().getTime() - startTime);
    log("服务器请求时间：" + time + " ms");
    return res1
}
// 点击图标
function clickPic(list) {
    for (let i = 0; i < list.length; i++) {
        x = list[i][0] + cX(101) + cX(random(20, 40))
        y = list[i][1] + cY(638) + cY(random(40, 60))
        let icon = list[i][2]
        log("点击第" + (i + 1) + "个图标：" + icon)
        click(x, y)
        sleep(1000)
    }
    log("图标点击完成")
    click("提交答案")
    sleep(1000)
    if (textContains("已签到").findOne(3000)) log("签到成功")
}

// 滑块认证
function auth_hk() {
    var pictures2 = images.read("./tmp/pictures2.png");
    // 读取滑块图片
    var wx = readHk();
    //截图并找图
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
    let hk = (`hk/hk_${dwidth}x${dheight}` + `.png`);
    let wx = images.read("./" + hk);
    // 分辨率找不到，就读预制的图
    //if (null === wx) wx = images.read("./hk.png");
    // 自动适配
    if (null === wx) {
        var hk_auto = images.clip(captureScreen(),
            cX(165), cY(1276), (cX(349) - cX(165)), (cY(1460) - cX(1276)));
        images.save(hk_auto, "./hk/hk_auto.png", "png", 100);
    }
    return hk_auto;
}

//新版签到
function qd2(n) {
    if (n > 3) {
        log("没找到缺口！！");
        throw e;
    }
    // 滑块的中心坐标
    var sliderCenter = [centerX, centerY];
    // 滑块宽度
    var sliderWidth = sliderRegion[2] - sliderRegion[0];

    // 为了得到滑动终点的横坐标

    //2400分辨率标准，截图起始位置
    var chight = 1110 - (90 * n);
    //截图高度
    var hight = 200;

    var img3 = images.read("./tmp/pictures2.png");
    // 开始截图
    var gapImage = images.clip(img3, sliderCenter[0], cY(chight),
        cX(800) - sliderCenter[0], hight);
    // 灰度化缺口区域
    var grayGapImage = images.grayscale(gapImage);
    // 二值化缺口区域
    var binaryGapImage = images.threshold(grayGapImage, 95, 255, "BINARY");

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
    var point = findColor(binaryGapImage, "#000000", {
        region: [0, 0],
        threshold: 4
    });
    if (point === null || point.x === 0) {
        // 点在图片左侧边缘
        binaryGapImage.recycle();
        return qd2(n); // 截图位置上移
    }
    // 第二个黑色点，缺口左边缘，位置必须在滑块右侧
    var point2 = findColor(binaryGapImage, "#000000", {
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
    var excluWidth = 96;
    // 第三个点，缺口右边缘
    var point3 = findColor(binaryGapImage, "#000000", {
        region: [point2.x + notchWidth, 0, (binaryGapImage.width - (point2.x + notchWidth)), 70],
        threshold: 4
    });
    if (point3 === null || (point3.x - point2.x) > cX(150)) {
        //找到的点太离谱，或者没找到
        binaryGapImage.recycle();
        return qd2(n); // 截图位置上移
        //使用预估宽度当成点
        //point3x = notchWidth + point2.x;
    }
    binaryGapImage.recycle();
    // --------  误差  -----------
    //滑块宽度
    var notchWidth = point3.x - point2.x;
    if (notchWidth === excluWidth)
        notchWidth = notchWidth + random(9, 15);

    if (notchWidth < cX(105))
        notchWidth = notchWidth + random(3, 6);

    let longx = point2.x + notchWidth - point.x;
    log("需要移动的距离为：" + longx);
    log("终点坐标：(" + (longx + sliderCenter[0]) + "," + sliderCenter[1] + ")")

    //签到！滑动！
    toastLog("开始模拟滑动……", "forcible");
    // 把移动距离x10当成滑动时间，并确保在3秒以内
    let time = (longx > 250 ? longx * 0.5 : longx) * 10;
    gesture(time, sliderCenter, [(longx + sliderCenter[0]), sliderCenter[1]]);

    var done = text("已签到").findOne(3000);
    if (done) {
        toastLog("签到完成！！！(๑´∀`๑)", "forcible");

    } else {
        log("新版签到失败！！");
        throw e;
    }

}

//签到
function qd() {
    var len;
    var con = config.con;
    var sta = "10(0{" + con + ",})1"

    if (!images.requestScreenCapture()) {
        toastLog("请求截图失败", "long", "forcible");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("请求截图失败！"));
        return;
    }
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
            log("签到失败1");
            notice(String('签到失败！(' + nowDate().substr(5, 14) + ')'), String("重新执行一次脚本试试吧！"));

        }
    } else {
        log("签到失败2");
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

//拔萝卜活动
function see() {
    log("★★★★★★萝卜活动★★★★★★");

    while (scrollDown());

    toastLog("拔萝卜活动签到……", "forcible");
    sleep(1000);
    var button = className("android.widget.Button").text("去看看");
    if (!wait(() => button.exists(), 5, 500)) {
        toastLog("未找到活动入口，返回重新进入", "forcible")
        back();
        // 小米社区重置首页
        backAppIndex();
        // 重新进入签到页面
        className("android.widget.ImageView").desc("签到").findOne(3000).click();
    }
    button.findOne(1666).click();

    sleep(1000);
    back();

}

//米粉节活动
function fans() {
    var button = className("android.widget.Button").text("去参与").findOne(1500);
    if (button) {
        button.click();
        toastLog("打开米粉节活动", "forcible")
        var dianl = className("android.widget.Button").text("点亮今日足迹").findOne(1200);
        var chouka = className("android.widget.Button").text("抽取今日祝福").findOne(1200);
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
        button2 = className("android.widget.Button").text("抽取今日祝福").findOne(1200).click();
        if (button2) {
            toastLog("今日祝福已抽取", "forcible");
        }
    } else {
        toastLog("按钮为空，无法点击", "forcible");
    }

}

//观看视频
function watchVideo() {
    var watch = className("android.widget.Button").text("去浏览").findOne(1000); //查找'去浏览'按钮 
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
    var percentageUi = className("android.widget.TextView").textContains("当前签到+1的概率：").findOne(1500)
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
    let qujiaru = className("android.widget.Button").text("去加入").findOne(1500)
    if (qujiaru) {
        qujiaru.click()
        let join = className("android.widget.Button").text("加入圈子").findOne(1500).click()
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

function 活动1() {
    log("★★★★★★旗舰活动★★★★★★")
    toastLog("开始双旗舰活动……", "forcible")
    let cj = className("android.widget.Button").text("去参加");

    if (!wait(() => cj.exists(), 5, 500)) {
        toastLog("未找到活动入口，返回重新进入", "forcible")
        back();
        // 小米社区重置首页
        backAppIndex();
        // 重新进入签到页面
        className("android.widget.ImageView").desc("签到").findOne(3000).click();
    }

    cj.findOne(1500).click()
    let register = className("android.widget.Button").text("立即报名").findOne(1500);
    if (register) {
        sleep(500)
        // 勾选 “我已阅读并同意”
        let checkBox = register.nextSibling().click();
        sleep(500);
        if (checkBox) {
            //立即报名
            register.click()
            sleep(1500)
            //机型确认，识别不到组件，也无法识别到（“确定”）文字，
            //位置在右下角
            let x = dwidth * 0.74
            let y = dheight * 0.94
            click(x, y)
            sleep(500)
        }
    }
    解锁(cj);
    back();

}

//感恩季活动
function ganenji() {
    let qucanyu = className("android.widget.Button").text("去参与");

    // 没找到入口
    while (!wait(() => qucanyu.exists(), 5, 500)) {
        toastLog("未找到活动入口，返回重新进入", "forcible")
        back();
        // 小米社区重置首页
        backAppIndex();
        // 重新进入签到页面
        className("android.widget.ImageView").desc("签到").findOne(3000).click();
    }
    qucanyu.findOne(1500).click()

    sleep(500);
    解锁(qucanyu);
    sleep(500);
    back();
    sleep(500);

}

function 解锁(button) {
    let qts = className("android.widget.Button").text("去提升");
    // 页面没成功加载
    if (!qts.findOne(1500)) {
        //重新进入
        back();
        sleep(1000)
        button.findOne().click();
        sleep(1000)

    }
    qts = qts.findOne();

    let count = qts.sibling(1).text();
    let jpso = className('android.widget.TextView').text('可解锁').find();

    if (!isNaN(count) && jpso.length > 0 && count > 0) {
        for (i = 0; i < jpso.length; i++) {
            if (count < 1) {
                sleep(600);
                // 一次复活机会（可能解锁后额外获得一次机会）
                count = qts.sibling(1).text();
                if (isNaN(count) || count < 1) {
                    toastLog("解锁次数已耗尽！", "forcible")
                    sleep(500);
                    break;
                }
            }
            if (className("android.widget.TextView").text("等待解锁").exists() ||
                className("android.widget.TextView").text("可获得1次解锁机会").exists()) {
                toastLog("解锁次数已耗尽！", "forcible")
                sleep(500);
                break;
            }
            //开箱有3秒间隔限制
            if (i > 0) sleep(3000);

            //开始
            var control = jpso.get(i).parent();
            //clickCenter(control);
            control.click();
            log("尝试第" + (i + 1) + "次解锁！(/≧▽≦)/~┴┴ ");
            sleep(500);
            // 关闭炫耀一下
            let xyyx = className("android.widget.Button").text("炫耀一下").findOne(888);
            if (xyyx) {
                // 关闭图形❌组件
                clickCenter(xyyx.nextSibling());
            } else {
                // 无法识别到“炫耀一下”弹窗，也无法识别关闭图形❌组件
                // 只能靠坐标关闭
                click(dwidth * 0.5, dheight * 0.87);
            }
            //次数消耗
            count--;
        }
    } else {
        toastLog("今日无解锁次数！", "forcible");
        sleep(500);
    }
    sleep(1000);
}

function 小程序签到() {
    log("★★★★★小程序签到★★★★★★");
    toastLog("正在尝试打开小程序……", "forcible");
    //小米社区5.3以上版本进入小程序
    let v53 = className("android.widget.Button").text("去微信").findOne(1500);
    if (v53) {
        v53.click();
        sleep(1500);
        // 存在微信分身，选择第1个
        let fenshen = className("android.widget.TextView").textContains("选择");
        let one = className("android.widget.ImageView").desc("微信");
        if (fenshen.exists() && one.find().length > 1) {
            sleep(666);
            clickCenter(one.findOne());
        }
        sleep(2000);

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

    sleep(500);
    // 微信打开验证（小程序依赖微信，使用微信的包名）
    if (!wait(() => packageName(wchatpn).exists(), 10, 600)) {
        // 找不到微信的包名，自然也没能进入小程序
        toastLog("进不了微信小程序，我尽力了！(ó﹏ò｡) ", "long", "forcible");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("进不了微信小程序，我尽力了！"));
        back();
        return;
    }

    let xxcx = className("android.widget.ImageButton").desc("更多").packageName(wchatpn);
    sleep(500);
    // 已打开微信，但未打开小程序。模拟从微信进入小程序
    // 如果微信页面布局分析失效，可能无法模拟
    if (!xxcx.exists() &&
        (text("通讯录").exists() || desc('更多功能按钮').exists())) {

        toastLog("已打开微信，但未打开小程序！", "forcible");
        toastLog("开始尝试从微信进入小程序……", "long", "forcible");

        // 微信下滑
        swipe(dwidth * 1 / 2, dheight * 1 / 5, dwidth * 1 / 2, dheight * 4 / 5, 500);
        let xlxcx = descStartsWith('小米社区');
        // 去“更多”，最近使用小程序，里寻找
        if (!wait(() => xlxcx.exists(), 5, 500)) {
            className('android.widget.RelativeLayout').desc('更多小程序').findOne().click();

            while (!xlxcx.exists()) {
                swipe(dwidth * 1 / 2, dheight * 4 / 5, dwidth * 1 / 2, dheight * 1 / 5, 300);
                m++;
                if (m > 6) {
                    //sleep(500);
                    toastLog("好累啊，你多久没用小米社区小程序了？", "forcible")
                    toastLog("翻遍了你的小程序使用记录都没有！", "forcible")
                    toastLog("老子不玩了！", "forcible")
                    notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("找不到小米社区小程序！"));

                    return;
                }
                sleep(500);
            }
        }
        xlxcx.findOne(2666).click();
        //clickCenter(xlxcx.findOne(2666));
        sleep(600);

    }

    //真正的小程序打开验证
    if (!wait(() => xxcx.exists(), 5, 500)) {
        //无法通过打开小程序校验，可能因为小程序布局分析失效导致
        //但通过了前面打开微信的验证，
        // 不能确保成功打开小程序
        if (config.跳过小程序打开验证) {
            //再次尝试从桌面打开一次，以确保能顺利打开小程序
            //如果不想做这一步，可以注释掉下面4行代码
            toastLog("无法验证小程序是否已打开，", "forcible")
            toastLog("只好再次打开一次，以求安心！", "forcible")
            home();
            sleep(666);
            desktopRun();

            //wait(() => packageName(wchatpn).exists(), 10, 600);
            //保留sleep(2000);增加延时两秒等待小程序启动
            sleep(2000);

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
    //sleep(1500);
    log("---------  开始签到操作  --------");
    let me = className("android.widget.TextView").text("我的");
    // 控件没找到，或许布局分析失效！
    //log('卡1')
    if (!wait(() => me.exists(), 6, 500)) {
        toastLog("不好了！布局分析失效了！Σ(ŎдŎ|||)ﾉﾉ", "forcible")
        sleep(500)
        toastLog("只能摸黑操作，点击坐标试试看……")
        // 先点击"论坛"，以防页面卡顿
        click(dwidth * 0.25, dheight * 0.96);
        click(dwidth * 0.25, dheight * 0.97);
        click(dwidth * 0.25, dheight * 0.98);
        sleep(1000)
        // 点击"我的"
        toastLog("【不确定操作】摸黑→点击[我的]！")
        click(dwidth * 0.75, dheight * 0.96);
        click(dwidth * 0.75, dheight * 0.97);
        click(dwidth * 0.75, dheight * 0.98);

        // 确保页面加载完成，多等会儿吧！
        // 不能识别，只能盲目等待了！
        sleep(3000);

        // 点击"签到"
        toastLog("【不确定操作】摸黑→点击[签到]！")
        click(dwidth * 0.817, dheight * 0.496);
        click(dwidth * 0.82, dheight * 0.5);

        sleep(1000);
        log("【不确定】[签到]，假装已完成！")

    } else {
        // log('卡2')
        // 使用能点击的父控件
        let mep = me.findOne().parent();
        if (!mep.clickable()) {
            mep = mep.parent();
        }
        mep.click();
        clickCenter(mep);
        // log('卡3')
        toastLog("正在进入[我的]页面……", "forcible")
        let edit = className("android.widget.TextView").text('编辑资料');
        let cont = 0
        //页面卡了
        //  log('卡4')
        while (!edit.findOne(1500)) {
            log('卡n')
            log("点击[我的]页面……")
            //先点一下论坛
            click("论坛");
            sleep(1000);
            //再点“我的”
            mep.click();
            clickCenter(mep);
            // click(dwidth*3/4,dheight*0.96)
            sleep(1500);
            cont++;
            if (cont > 5) {
                toastLog("进不了[我的]页面！)", "forcible");
                return;
            }
        }
        // log('卡5')
        className("android.widget.TextView").text("每日签到").waitFor();
        //sleep(2000);
        // log('卡6')
        let qdbt = className("android.widget.TextView").text("去签到");
        if (qdbt.exists()) {
            //  log('卡7')
            clickCenter(qdbt.findOne());
            sleep(1500);
        }
        // log('卡8')
    }
    //sleep(300);

    toastLog("小程序已签到！✧٩(ˊωˋ*)و✧", "forcible")
    // 记录成长值
    if (config.成长值记录) level2();
    sleep(1000);
    // 确保完成之后小程序回到最外面一层，下次打开小程序不会在子页面。
    back();
}

// 桌面打开小程序操作
function desktopRun() {
    if (config.坐标点击) {
        log("用户配置→{坐标点击:1}")
        toastLog("从第3屏，用户提供的坐标寻找……", "forcible")
        //第3屏获取小程序
        let tr = className("android.widget.ImageView").desc("第3屏");
        //寻找第3屏
        if (!wait(() => tr.exists(), 5, 1000)) {
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("我找不到第3屏（˃̣̣̥᷄⌓˂̣̣̥᷅）！"));
            exit();

        }

        tr.click()
        //clickCenter(xlxcx.findOne(2666));
        sleep(1500);
        for (i = 0; i < 3; i++) {
            click(config.x, config.y)
            toastLog("点击坐标[" + config.x + "," + config.y + "]")
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
                log("—————————-----------→");

                for (i = 0; i < xcx.length; i++) {
                    xcx.get(i).click();

                    log("正在尝试打开→第[ " + (i + 1) + " ]个！");
                    if (wait(() => packageName(xmPckageName).exists(), 4, 500)) {
                        toastLog("这个不对，尝试下一个！", "forcible");
                        home();
                        sleep(600);
                    } else {
                        log("已找到小程序图标！");
                        toastLog("小程序打开缓慢，请耐心等待……", "long", "forcible");
                        break;
                    }

                }
                log("←-----------—————————");

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

//小程序版成长值
function level2() {
    log("-----→");
    toastLog("【小程序】：正在记录成长值……", "forcible")
    var num = className("android.widget.TextView").text("成长值").findOne(2000);
    if (!num) {
        toastLog("布局分析失效，未能找到成长值！", "forcible");
        toastLog("【不确定操作】摸黑→点击[成长值]", "forcible");
        //点击查看明细
        click(dwidth * 0.5, dheight * 0.6);
        click(dwidth * 0.3, dheight * 0.6);
        click(dwidth * 0.8, dheight * 0.6);

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
    let jilu = className("android.widget.TextView").text(newdate).find();
    if (jilu.length < 1) {
        //组件无法识别，无法继续了！除非返回重新进来
        log("小程序布局分析失效！无法获得明细");
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
    log("-----→");
    toastLog("【社区APP】：正在记录成长值……")
    let button = className("android.widget.TextView").text("社区成长等级");
    // 没找到入口
    while (!wait(() => button.exists(), 5, 500)) {
        back();
        // 小米社区重置首页
        backAppIndex();
        // 重新进入签到页面
        className("android.widget.ImageView").desc("签到").findOne(3000).click();
    }
    button.click();
    sleep(1000);
    let czz = className("android.widget.TextView").textStartsWith("成长值");
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
    let jilu = className("android.widget.TextView").text(newdate).find();
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
    log("★★★★★★今日明细★★★★★★");
    if (config.成长值记录 < 1) {
        log("搞美雅！")
        log("配置[成长值记录:0]，没记录成长值！")
        return "恭喜完成！恭喜！\n没有记录成长值，这里没内容显示啦！";
    };

    let outP1 = ((`成长值：${成长值记录.当前成长值}(${成长值记录.当前等级()})`).padEnd(17) + (`升级目标：`).padStart(0) + `${成长值记录.升级目标}`);
    let outP2 = ((`今日获得：${成长值记录.今日获得()}`).padEnd(13) + (`距离升级还需：`).padStart(0) + `${成长值记录.距离升级还需()}`);
    log(outP1);
    log(outP2)
    log("---------------------------------");
    log("详细记录：");

    let maxLen = 20;
    // const records = 成长值记录.详细记录;
    成长值记录.详细记录.forEach((record) => {
        const item = record.项目.length > 10 ?
            record.项目.padEnd(20) : record.项目.padEnd(30);
        console.log(`${item}` + `${record.结果}`);
    });
    log("---------------------------------");

    return outP1 + "\n" + outP2;

}

//成长值文件
// function readfile(filePath) {
//     if (!files.exists(filePath)) {
//         files.createWithDirs(filePath); // 如果文件不存在则创建 
//         return 0;
//     }
//     var fileContent = files.read(filePath);
//     if (!fileContent) return 0; // 如果文件无数据则返回0 
//     var lines = fileContent.split("\n");
//     var lastLine = lines[lines.length - 1];
//     return parseInt(lastLine);
// }

//跳过广告
function skipAd() {
    let adCloseBtn = className("android.widget.ImageView").desc("关闭").findOne(688);
    if (adCloseBtn) {
        adCloseBtn.click();
        log("跳过了广告");
    }
}

function clickCenter(obj) {

    let x = obj.bounds().centerX()
    let y = obj.bounds().centerY()
    //log(x,y)
    return click(x, y);
}

function start() {
    log("★★★★★★开始签到★★★★★★");
    percentage = logpercentage();
    var done = text("已签到").findOne(1666);
    try {
        if (!done) {
            findCenter();
        }
    } catch (e) {
        unfinished_mark = 1;
        console.error("社区APP签到失败！");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("社区APP签到失败了！"));
        console.error(e.message);
        return;
    } finally {
        //展开悬浮窗控制台
        consoleExpand();
    }

    toastLog("今日已签到！", "forcible");
}

// 权限验证
function permissionv() {
    log("★★★★★★验证权限★★★★★★");
    log("---------  必要权限检测  --------");
    // 无障碍权限
    auto.waitFor();

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
        toast("发送通知权限，未启用!");
        console.error("发送通知权限，未启用!");
        exit();
    }

    //悬浮窗权限
    if (autojs.canDisplayOverOtherApps()) {
        log("悬浮窗权限，[已启用]");
    } else {
        toast("悬浮窗权限，未启用!");
        console.error("悬浮窗权限，未启用!");
        exit();
    }

    // 投影媒体权限
    importClass(android.app.AppOpsManager);

    function checkProjectionPermission() {
        let appOps = context.getSystemService(context.APP_OPS_SERVICE);
        let mode = appOps.checkOpNoThrow("android:project_media", android.os.Process.myUid(), context.getPackageName());
        return mode == AppOpsManager.MODE_ALLOWED;
    }
    if (checkProjectionPermission()) {
        log("投影媒体权限，[已启用]");
    } else {
        toast("投影媒体权限，未启用!");
        console.error("投影媒体权限，未启用！");
        console.error("脚本无法全自动完成所有流程！");
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
        console.error("后台弹出界面权限，未启用!");
        toast("后台弹出界面权限，未启用!");
        console.error("功能受限，可能无法顺利完成全部流程！");
        console.error("应用详情→权限管理→其它权限→后台弹出界面");
        notice(String("功能受限！(" + nowDate().substr(5, 14) + ")"),
            String("缺少'后台弹出界面'权限，\n权限管理→其它权限→后台弹出界面"));
        sleep(3000);
    }

    log("---------  不必要权限！  --------");
    // Shizuku权限检测
    if (shizuku.running) {
        log("Shizuku授权，[已启用]");
    } else {
        log("Shizuku授权，未启用!");
    }

    if (autojs.isRootAvailable()) {
        log("Root授权，[已启用]");
    } else {
        log("Root授权，未启用!");
    }

    //音量加，停止脚本
    events.setKeyInterceptionEnabled("volume_up", true);
    events.observeKey();
    events.onKeyDown("volume_up", () => {
        //volume_down
        //volume_up
        console.error("[音量+]停止脚本！！！");
        console.hide();
        exit();
        console.error("3…2…1…停！哎~快停！");
    });

    // exit();
}

// 单元测试用例
function test() {

    // 回到APP首页
    // backAppIndex();
    //home()

    sleep(1000);
    // var hk = (`hk_${dwidth}x${dheight}` + `.png`);
    // toastLog(hk);
    var start = new Date().getTime();

    // var done = className("android.widget.TextView").text("已签到");

    //let gz = wait(() => packageName("com.tencent.mm").exists(), 500);
    //let gz = text("结束运行" && "强行停止" && "应用信息" &&"卸载" && "清除数据");
    let gz = textContains("哎呀哎呀" && "结束运行" && "强行停止");

    if (gz.exists()) {
        toastLog(true);
        let gz1 = gz.find()
        log(gz1.length)
        log(gz1)
        //log(gz.get(0).desc())
        //gz.click();

    } else toastLog(false);

    var time = (new Date().getTime() - start);

    toastLog(time, "forcible");
    notice(String(date), String(time))
    exit();
}

//主程序
function main() {
    // test();
    //exit();
    //return;

    // 开始
    if (!device.isScreenOn()) {
        log("设备已锁定！！！");
        while (!device.isScreenOn()) {
            device.wakeUp()
            sleep(100)
        }
        sleep(500);
        unLock();
        wait(() => false, 20, 100);

    }
    device.keepScreenDim(60 * 1000);

    //let musicVolume = device.getMusicVolume();
    //关掉声音
    //device.setMusicVolume(0);
    //权限验证
    permissionv();
    // 进入正题
    killAPP(xmPckageName);
    if (launchAPP(xmPckageName)) {
        skipAd();
        if (config.浏览帖子) posts(1);
        let sign = className("android.widget.ImageView").desc("签到").findOne(3000).click();
        if (sign) {
            //toastLog("打开[签到]页面……", "forcible");
            sleep(500);

            // 签到
            start();
            // 按配置启用功能
            if (config.双旗舰) 活动1();
            if (config.加入圈子) join();
            // if (config.感恩季) ganenji();
            if (config.拔萝卜) see();

            //  if (config.米粉节) fans();
            //  if (config.观看视频) watchVideo();
            if (config.成长值记录) level1();
        }

    } else {
        sleep(500);
        toastLog("(*꒦ິ⌓꒦ີ) 为什么打不开社区APP？", "forcible");
        toastLog("哪里出错了？", "forcible");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("芭比Q了，小米社区里的操作都没完成。"));
    }
    if (config.小程序签到) 小程序签到();
    if (unfinished_mark) {
        //启动小米社区
        launchAPP(xmPckageName);
        // 控制台缩小
        console.setSize(0.96, 0.25);

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
        toastLog("全部已完成！！！(๑•॒̀ ູ॒•́๑)啦啦啦", "forcible");

    }

    //device.setMusicVolume(musicVolume);
    device.cancelKeepingAwake();
    log("     ——— 耗时[ " + getDurTime(date) + " ] ———");
    log("———★——  End  ——★———");

    try {
        exit();
    } catch (e) {
        // Ignored.
    } finally {
        // console.hide();
        //  console.reset();

    }
    return;

}

main();

// try {
//     main();

// } catch (e) {
//     console.error(e.stack);
// } finally {
//     console.hide();
//     console.reset();
//     console.hide();

// }