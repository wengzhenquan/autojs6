//程序运行文件标志
const locked = "./tmp/update_locked";
files.ensureDir(locked)
if (!files.exists(locked)) {
    events.on("exit", () => files.remove(locked));
    files.create(locked);
} else {
    if (engines.all().length < 2) {
        // 防止锁残留
        events.on("exit", () => files.remove(locked));
    } else {
        console.info('若无法启动，可删除tmp目录下的下面文件')
        console.error('update_locked')
        //确保只运行一个程序
        exit();
    }
}
runtime.gc;
java.lang.System.gc();
//10分钟亮屏
device.keepScreenDim(10 * 60 * 1000);
events.on("exit", () => {
    device.cancelKeepingAwake();
});
// 打开日志页面
console.launch();

// 下载大文件超时，单位：秒。 
// 网速快，可以改成10~20，网速慢改成30~60
// 参考：50~100Mbps宽带30s，100~300Mbps宽带15s，
//      300~500Mbps宽带10s，千兆5s，
//      不建议改成小于5
var download_timeout = 30;

// 最小文件大小(B)，小于这个值都认为错误，将重试
var filemin = 500;

// 忽略的更新列表
var ignoreList = [
    "说明/", // 一整个文件夹
    "LICENSE", // 单个文件，只需要文件名
    //"tmp/",
    //"yolov11/",   // yolov11 本地签到模块
]
const g1 = Math.pow(1024, 3); //1G
var aMem = device.getAvailMem(); //空闲物理内存


// 版本信息
var localVersion = null;
var serverVersion = null;
var hasNewVersion = false; // 有新版本
var updateAll = false; // 全量更新

var updateList = []; // 待更新列表
var deleteList = []; // 待删除列表

var successList = []; // 更新成功列表
var errorList = []; // 更新失败列表

// 文本格式
var textArry = ["", "md", "css", "js", "txt", "json", "html"];

var github = "https://github.com/wengzhenquan/autojs6";
var github_download_url = "https://raw.githubusercontent.com/wengzhenquan/autojs6/refs/heads/main/"

//加速代理
var proxys = [

    "https://gh.halonice.com/", // 请求时间：0.33s
    "https://github.xxlab.tech/", // 请求时间：0.34s
    "https://ghproxy.sakuramoe.dev/", // 请求时间：0.52s
    "http://gh.927223.xyz/", // 请求时间：0.54s
    "https://github.chenc.dev/", // 请求时间：0.56s
    "https://github.cnxiaobai.com/", // 请求时间：0.60s
    "https://www.5555.cab/", // 请求时间：0.61s
    "https://ghfile.geekertao.top/", // 请求时间：0.76s
    "https://github.dpik.top/", // 请求时间：0.77s
    "https://gh.bugdey.us.kg/", // 请求时间：0.77s
    "https://gitproxy.click/", // 请求时间：0.80s
    "https://gh.padao.fun/", // 请求时间：0.80s
    "https://gh.catmak.name/", // 请求时间：0.82s
    "https://github.cn86.dev/", // 请求时间：0.83s
    "https://gh.llkk.cc/", // 请求时间：0.84s
    "https://30006000.xyz/", // 请求时间：0.87s
    "https://git.zeas.cc/", // 请求时间：0.91s
    "https://gh.39.al/", // 请求时间：1.10s
    "https://ghproxy.net/", // 请求时间：1.11s
    "https://gh-proxy.com/", // 请求时间：0.97s
    "https://gh.monlor.com/", // 请求时间：0.99s
    "https://gh.xxooo.cf/", // 请求时间：1.07s
    "http://github-proxy.teach-english.tech/", // 请求时间：1.30s

]

// 备用代理
var proxys2 = [
    "https://git.yylx.win/", // 请求时间：1.23s
    "https://github-proxy.lixxing.top/", // 请求时间：1.24s
    "https://ghproxy.mirror.skybyte.me/", // 请求时间：1.24s
    "https://ghproxy.monkeyray.net/", // 请求时间：1.24s
    "https://hub.gitmirror.com/", // 请求时间：1.29s
    "https://gh.b52m.cn/", // 请求时间：1.30s
    "https://code-hub-hk.freexy.top/", // 请求时间：1.30s
    "https://gh-proxy.net/", // 请求时间：1.35s
    "https://gh.noki.icu/", // 请求时间：1.64s
    "https://proxy.atoposs.com/", // 请求时间：1.64s
    "https://g.blfrp.cn/", // 请求时间：1.71s
    "https://ghproxy.053000.xyz/", // 请求时间：1.71s
    "https://gh.aaa.team/", // 请求时间：1.78s
    "https://git.669966.xyz/", // 请求时间：1.96s
    "https://git.951959483.xyz/", // 请求时间：2.34s
    "https://ghfast.top/", // 请求时间：2.44s
    "https://gitproxy.127731.xyz/", // 请求时间：2.52s
    "https://ggg.clwap.dpdns.org/", // 请求时间：3.40s
    "https://github.ihnic.com/", // 请求时间：3.42s
    "https://gitproxy1.127731.xyz/", // 请求时间：3.85s
    "https://github.boringhex.top/", // 请求时间：4.27s
    "https://ghproxy.mf-dust.dpdns.org/", // 请求时间：4.66s
    "https://ghproxy.cfd/", // 请求时间：7.04s



]



// 打乱并整合两个数组
processArrays(proxys, proxys2);
//timesShuffleArray(proxys);

var api_github = "https://api.github.com/repos/wengzhenquan/autojs6/contents/";
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
    "https://gh.noki.icu/",
    "https://gh.qninq.cn/",
    "https://gh.llkk.cc/",
    "https://gh-proxy.com/",
    "https://xiazai.de/",
    "https://99z.top/",
    "https://ghproxy.vansour.top/",
    "https://ghpxy.hwinzniej.top/",
    "https://github.cn86.dev/",


    "https://j.1win.ggff.net/",
    "https://j.n1win.dpdns.org/",
    "https://j.1lin.dpdns.org/",
    "https://jiashu.1win.eu.org/",
    "https://j.1win.ip-ddns.com/",
    "https://j.1win.ddns-ip.net/",

]



// 打乱数组
shuffleArray(api_proxys);

// 全局乱序代理
//var proxy_arr = getRandomNumbers(proxys.length - 1);
var proxy_index = 0;
//var api_proxy_arr = getRandomNumbers(api_proxys.length - 1);
var api_proxy_index = 0;


// 数组去重
function deduplicateInPlace(arr) {
    const set = new Set(arr);
    arr.length = 0; // 清空原数组
    // 方法1: 使用 Array.from 填充
    //Array.from(set).forEach(item => arr.push(item));
    // 方法2: 直接循环 Set（兼容性更好）
    set.forEach(item => arr.push(item));
}



// 非高峰期乱序
function timesShuffleArray(array) {
    let hours = new Date().getHours();
    if (hours >= 2 && hours < 19) {
        shuffleArray(array);
    }
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
        const seconds = (milliseconds / 1000).toFixed(2);
        return `${seconds} s`;
    }
    // 直接返回毫秒
    return `${milliseconds} ms`;

}

// ----------- 脚本更新 ---------------------//

// -----------程序完整性检查---------------------//
function integrityCheck() {
    log(">>>>→程序完整性校验←<<<<")

    let fileList = localVersion.updateFile;

    if (!fileList || fileList.length < 1) {
        console.error("version文件里没有文件清单");
        console.error("无需校验");
    }
    //待更新文件列表
    for (var key in fileList) {
        if (!files.exists('./' + key)) {
            updateList.push(key);
        }
    }
    let missing = false;
    if (updateList.length > 0) {
        missing = true;
        log("----------------------------");
        log("文件缺失列表：")
        updateList.forEach((file) => console.error(file));
        log("----------------------------");
    }
    log("文件检查结束");
    if (!missing) {
        console.info("没有缺失的文件");
        console.error("如果有问题，可按照下面步骤操作：");
        console.error("  1、将version文件删除");
        console.error("  2、重新执行更新程序");
    }
}



// 检查脚本更新。
function checkVersion() {
    console.info("---→>★脚本检查更新★<←---")
    log("可用运存：" + formatFileSize(aMem));


    for (proxy_index; proxy_index < proxys.length; proxy_index++) {
        let startTime = new Date().getTime();
        let proxy = proxys[proxy_index];
        log('使用加速器：' + proxy);
        let url = proxy +
            github_download_url +
            "version" +
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
                    result = res.body.json();
                }
            } catch (e) {}
        });
        thread.join(5 * 1000);
        thread.interrupt();

        let time = (new Date().getTime() - startTime);
        log("请求时间：" + toSeconds(time));

        if (result) {
            serverVersion = result;
            //log(serverVersion.version)
            break;
        }
    }
    if (!serverVersion) {
        console.error("更新服务器连接失败")
        return;
    }
    log("最新版本：" + serverVersion.version)

    //本地version文件，不检查更新
    if (files.exists("./version")) {
        //本地版本信息
        localVersion = JSON.parse(files.read("./version"));
        log("本地版本：" + localVersion.version)

        hasNewVersion = compareVersions(serverVersion.version, localVersion.version) > 0;

        if (!hasNewVersion) {
            console.info("已经是最新版");
            log("开始文件完整性检查……");
            integrityCheck();

            return;
        }

    } else {
        console.error("缺失version文件，无法增量更新")
        console.error("只能全量更新")
        updateAll = true;
    }

    // 待更新文件清单
    for (var key in serverVersion.updateFile) {
        if (localVersion && localVersion.updateFile &&
            files.exists('./' + key) && localVersion.updateFile[key]) {
            if (serverVersion.updateFile[key] > localVersion.updateFile[key] ||
                !files.exists('./' + key)) {
                updateList.push(key);
            }
        } else {
            updateList.push(key);
        }
    }

    //待删除的文件
    if (localVersion && localVersion.updateFile) {
        for (var key in localVersion.updateFile) {
            if (!serverVersion.updateFile[key]) {
                deleteList.push(key);
            }
        }
    }

    if (hasNewVersion || updateAll) {
        console.warn("发现新的版本！！！")

        console.error("增量更新列表：")
        if (updateList.length > 0) {
            log("----------------------------");
            console.log("需要更新的文件清单:");
            updateList.forEach((file) => {
                let name = !file.includes('【') ? ''.padStart(1) + file : file;
                console.error(name);
                if (file.includes('config') && files.exists('./' + file)) {
                    log('(更新前，建议重命名config.js，')
                    log('              备份解锁坐标)')
                }
            });
            log("----------------------------");
        }
        if (deleteList.length > 0) {
            console.log("需要删除的文件清单:");
            deleteList.forEach((file) => {
                let name = !file.includes('【') ? ''.padStart(1) + file : file;
                console.error(name);
            });
            log("----------------------------");
        }
        // ---------额外附加操作---------//

        // 一些文件不能忽略
        let elementsToRemove = ["version"]
        ignoreList = ignoreList.filter(element => !elementsToRemove.includes(element));
        // 额外附加更新文件
        updateList.push("README.md")

        // 将version文件排列到更新队列末端，version文件最后更新
        let index = updateList.indexOf('version');
        if (index !== -1) {
            // 从原数组中删除目标字符串
            updateList.splice(index, 1);
        }
        updateList.push('version');

    }
}



//开始更新
function startUpdate() {
    if (!hasNewVersion && !updateAll && updateList < 1)
        return;

    log(">>>>>★开始更新★<<<<<")
    log("开始下载文件……")
    log("请不要终止脚本")

    for (let j = 0; j < updateList.length; j++) {
        let fileName = updateList[j];
        //忽略更新
        if (ignoreList.some(element => fileName.startsWith(element))) {
            console.warn('忽略列表：' + fileName);
            continue;
        }

        log("---------------------------→");
        console.info("开始下载文件：" + fileName)
        //无后缀文件名
        let name = files.getNameWithoutExtension(fileName);
        //后缀
        let ext = files.getExtension(fileName);
        //文本类型
        let isText = textArry.includes(ext);
        var fileInfo = null;
        if (!isText) {
            console.warn('该文件需要文件校验！')
            fileInfo = getGitHubFileInfo(fileName, 'main');
        }
        //超时，文本文件5秒，非文本文件使用配置
        let timeoutTimes = isText ? 5 : download_timeout;

        var filebytes = null;
        let n = 0; //次数
        while (n < proxys.length) {
            runtime.gc;
            java.lang.System.gc();
            sleep(500);
            aMem = device.getAvailMem();
            if (aMem < g1) {
                console.error("可用运存：" + formatFileSize(aMem));
                console.error("运存过低，下载有失败风险！")
                console.error("如果报OOM错误，需重启AutoJS6后重新下载")
            }
            let startTime = new Date().getTime();
            let proxy = proxys[proxy_index];
            log('下载加速器：' + proxy);
            let url = proxy +
                github_download_url +
                fileName +
                '?t=' + startTime;

            // github + "/blob/main/" + fileName;
            // log(url);

            let thread = threads.start(() => {
                try {
                    let res = http.get(url, {
                        timeout: timeoutTimes * 1000,
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                            'Connection': 'Keep-Alive'
                        }
                    });
                    if (res && res.statusCode === 200) {
                        filebytes = res.body.bytes();
                    }
                    if (res && res.statusCode === 404 &&
                        n > 3) {
                        console.error('文件不存在，可能作者正在维护')
                        console.error('请过5分钟以后再试！')
                        exit();
                    }
                } catch (e) {}
            });
            thread.join(timeoutTimes * 1000);
            thread.interrupt();

            let time = (new Date().getTime() - startTime);
            log("请求时间：" + toSeconds(time));

            //成功，跳出
            if (filebytes && filebytes.length > filemin) {
                if (!isText && fileInfo &&
                    !fileVerify(fileInfo, filebytes)) {
                    console.error('校验失败，重新下载')
                    proxy_index++;
                    //重置
                    if (proxy_index > proxys.length - 1) proxy_index = 0;
                    n++;
                    continue;
                }
                break;
            }

            console.error('下载失败，更换加速器重试');
            proxy_index++;
            //重置
            if (proxy_index > proxys.length - 1) proxy_index = 0;
            n++;
        }

        if (!filebytes || filebytes.length < filemin) {
            console.error("下载失败");
            errorList.push(fileName);
            //continue;
        } else {

            if (fileName.includes('config') && files.exists('./' + fileName)) {
                log("需更新配置文件");

                // 备份旧文件
                let oldName = name + ".old." + ext;
                fixConfigFile('./' + fileName, './' + oldName)
                wait(() => false, 500);
                console.error("旧" + fileName + " 已重命名为 " + oldName);
                files.remove('./' + fileName)
                wait(() => false, 300);

                // 下载的新文件
                files.write('./' + fileName, new java.lang.String(filebytes, "utf-8"), "utf-8");
                wait(() => false, 500);
                console.info("下载成功")

                //备份一份新文件
                let newName = "tmp/" + name + ".new." + ext;
                fixConfigFile('./' + fileName, './' + newName)
                wait(() => false, 500);
                files.remove('./' + fileName)
                wait(() => false, 300);

                console.info("开始尝试自动搬运配置");
                console.info(oldName + "→" + fileName);

                let merge = false;
                try {
                    // 将旧配置里的值，同步到新配置
                    // 以新配置作为模板，按照新配置文件的排版
                    // 两个文件合并生成新文件
                    merge = mergeConfigs('./' + oldName,
                        './' + newName, './' + fileName);
                } catch (e) {
                    console.error("自动搬运旧配置失败！");
                    console.error("请自行搬运 锁屏密码 等配置");
                }
                if (merge) {
                    console.error("配置已自动更新成最新版！");
                    console.error("锁屏密码等配置已自动更新");
                }

            } else {
                files.ensureDir('./' + fileName);
                // 先删除
                files.remove('./' + fileName);
                wait(() => false, 300);

                if (isText) {
                    try {
                        files.write('./' + fileName, new java.lang.String(filebytes, "utf-8"), "utf-8");
                    } catch (e) {
                        files.writeBytes('./' + fileName, filebytes); // 回退到二进制
                    }
                } else {
                    files.writeBytes('./' + fileName, filebytes);
                }
                //files.writeBytes(files.cwd()+'/' + fileName, filebytes);
                successList.push(fileName);
                console.info("下载成功")
                console.info('文件大小：' + formatFileSize(filebytes.length))
            }

        }
        // log("←----------------------------");
    }
    log("----------------------------");
    if (successList.length > 0) {
        console.log("更新成功清单:");
        successList.forEach((file) => {
            let name = !file.includes('【') ? ''.padStart(1) + file : file;
            console.info(name);
        });
        log("----------------------------");
    }

    if (errorList.length > 0) {
        console.log("更新失败清单:");
        errorList.forEach((file) => {
            let name = !file.includes('【') ? ''.padStart(1) + file : file;
            console.error(name);
        });
        log("----------------------------");
    }

    if (deleteList.length > 0) {
        console.log("删除文件清单:");
        deleteList.forEach((file) => {
            let name = !file.includes('【') ? ''.padStart(1) + file : file;
            console.error(name);
            files.remove('./' + file)
        });
        log("----------------------------");
    }

    console.error("在文件列表下滑刷新，可查看更新结果！");
    wait(() => false, 1000);
    console.error("在文件列表下滑刷新，可查看更新结果！");
    wait(() => false, 1000);
    console.error("在文件列表下滑刷新，可查看更新结果！");
    wait(() => false, 1000);

    let l = 3;
    do {
        try {
            back();
            //sleep(3000)
            if (packageName('org.autojs.autojs6').exists()) {
                //  ---------------- 下面是刷新列表 --------//
                // 设备信息
                var dwidth = device.width;
                var dheight = device.height;
                let a6 = className("android.widget.TextView")
                    .packageName('org.autojs.autojs6')
                    .text("AutoJs6");
                click(text('文件'));
                if (a6.exists() && textContains('小社脚本').exists()) {
                    wait(() => false, 1000);
                    let n = 3;
                    while (n--) {
                        swipe(dwidth * 0.4, dheight * 0.4, dwidth * 0.6, dheight * 0.8, 100);
                        sleep(500);
                    }
                }
            }
            break;
        } catch (e) {
            auto(true);
        }
    } while (l--);

}


// ==================== 文件校验系列 ====================

// 校验文件
function fileVerify(fileInfo, fileBytes) {
    console.info('已下载文件大小：' + fileBytes.length);
    console.info('已下载文件SHA-1：');
    let sha1 = getGitFileSha(fileBytes);
    console.error(sha1);

    return fileInfo.size === fileBytes.length &&
        sha1 === fileInfo.sha
}

// 获取GitHub文件信息
function getGitHubFileInfo(filePath, branch) {
    console.info('正在获取Github API版本信息')
    let result = null;
    for (api_proxy_index; api_proxy_index < api_proxys.length; api_proxy_index++) {
        //let startTime = new Date().getTime();
        let proxy = api_proxys[api_proxy_index];
        console.warn('api加速器：' + proxy)
        let url = proxy +
            api_github +
            filePath +
            "?ref=" +
            branch +
            '&t=' +
            new Date().getTime();
        //  log(url)

        let res = null;
        let thread = threads.start(() => {
            try {
                res = http.get(url, {
                    timeout: 10 * 1000,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Connection': 'Keep-Alive'
                    }
                });
                if (res.statusCode === 200) {
                    result = res.body.json();
                }
            } catch (e) {}
        });
        thread.join(10 * 1000);
        thread.interrupt();
        //  let time = (new Date().getTime() - startTime);
        // log("请求时间：" + toSeconds(time));
        if (result) break;
    }
    if (result) {
        log('期望文件大小：' + result.size)
        log('期望SHA-1：')
        console.warn(result.sha)
    } else {
        console.error('获取版本信息失败')
    }
    console.info('----------------')

    return result;
}


// 获取sha
function getGitFileSha(fileBytes) {
    // 构造 Blob 头部
    var headerStr = "blob " + fileBytes.length + "\u0000"; // 注意 Unicode 空字符
    var headerBytes = new java.lang.String(headerStr).getBytes("UTF-8"); // 转换为 UTF-8 字节

    // 合并头部和内容
    var blobBytes = util.java.array('byte', headerBytes.length + fileBytes.length);
    java.lang.System.arraycopy(headerBytes, 0, blobBytes, 0, headerBytes.length);
    java.lang.System.arraycopy(fileBytes, 0, blobBytes, headerBytes.length, fileBytes.length);

    // 计算 SHA-1
    var md = java.security.MessageDigest.getInstance("SHA-1");
    var digestBytes = md.digest(blobBytes);
    // const digestBytes= crypto.digest(blobBytes, 'SHA-1' ,{ input: 'file' }); 
    //  return digestBytes;

    // 转换为十六进制字符串
    var hexChars = [];
    for (let b of digestBytes) {
        hexChars.push(((b & 0xFF) < 0x10 ? '0' : '') + (b & 0xFF).toString(16));
    }
    return hexChars.join('');
}

// ==================== 同步和备份配置文件系列 ====================

/**
 * 合并配置文件，保留格式、注释和结构
 * @param {string} oldConfigPath - 旧配置文件路径
 * @param {string} newConfigPath - 新配置文件路径
 * @param {string} outputPath - 输出文件路径
 */
function mergeConfigs(oldConfigPath, newConfigPath, outputPath) {
    log("旧文件：" + oldConfigPath)
    log("新文件：" + newConfigPath)
    log("合并文件：" + outputPath)
    // ==================== 工具函数 ====================
    /**
     * 检查是否为纯对象（非数组）
     */
    function isPlainObject(v) {
        return v && typeof v === 'object' && !Array.isArray(v);
    }

    /**
     * 将值转换为字符串表示（保持JSON格式）
     */
    function stringifyValue(v) {
        if (isPlainObject(v) || Array.isArray(v)) {
            return JSON.stringify(v).replace(/"([^"]+)":/g, '$1:');
        }
        return typeof v === 'string' ? '"' + v + '"' : String(v);
    }

    /**
     * 根据newConfig的类型强制转换oldConfig的值
     */
    function convertValueType(oldValue, newValue) {
        // 数字类型纠正：数字字符串→数字
        if (typeof oldValue === 'string' &&
            oldValue.length < 4 && !isNaN(oldValue)) {
            let oldp = parseFloat(oldValue);
            // 小于1000(排除屏幕解锁数字密码，安卓最少4位数)，
            // 且转换前后长度一样(排除0开头的字符串)
            if (oldp < 1000 && String(oldp).length === oldValue.length)
                oldValue = oldp;
        }

        // 类型相同，使用旧值
        if (typeof oldValue === typeof newValue)
            return oldValue;

        // 布尔值转换
        if (typeof newValue === 'boolean') {
            return Boolean(oldValue);
        }

        // 数字字符串→数字
        if (typeof newValue === 'number' &&
            !isNaN(oldValue)) {
            return parseFloat(oldValue);
        }

        // 数字字符串→数字
        if (typeof oldValue === 'number') {
            // 1时允许使用中文字符串
            // if (oldValue === 1 && isNaN(newValue)) {
            //     return newValue;
            // }
            return oldValue;
        }


        // 其它类型使用newValue的值，确保不出错
        return newValue;

        // 其他类型转换
        // switch (typeof newValue) {
        //     case 'string':
        //         return String(oldValue);
        //     case 'number':
        //         return Number(oldValue);
        //     case 'boolean':
        //         return Boolean(oldValue);
        //     default:
        //         return oldValue;
        // }
    }

    // ==================== 核心处理函数 ====================
    /**
     * 处理单行字段的替换
     */
    function processSingleLine(indent, key, value, comma, comment) {
        return indent + key + ': ' + stringifyValue(value) + comma + comment;
    }

    /**
     * 处理多行结构（对象/数组）
     */
    function processMultiLine(indent, key, value, comment, templateLines, startLine) {
        var isArray = Array.isArray(value);
        var result = [indent + key + ': ' + (isArray ? '[' : '{') + comment];
        var contentIndent = (templateLines[startLine] && templateLines[startLine].match(/^\s*/)) ?
            templateLines[startLine].match(/^\s*/)[0] :
            indent + '    ';

        var content = isArray ? value : Object.keys(value).map(function(k) {
            return [k, value[k]];
        });

        var contentIndex = 0;
        var lineIndex = startLine;

        while (contentIndex < content.length || lineIndex < templateLines.length) {
            var endRegex = new RegExp('^\\s*\\' + (isArray ? ']' : '}') + '\\s*,?\\s*(//.*)?$');
            var isEndLine = templateLines[lineIndex] && endRegex.test(templateLines[lineIndex]);

            if (contentIndex < content.length) {
                var item = content[contentIndex];
                var itemStr = isArray ? JSON.stringify(item) : item[0] + ': ' + stringifyValue(item[1]);
                var newLine = contentIndent + itemStr;

                if (lineIndex < templateLines.length && !isEndLine) {
                    var currLine = templateLines[lineIndex];
                    var needsComma = currLine.trim().indexOf(',') === currLine.trim().length - 1 ||
                        contentIndex < content.length - 1;
                    if (needsComma) newLine += ',';

                    var lineComment = (currLine.match(/\/\/.*$/) || [])[0] || '';
                    if (lineComment) {
                        var spaces = ' '.repeat(Math.max(1, currLine.indexOf('//') - newLine.length));
                        newLine += spaces + lineComment;
                    }

                    result.push(newLine);
                    contentIndex++;
                    lineIndex++;
                } else {
                    if (contentIndex < content.length - 1) newLine += ',';
                    result.push(newLine);
                    contentIndex++;
                }
            } else if (isEndLine) {
                result.push(templateLines[lineIndex]);
                return {
                    lines: result,
                    endLine: lineIndex
                };
            } else {
                lineIndex++;
            }
        }

        // 自动补全结束标记
        result.push(contentIndent + (isArray ? ']' : '}'));
        return {
            lines: result,
            endLine: lineIndex
        };
    }

    // ==================== 主流程 ====================
    try {
        // 1. 读取配置文件
        var oldConfig = require(oldConfigPath);
        var newConfig = require(newConfigPath);
        var template = files.read(newConfigPath);
        var templateLines = template.split('\n');
        var result = [];

        // 2. 数据预处理
        //  强制使用的配置
        var serverConfig = serverVersion.configUpdate;
        //  包含值域时，转化为目标值
        var valueTransform = serverVersion.configValueTransform;
        // 开始执行
        for (var key in newConfig) {
            if (oldConfig.hasOwnProperty(key)) {
                if (serverConfig &&
                    serverConfig.hasOwnProperty(key)) {
                    // 将本地配置强制改为远程配置
                    oldConfig[key] = serverConfig[key];
                } else {
                    // 值转换，当字段包含oldV值范围时，转换成newV
                    if (valueTransform && valueTransform.hasOwnProperty(key)) {
                        let valueObj = valueTransform[key];
                        // log(valueObj)
                        if (valueObj.oldV.includes(oldConfig[key])) {
                            oldConfig[key] = valueObj.newV;
                            // log(oldConfig[key])
                        }
                    }
                    // 搬运本地配置
                    oldConfig[key] = convertValueType(oldConfig[key], newConfig[key]);
                }
            }
        }

        // 3. 主处理循环
        for (var i = 0; i < templateLines.length; i++) {
            var line = templateLines[i];
            var fieldMatch = line.match(/^(\s*)([\w\u4e00-\u9fa5]+)\s*:\s*([^\n]*?)(,?)(\s*\/\/.*)?$/);

            if (!fieldMatch || !oldConfig.hasOwnProperty(fieldMatch[2])) {
                result.push(line);
                continue;
            }

            var indent = fieldMatch[1];
            var key = fieldMatch[2];
            var valPart = fieldMatch[3];
            var comma = fieldMatch[4];
            var comment = fieldMatch[5] || '';
            var value = oldConfig[key];

            // 判断是否为单行格式
            var isSingleLine = (!isPlainObject(value) && !Array.isArray(value)) ||
                (valPart.indexOf('[') > -1 && valPart.indexOf(']') > -1) ||
                (valPart.indexOf('{') > -1 && valPart.indexOf('}') > -1);

            if (isSingleLine) {
                result.push(processSingleLine(indent, key, value, comma, comment));
                continue;
            }

            // 处理多行结构
            var processed = processMultiLine(indent, key, value, comment, templateLines, i + 1);
            result = result.concat(processed.lines);
            i = processed.endLine;
        }

        let content = fixWithContext(result.join('\n'));

        // 4. 输出结果
        files.write(outputPath, content, "utf-8");
        log("配置合并成功");
        return true;
    } catch (e) {
        console.error("配置合并失败:", e);
        log("配置合并失败: " + e.message);
        return false;
    }
}


// 使用示例：
//mergeConfigs('./config.old.js', './config.new.js', './config.merged.js');

/**
 * 智能配置文件修复（严格区分对象/数组），修复且备份
 */
function fixConfigFile(sourcePath, backupPath) {
    let content = files.read(sourcePath, "utf-8");

    // 修复步骤：保持缩进和注释
    content = fixWithContext(content);

    files.write(backupPath, content, "utf-8");
    return true;
}



function fixWithContext(content) {
    let lines = content.split('\n');
    let inObject = 0;
    let inArray = 0;
    let lastPropLine = -1;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();

        // 跟踪上下文状态
        if (trimmed.includes('[')) inArray++;
        if (trimmed.includes(']')) inArray--;
        if (trimmed.includes('{')) inObject++;
        if (trimmed.includes('}')) inObject--;

        // 只处理对象属性（排除数组元素）
        if (inObject > 0 && inArray === 0 && isPropertyLine(trimmed)) {
            // 修复逗号（保留注释）
            if (!hasProperComma(trimmed)) {
                lines[i] = line.replace(/([^,]\s*)(\/\/.*)?$/, (_, p1, p2) => {
                    return p1 + (p2 ? ',' + p2 : ',');
                });
            }
            lastPropLine = i;
        }
    }

    // 处理最后一个属性的逗号
    if (lastPropLine >= 0 && lines[lastPropLine].trim().endsWith(',')) {
        lines[lastPropLine] = lines[lastPropLine].replace(/,\s*$/, '');
    }

    // 修复导出语句
    let lastLine = lines[lines.length - 1];
    if (lastLine.includes('};')) {
        lines[lines.length - 1] = lastLine.replace(/\}\s*;\s*$/, '}');
    }

    return lines.join('\n');
}

// 辅助函数
function isPropertyLine(line) {
    return /^[\u4e00-\u9fa5a-zA-Z][^:]*:/.test(line);
}

function hasProperComma(line) {
    return /,\s*(\/\/.*)?$/.test(line);
}

//检查更新
checkVersion();

//开始更新
startUpdate()

//自动下滑更新列表

console.info("------→>★更新完成★<←------")

exit();