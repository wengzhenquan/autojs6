/*

*****小米社区自动签到脚本*****

原作者  by：PJ小宇    QQ：898811295
修改    by：风中拾叶
三改    by：wengzhenquan
版本号：20250326

[github更新地址]：

https://github.com/wengzhenquan/autojs6

*/
// 引入配置文件
var config = require("./config.js");

//run(); //计时
//curTime = new Date();
// date = curTime.getFullYear() + "-" + (curTime.getMonth() + 1) + "-" + curTime.getDate();
date = nowDate();
sleep(500);
var xmPckageName = "com.xiaomi.vipaccount"; // 社区APP包名
var wchatpn = "com.tencent.mm"; //微信包名，用来校验小程序是否打开
var centerX;
var centerY;
var rX;
var percentage;
var dwidth = device.width;
var dheight = device.height;
log("——-------★----  Start  ----★-------——");
log(`现在是：${date}`);
log(`设备分辨率：${dwidth}x${dheight}`);
main();

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

//运行时间
function run() {
    threads.start(function() {
        starttime = new Date().getTime();
        setInterval(function(time) {
            endtime = new Date().getTime();
            let runtime = Math.floor((endtime - time) / 1000)
            //log("运行时间：" + runtime + "秒"); 
            if (runtime >= config.totaltime) {
                log("定时结束");
                device.cancelKeepingAwake();
                exit();
            }
        }, 10000, starttime)
    })
}

//解锁
function unLock() {
    log("★★★★★★解锁设备★★★★★★");
    device.keepScreenOn(3600 * 1000);
    log("开始解锁设备……");
    if (swipe(dwidth * 1 / 2, dheight * 0.96, dwidth * 1 / 2, dheight * 1 / 2, 300)) {
        log("上滑成功！");
    } else {
        gesture(300, [dwidth * 1 / 2, dheight * 0.96], [dwidth * 1 / 2, dheight * 1 / 2]);
    }
    home();
    sleep(666);
    home();
    sleep(666);
    let jiesuo = desc('第1屏');
    if (!jiesuo.exists()) {
        if (config.解锁方式 === 1) {
            log("→图案解锁");
            gesture(800, config.锁屏图案坐标);
        } else if (config.解锁方式 === 2) {
            log("→数字密码解锁");
            for (let i = 0; i < config.锁屏数字密码.length; i++) {
                desc(config.锁屏数字密码[i]).findOne().click();
            }
        }
        home();
        sleep(666);
        home();
        sleep(666);
    }

    let result = wait(() => jiesuo.exists(), 10, 500)
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
    app.openAppSetting(packageName);
    sleep(600)
    let yyxx = textContains("结束运行" || "强行停止");
    let i = 0;
    while (!yyxx.exists()) {
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
    toastLog("结束小米社区！！！", "forcible");

}

//打开程序
function launchAPP(packageN) {
    log("★★★★★启动社区APP★★★★★")
    toastLog("正在尝试直接调起小米社区APP……", "forcible");
    app.launch(packageN);
    // let a = waitForPackage(packageName, 500)
    // log(a)
    // let qdBt = className("android.widget.FrameLayout").packageName(packageName);
    let n = 0;
    while (!packageName(packageN).findOne(500)) {
        //while (!qdBt.findOne(888)) {

        //链式调用权限触发，点“始终允许”
        let dk = className("android.widget.TextView").textContains("想要打开");
        if (dk.exists()) {
            sleep(200)
            className("android.widget.Button").textContains("允许").findOne().click();
            break;
        }
        //log(n)
        // 两种启动写法
        if (n % 2 === 0) app.launchApp("小米社区")
        else app.launchPackage(packageN);
        //log(waitForPackage(packageName, 4500));        
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

            toastLog("无法打开小米社区，(*꒦ິ⌓꒦ີ)", "forcible");
            notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("无法打开小米社区APP！"));

            //sleep(500);
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
    //toastLog("打开帖子", "forcible");
    toastLog("准备浏览帖子10s……", "long", "forcible")
    sleep(1500)
    // 小米社区重置首页
    //backAppIndex();

    let pkly = className("android.widget.ImageView").desc("评论").findOne(888);
    if (pkly) {
        // 由于兼容性问题，识别父组件层次不同，
        // 于是向上爬父组件
        let i = 0;
        for (; pkly.parent(i).indexInParent() > 0; i++);
        let tiezi = pkly.parent(i).click();
        //clickCenter(tiezi);

        //click(tiezi.bounds().centerX() + 100, tiezi.bounds().centerY() - 90);
        sleep(500);
        let gz = className("android.widget.TextView").text("关注");
        while (!gz.findOne(1666)) {
            log("帖子打开失败，重试！")
            // sleep(300);
            // 误点开图片 
            let bc = className("android.widget.TextView").text("保存");
            if (bc.findOne(888)) {
                back();
                sleep(500);
                break;
            }
            // 小米社区重置首页
            backAppIndex();
            // 坐标点击第一个“评论”入口上方
            click(pkly.bounds().centerX(), pkly.bounds().centerY() * 0.9);

        }

    } else {
        toastLog("第" + n + "次重试")
        // 小米社区重置首页
        backAppIndex();
        // 下滑刷新列表
        swipe(dwidth * 1 / 2, dheight * 3 / 5, dwidth * 1 / 2, dheight * 4 / 5, 300);
        sleep(600);
        if (n > 5) {
            toastLog("打开帖子失败！")
            return;
        }
        return posts(n + 1);
    }

    //toast.dismissAll();
    for (i = 0; i < 4; i++) {
        if (i < 3) toast("正在浏览帖子……", "forcible");
        else toastLog("浏览10s完成！Ｏ(≧▽≦)Ｏ ", "forcible");
        wait(() => false, 10, 100);
        sleep(1000);
        let ran = random(3, 6) * 100 * Math.pow(-1, i);
        gesture(1000, [dwidth * 1 / 2, dheight * 0.6 + ran], [dwidth * 1 / 2, dheight * 0.6 - ran]);
        //swipe(dwidth*1/2, dheight*0.6+ran, dwidth*1/2, dheight*0.6-ran, 1000);     
    }
    //exit();

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
            clickCenter(indexAble);
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
            clickCenter(indexAble);
            sleep(300);
        }
    }

}

//寻找坐标
function findCenter() {
    toastLog("开始签到……", "forcible");
    //点击签到按钮
    className("android.widget.TextView").text("立即签到").findOne().click();
    // 等待验证图片滑块的加载
    sleep(2500);
    // 请求截图权限
    if (!images.requestScreenCapture()) {
        toastLog("请求截图权限失败！˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚", "forcible");
        console.error("可能涉及'投影媒体'权限、手机屏幕共享，或者手机重启试试！");
        //exit();
        return;
    }
    wait(() => false, 500);
    //开始截图
    var pictures2 = images.clip(captureScreen(), 0, 0, dwidth, dheight);
    images.save(pictures2, "./tmp/pictures2.png", "png", 100);
    var img2 = images.read("./tmp/pictures2.png");
    // 读取滑块图片
    var wx = readHk();
    //截图并找图
    var p = findImage(img2, wx, {
        //region: [0, 50],
        threshold: 0.8
    });
    if (p) {
        // 计算小图在大图中的中心坐标
        centerX = p.x + wx.width / 2;
        centerY = p.y + wx.height / 2;
        rX = p.x + wx.width * 3 / 4;
        pY = p.y
        // 显示找到的小图中心坐标
        log("找到滑块中心坐标：(" + centerX + ", " + centerY + ")");
        img2.recycle();
        wx.recycle();
        qd(); //开始签到
    } else {
        toastLog("没有找到滑块", "forcible");
    }
    // sleep(500);
}

// 读取滑块图片hk.png
function readHk() {
    //先根据分辨率读
    var hk = (`hk/hk_${dwidth}x${dheight}` + `.png`);
    var wx = images.read("./" + hk);
    // 分辨率找不到，就读预制的图
    if (null === wx) wx = images.read("./hk.png");
    return wx;

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
    sleep(1000);
    scrollDown();
    scrollDown();
    scrollDown();
    toastLog("拔萝卜活动签到……", "forcible");
    var button = className("android.widget.Button").text("去看看").findOne(1666);
    if (button) {
        button.click();
        sleep(1000);
        back();
    } else {
        toastLog("未找到'去看看'按钮！( ๑ŏ ﹏ ŏ๑ )", "forcible");
    }
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

//成长值
function level() {
    button = className("android.widget.TextView").text("社区成长等级").findOne(1500);
    if (button) {
        button.click();
        sleep(500)
        var a = readfile("./tmp/level.txt");
        var num = className("android.widget.TextView").textContains("成长值").indexInParent(1).findOne(3000)
        if (num) {
            var num1 = num.text().split(" ")[1].split("/")[0];
            var numValue = parseInt(num1);
            var b = numValue - a;
            log("今日获得成长值：" + b);
            toastLog("当前成长值：" + numValue, "forcible");
            files.append("./tmp/level.txt", "\n" + date + "：+" + b + "     签到+1的概率：" + percentage + "\n" + numValue);
            sleep(500);
        } else {
            log("未找到成长值");
        }
    } else {
        log("未找到'社区成长等级'按钮");
    }
}

//小程序版成长值
function level2() {
    log("★★★★★★今日明细★★★★★★");
    toastLog("开始记录成长值……", "forcible");
    //let me = className("android.widget.TextView").text("我的");
    // 发现在子页面
    if (wait(() => packageName(wchatpn).exists(), 10, 500) &&
        !text("我的").exists()) back();

    let result;
    var a = readfile("./tmp/level.txt"); //记录中的昨日成长值
    var num = className("android.widget.TextView").text("成长值").findOne(2000);
    if (num) {
        var num1 = num.nextSibling().child(0).text();
        var num2 = num.nextSibling().child(1).text();
        //当前成长值
        var numValue = parseInt(String(num1).replace("/", ""));
        //升级成长值
        var num2Value = parseInt(String(num2).replace("/", ""));
        // 今日获得成长值
        //log(num)
        num.click()
        //log(clickCenter(num));

        className("android.widget.TextView").text("成长值明细").waitFor();
        sleep(1000);
        var newdate = date.replace(/-/g, "/").substr(0, 10);
        let jilu = className("android.widget.TextView").text(newdate).find();
        // 成长值获得错误
        //if (jilu.length === 0 || jilu > 10) return level2();
        // 今日成长值

        let todayVal = 0;
        for (i = 0; i < jilu.length; i++) {
            let demo = jilu.get(i).parent().nextSibling();
            let num = 0;
            if (demo) num = parseInt(demo.text().replace("+", ""));
            todayVal = todayVal + num;

        }
        // 成长值获得错误
        // if(todayVal>200) return level2();
        // 用记录中的对比
        var b = numValue - a;
        if (todayVal < b || todayVal > 100) todayVal = b;

        result = ('当前成长值：' + numValue + '  (' + level段(numValue) + ')' + '       升级目标：' + num2Value +
            '\n今日获得：' + todayVal + '                 距离升级还需：' + (num2Value - numValue) + '');

        let parts = result.split("\n");
        log(parts[0]);
        log(parts[1]);
        //toastLog("当前成长值：" + numValue, "forcible");
        files.append("./tmp/level.txt", "\n" + date + "：+" + b + "     签到+1的概率：" + percentage + "\n" + numValue);
        back();
        sleep(500);
    } else {
        log("未找到成长值！(ㄒoㄒ) ");
    }

    //关闭小程序
    // className("android.widget.ImageButton").desc("关闭").findOne().click();

    return result;
}

//成长值文件
function readfile(filePath) {
    if (!files.exists(filePath)) {
        files.createWithDirs(filePath); // 如果文件不存在则创建 
        return 0;
    }
    var fileContent = files.read(filePath);
    if (!fileContent) return 0; // 如果文件无数据则返回0 
    var lines = fileContent.split("\n");
    var lastLine = lines[lines.length - 1];
    return parseInt(lastLine);
}

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
    let cj = className("android.widget.Button").text("去参加").findOne(1500);
    if (cj) {
        cj.click()
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
        解锁();
        back()
    } else {
        toastLog("未找到活动入口！", "forcible")
    }
}

//感恩季活动
function ganenji() {
    let qucanyu = className("android.widget.Button").text("去参与").findOne(1500).click();
    if (qucanyu) {
        sleep(500)
        解锁()
        sleep(500)
        back()
        sleep(500)
    } else {
        toastLog("未找到活动入口", "forcible")
    }

}

function 解锁() {
    let jpso = className('android.widget.TextView').text('可解锁').find();
    let qts = className("android.widget.Button").text("去提升").findOne(1500);
    let count = qts.sibling(1).text();
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

            //开始
            var control = jpso.get(i).parent();
            //clickCenter(control);
            control.click();
            log("尝试第" + (i + 1) + "次解锁！(/≧▽≦)/~┴┴ ");
            //sleep(300);
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
            //sleep(500);
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

    let xxcx = className("android.widget.ImageButton").desc("更多").packageName(wchatpn);
    //小米社区5.3以上版本进入小程序
    let v53 = className("android.widget.Button").text("去微信").findOne(1500);
    if (v53) {
        v53.click();
        waitForPackage(wchatpn, 1000);
        //sleep(1000);
        let m = 0;
        while (!xxcx.exists()) {
            // 存在微信分身，选择第1个
            let fenshen = className("android.widget.TextView").textContains("选择")
            if (fenshen.exists()) {
                sleep(666);
                let one = className("android.widget.ImageView").desc("微信").findOne()
                clickCenter(one);
                waitForPackage("com.tencent.mm", 1000);
                //sleep(1000)
            }

            // 已打开微信，但未打开小程序。
            if (className("android.widget.TextView").text("通讯录").findOne(2666)) {
                toastLog("已打开微信，但未打开小程序！", "forcible");
                toastLog("开始尝试从微信进入小程序……", "long", "forcible");

                // 微信下滑
                //let n = 0;
                //while (!xxcx.exists()) {
                swipe(dwidth * 1 / 2, dheight * 1 / 5, dwidth * 1 / 2, dheight * 4 / 5, 500);
                let xlxcx = descStartsWith('小米社区');
                // 去“更多”里寻找
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
                clickCenter(xlxcx.findOne(2666));
                //n++;
                //log("第" + n + "尝次试！");
                sleep(600);
                //if (xlxcx.exists() || n > 5) break;

                //}
            }
            m++;
            sleep(500);

            if (xxcx.exists() || m > 10) break;

        }

    } else {
        home();
        sleep(300);
        home();
        toastLog("不支持应用内跳转小程序，", "forcible")
        sleep(600);
        toastLog("现在开始尝试从桌面寻找小程序……", "forcible")
        //for (i = 0; i < 3 && !xxcx.exists(); i++) {
        if (config.坐标点击) {
            log("用户配置→{坐标点击:1}")
            toastLog("开始从第3屏用户提供的坐标寻找……", "forcible")
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
            toastLog("桌面所有屏，全力搜索小程序图标启动！", "forcible")

            let xcx = desc("小米社区").clickable().find();
            if (xcx.length > 0) {
                log("已找到[小米社区]名称的图标！");
                if (xcx.length > 1) {
                    log("符合条件的图标，有[" + xcx.length + "]个！！！！！");
                    log("其中可能包含 社区APP！")
                    log("→ --——————");
                    for (i = 0; i < xcx.length; i++) {
                        xcx.get(i).click();
                        log("正在尝试打开→第[" + (i + 1) + "]个！");
                        sleep(1000);
                        if (packageName(xmPckageName).findOne(666) ||
                            !packageName(wchatpn).findOne(666)) {
                            toastLog("这个不对，尝试下一个！");
                            home();
                            sleep(1000);

                        }
                        if (packageName(wchatpn).findOne(666)) break;

                    }
                    log("———————-- ←");
                } else {
                    xcx.click();
                }
            } else {
                toastLog("也许你对我的爱藏的太深，让我无法发现……", "forcible")
                toastLog("也许你根本就是在骗我……（▼へ▼メ）", "forcible")
                log("请把小程序图标放在桌面上，无论放第几屏都好。")
                log("但不要藏在文件夹里，那样真找不到。")
                notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("我在桌面上找不到小程序图标，\n麻烦把它放在好找的地方（˃̣̣̥᷄⌓˂̣̣̥᷅）！"));

            }
        }
        //sleep(300);
        //}

        waitForPackage(wchatpn, 10, 500);
    }

    sleep(500);
    if (!wait(() => xxcx.exists(), 10, 500)) {
        toastLog("进不了微信小程序，我尽力了！(ó﹏ò｡) ", "long", "forcible");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("进不了微信小程序，我尽力了！"));
        exit();
    }

    toastLog("成功打开小程序，继续签到流程→→→", "forcible")

    let me = className("android.widget.TextView").text("我的");
    // 发现在子页面
    if (wait(() => packageName(wchatpn).exists(), 10, 500) &&
        !me.findOne(1666)) back();

    clickCenter(me.findOne());
    toastLog("正在进入[我的]页面……", "forcible")
    let edit = text('编辑资料');
    let cont = 0
    //页面卡了
    while (!edit.findOne(2000)) {
        log("点击[我的]页面……")
        //先点一下论坛
        click("论坛");
        //clickCenter(me.parent().previousSibling());
        sleep(500);
        //再点“我的”
        clickCenter(me.findOne());
        // click(dwidth*3/4,dheight*0.96)
        sleep(500);
        cont++
        if (cont > 5) {
            toastLog("进不了[我的]页面！)", "forcible");
            return;
        }
    }
    className("android.widget.TextView").text("每日签到").waitFor();
    let qd = className("android.widget.TextView").text("去签到");
    if (qd.exists()) {
        clickCenter(qd.findOne());
        sleep(1500);
    }
    //sleep(300);

    toastLog("小程序已签到！✧٩(ˊωˋ*)و✧", "forcible")
}

//跳过广告
function skipAd() {
    let adCloseBtn = className("android.widget.ImageView").desc("关闭").findOne(588);
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
    var done = text("已签到").findOne(1666);
    try {
        if (!done) findCenter();
    } catch (e) {
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("社区APP签到失败了！其它流程依旧继续进行……\n若反复该提示,可能账号出错了,快打开小米社区看看吧1"));
        /* 打印简单的错误消息. */
        /* 通常只有 1 行消息. */
        console.error(e.message);
        // exit(e);
        return;
    }

    toastLog("今日已签到！", "forcible");
}

// 权限验证
function permissionv() {
    log("★★★★★★验证权限★★★★★★");
    // 无障碍权限
    auto.waitFor();

    // 请求截图权限
    //if (!requestScreenCapture()) {
    //console.log("已获取截图权限");
    //var pictures2 = images.clip(captureScreen(), 0, 0, dwidth, dheight);
    //pictures2.recycle();

    // 立即释放截图权限
    // releaseScreenCapture();
    //sleep(2000)
    //} 
    //else {
    //   console.error("未能获取截图权限");
    //  exit();
    //}

    importClass(android.app.NotificationManager);
    importClass(android.content.Context);
    // 获取通知管理器实例
    var notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE);
    // 判断通知是否被启用
    var isNotificationEnabled = notificationManager.areNotificationsEnabled();
    if (isNotificationEnabled) {
        log("发送通知权限，[已启用]");
    } else {
        console.error("发送通知权限，未启用!");
        toastLog("发送通知权限，未启用!");

        // 这里可以添加引导用户去开启权限的代码，不同系统开启通知权限的方式不同
        exit();
    }

    // 小米手机，后台弹出界面权限
    // 获取设备品牌
    var brand = android.os.Build.BRAND;
    // 获取设备制造商
    var manufacturer = android.os.Build.MANUFACTURER;
    if ("Xiaomi".equals(brand) || "Xiaomi".equals(manufacturer)) {
        var appOps = context.getSystemService(context.APP_OPS_SERVICE);
        try {
            // 对于小米手机，"允许后台弹出界面" 权限对应的操作码
            var op = 10021;
            var method = appOps.getClass().getMethod("checkOpNoThrow", java.lang.Integer.TYPE, java.lang.Integer.TYPE, java.lang.String);
            // 显式转换为 java.lang.Integer 类型
            var intOp = new java.lang.Integer(op);
            var uid = new java.lang.Integer(android.os.Process.myUid());
            var result = method.invoke(appOps, intOp, uid, context.getPackageName());
            if (result == android.app.AppOpsManager.MODE_ALLOWED) {
                console.log("后台弹出界面权限，[已启用]");
            } else {
                console.error("后台弹出界面权限，未启用!");
                console.error("功能受限，可能无法顺利完成全部流程！");
                console.error("应用详情→权限管理→其它权限→后台弹出界面");
                var intent = new android.content.Intent("miui.intent.action.APP_PERM_EDITOR");
                intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity");
                intent.putExtra("extra_pkgname", context.getPackageName());
                app.startActivity(intent);
                notice(String("功能受限！(" + nowDate().substr(5, 14) + ")"),
                    String("缺少'后台弹出界面'权限，\n权限管理→其它权限→后台弹出界面"));
                sleep(3000);
            }
        } catch (e) {
            console.error("权限检查出错: " + e);
            exit();
        }
    } else {
        log("当前设备不是小米设备，不执行小米手机的权限检查逻辑。");
    }

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
    //let xyyx = className("android.widget.Button").text("炫耀一下").findOne(2888);
    //if (xyyx) {
    //    clickCenter(xyyx.nextSibling());
    //}
    //let gz = desc("第1屏")
    //let gz = contentMatch(/机型确认/);

    //let gz = className("android.widget.TextView").text("等待解锁").exists()

    //let gz = desc("小米社区").untilFind();

    // let gz = className("android.widget.ImageView").desc("第3屏")
    //寻找第3屏
    // if (!wait(() => tr.exists(), 5, 1000)) {
    //     notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("我找不到第3屏（˃̣̣̥᷄⌓˂̣̣̥᷅）！"));
    //     exit();

    // }

    let gz = wait(() => packageName("com.tencent.mm").exists(), 500);

    if (gz) {
        toastLog(true);
        log(gz.length)
        // log(gz)
        //log(gz.get(0).desc())
        //gz.click();

    } else toastLog(false);

    // toastLog(jilu.length, "forcible");
    // 用记录中的对比
    // var b = numValue - a;
    //if (todayVal < b) todayVal = b;

    var time = (new Date().getTime() - start);

    toastLog(time, "forcible");
    notice(String(date), String(time))
    exit();
}

//主程序
function main() {

    //sleep(1234)
    //test();
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
    device.keepScreenOn(3600 * 1000);

    //let musicVolume = device.getMusicVolume();
    //关掉声音
    //device.setMusicVolume(0);
    //权限验证
    permissionv();

    killAPP(xmPckageName);
    if (launchAPP(xmPckageName)) {
        skipAd();
        if (config.浏览帖子) posts(1);
        let sign = className("android.widget.ImageView").desc("签到").findOne(3000).click();
        if (sign) {
            toastLog("打开[签到]页面……", "forcible");
            sleep(500);
            percentage = logpercentage();
            // 签到
            start();
            // 按配置启用功能
            if (config.双旗舰) 活动1();
            if (config.加入圈子) join();
            //       if (config.感恩季) ganenji();
            if (config.拔萝卜) see();

            //        if (config.米粉节) fans();
            //        if (config.观看视频) watchVideo();
        }

    } else {
        sleep(500);
        toastLog("(*꒦ິ⌓꒦ີ) 为什么我打不开小米社区APP？", "forcible");
        toastLog("哪里出错了？", "forcible");
        notice(String('出错了！(' + nowDate().substr(5, 14) + ')'), String("芭比Q了，小米社区里的操作都没完成。"));
    }
    let text;

    if (config.小程序签到) 小程序签到();
    if (config.成长值记录) text = level2();
    if (typeof text === "undefined") text = "未获取到成长值数据！\n再给我一次机会，下次一定……";
    killAPP(xmPckageName);
    home();
    sleep(300);
    home();
    notice(String('全部操作已完成(' + nowDate().substr(5, 14) + ')[' + getDurTime(date) + ']'), String(text));
    toastLog("全部操作已完成！！！(๑•॒̀ ູ॒•́๑)啦啦啦", "forcible");

    //device.setMusicVolume(musicVolume);
    device.cancelKeepingAwake();
    log("          ———— 耗时[ " + getDurTime(date) + " ] ————");
    log("————————  end  ————————");

    try {
        exit();
    } catch (e) {
        // Ignored.
    }
    return;


}