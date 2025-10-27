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
// 网速快，可以改成10~30，网速慢改成30~60
// 参考：50~100Mbps宽带 50s，
//      100~300Mbps宽带 30s，
//      300~500Mbps宽带 20s，
//      千兆 10s
var download_timeout = 30;

// 是否更新代理池(0=不更新(使用内置代理)，1=可用代理数量少时更新)
const update_proxy = 1;

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
const m1 = Math.pow(1024, 2); //1M
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

// 代理存储桶
const sto_gh_proxys = storages.create('gh_proxys');

if (update_proxy) {
    events.on("exit", () => {
        sto_gh_proxys.put("update", false);

    });
}

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

// 全局乱序代理
//var proxy_arr = getRandomNumbers(proxys.length - 1);
var proxy_index = 0;
//var api_proxy_arr = getRandomNumbers(api_proxys.length - 1);
var api_proxy_index = 0;

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

//--------------- 更新代理池 ---------

// 更新代理池
function updateProxys() {
    console.info(">>>>>→ 代理池详情 ←<<<<<")

    log("--→内置代理池数量：")

    log("proxys：" + proxys.length)
    log("api_proxys：" + api_proxys.length)

    var gh_p = sto_gh_proxys.get("gh_p");
    var gh_api_p = sto_gh_proxys.get("gh_api_p");

    if (update_proxy) {
        if (!gh_p || !gh_api_p ||
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

    // storages.remove("gh_proxys")

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

        // 等待所有线程完成（每个线程最多等待5秒）
        threadsss.forEach(thread => {
            thread.join(5000);
            if (thread.isAlive()) {
                thread.interrupt();
            }
            //  thread.interrupt();
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
    if (update_proxy) {
        sto_gh_proxys.put("gh_p", proxys)
        sto_gh_proxys.put("gh_api_p", api_proxys)
    }
}

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

    //  let lun = Math.ceil(proxys.length * proxys_use);
    let lun = getLun(proxys, proxys.length * proxys_use, 10);
    while (lun--) {
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
                let res = HttpUtils.request(url, {
                    method: "GET",
                    timeout: 5,
                    ignoreSSL: true
                });

                if (res && res.statusCode === 200) {
                    result = res.json;
                }
            } catch (e) {
                //   console.error("HTTP请求失败:", e);
            }
        });
        thread.join(5 * 1000);
        if (thread.isAlive()) {
            thread.interrupt();
        }

        let time = (new Date().getTime() - startTime);
        log("请求时间：" + toSeconds(time));

        if (result) {
            serverVersion = result;
            //log(serverVersion.version)
            break;
        }
        // 删除请求失败的代理
        proxys.splice(proxy_index, 1);
        // proxy_index--;
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
    // 文件循环
    for (let j = 0; j < updateList.length; j++) {
        let fileName = updateList[j];
        //忽略更新
        if (ignoreList.some(element => fileName.startsWith(element))) {
            console.warn('忽略列表：' + fileName);
            continue;
        }

        log("---------------------------→");
        console.info("==>文件：" + fileName)
        //无后缀文件名
        let name = files.getNameWithoutExtension(fileName);
        //后缀
        let ext = files.getExtension(fileName);
        let savePath = files.cwd() + "/" + fileName;

        let needMergeConfigs = false; //需要合并配置
        if (fileName.includes('config') && files.exists('./' + fileName)) {
            savePath = files.cwd() + "/tmp/" + name + ".new." + ext;
            needMergeConfigs = true;
        }
        //文本类型
        let isText = textArry.includes(ext);
        let fileInfo = null;
        if (!isText) {
            console.warn('该文件需要文件校验！')
            fileInfo = getGitHubFileInfo(fileName, 'main');
        }
        //超时，文本文件5秒，非文本文件使用配置
        let timeoutTimes = isText ? 5 : download_timeout;

        let filebytes = null;
        // 代理循环
        let r404 = 0;
        //  let lun = Math.ceil(proxys.length * proxys_use);
        let lun = getLun(proxys, proxys.length * proxys_use, 10);
        while (lun--) {

            runtime.gc;
            java.lang.System.gc();
            sleep(500);
            aMem = device.getAvailMem();
            if (!isText && aMem < g1 &&
                fileInfo && fileInfo.size > m1) {
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

            // log(url);
            try {
                let res = HttpUtils.download(
                    url, savePath, {
                        timeout: timeoutTimes,
                        ignoreSSL: true,
                        isTextFile: isText,
                        onProgress: (progress) => {
                            console.log(progress.progressBar + (" " + progress.percent + "%").padStart(5, "\u3000"));
                        }
                    }
                )

                // 显示完成信息
                console.info("下载完成! ");
                let time = (new Date().getTime() - startTime);
                log("耗时：" + toSeconds(time));
                console.log("文件大小: " + formatFileSize(res.fileSize));

                //成功，跳出
                if (!isText) {
                    //   let filebytes = files.readBytes(savePath);
                    console.warn("-->开始文件校验！")

                    if (fileInfo &&
                        !fileVerify(fileInfo, savePath)) {
                        throw new Error("校验失败");
                    }
                }
                break;
            } catch (e) {
                console.error("下载失败: " + e);
                if (files.exists(savePath))
                    files.remove(savePath);

                if (e.message.includes("404")) {
                    if (r404 > 2) {
                        console.error("GitHub上找不到该文件")
                        console.error("可能被作者删除")
                        console.error("请等5分钟后再试")
                        break;
                    }
                    r404++;
                }

                // 删除请求失败的代理
                proxys.splice(proxy_index, 1);
                console.error("更换加速器，重试！")
                continue;

            }
        }

        if (!files.exists(savePath)) {
            console.error("下载失败");
            errorList.push(fileName);
            //continue;
        } else successList.push(fileName);

        if (fileName.includes('config') && needMergeConfigs) {
            log("需更新配置文件");

            // 备份旧文件
            let oldName = name + ".old." + ext;
            fixConfigFile('./' + fileName, './' + oldName)
            wait(() => false, 500);
            console.error("旧" + fileName + " 已重命名为 " + oldName);
            files.remove('./' + fileName)
            wait(() => false, 300);

            //新文件名
            let newName = "tmp/" + name + ".new." + ext;

            console.info("开始尝试自动搬运配置");
            console.info("[" + oldName + "] + [" + newName + "]");
            console.info("===>>> [" + fileName + "]");

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

        }
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

    try {
        if (!auto.isRunning()) {
            auto(true);
        }

        //sleep(3000)
        if (packageName('org.autojs.autojs6').exists()) {
            //  ---------------- 下面是刷新列表 --------//
            back();
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
    } catch (e) {

    }

}

// ==================== 文件校验系列 ====================

// 校验文件
function fileVerify(fileInfo, filePath) {
    filePath = files.path(filePath);
    let file = new File(filePath);
    let fileSize = file.length();
    console.info('已下载文件大小：' + fileSize);
    console.info('已下载文件SHA-1：');
    let sha1 = getGitFileSha(filePath);
    console.error(sha1);

    let result = fileInfo.size === fileSize &&
        sha1 === fileInfo.sha

    if (result)
        console.warn('已通过校验！');

    return result;
}

// 获取GitHub文件信息
function getGitHubFileInfo(filePath, branch) {
    console.info('正在获取Github API版本信息')
    let result = null;

    // let lun = Math.ceil(api_proxys.length * 0.5);
    let lun = getLun(api_proxys, api_proxys.length * 0.5, 5);
    while (lun--) {
        //let startTime = new Date().getTime();
        let proxy = api_proxys[api_proxy_index];
        console.warn('API加速器：' + proxy)
        let url = proxy +
            api_github +
            filePath +
            "?ref=" +
            branch +
            '&t=' +
            new Date().getTime();
        //  log(url)
        let thread = threads.start(() => {
            try {
                let res = HttpUtils.request(url, {
                    method: "GET",
                    timeout: 10,
                    ignoreSSL: true
                });

                result = res.json;
            } catch (e) {}
        });
        thread.join(10 * 1000);
        if (thread.isAlive()) {
            thread.interrupt();
        }
        //  let time = (new Date().getTime() - startTime);
        // log("请求时间：" + toSeconds(time));

        if (result && result.size) break;

        // 删除请求失败的代理
        api_proxys.splice(api_proxy_index, 1);
        // api_proxy_index--;
        continue;
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
function getGitFileSha2(fileBytes) {
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


// 避免大内存分配
function getGitFileSha3(fileBytes) {
    // 构造 Blob 头部
    var headerStr = "blob " + fileBytes.length + "\u0000";
    var headerBytes = new java.lang.String(headerStr).getBytes("UTF-8");

    // 使用 MessageDigest 的分块更新功能，避免创建大数组
    var md = java.security.MessageDigest.getInstance("SHA-1");

    // 更新头部数据
    md.update(headerBytes);

    // 分块更新文件内容（避免一次性加载）
    const CHUNK_SIZE = 8192; // 8KB 块大小
    for (let offset = 0; offset < fileBytes.length; offset += CHUNK_SIZE) {
        let end = Math.min(offset + CHUNK_SIZE, fileBytes.length);
        let chunk = java.util.Arrays.copyOfRange(fileBytes, offset, end);
        md.update(chunk);
        chunk = null; // 及时释放
    }

    // 获取最终哈希值
    var digestBytes = md.digest();

    // 转换为十六进制
    var hexChars = [];
    for (let i = 0; i < digestBytes.length; i++) {
        let b = digestBytes[i];
        hexChars.push(((b & 0xFF) < 0x10 ? '0' : '') + (b & 0xFF).toString(16));
    }
    return hexChars.join('');
}

//  分流处理，入参是路径
function getGitFileSha(filePath) {
    filePath = files.path(filePath);
    // 导入必要的Java类
    var File = java.io.File;
    var FileInputStream = java.io.FileInputStream;
    var MessageDigest = java.security.MessageDigest;

    // 获取文件对象
    var file = new File(filePath);
    var fileSize = file.length();

    // 构造Blob头部
    var headerStr = "blob " + fileSize + "\u0000";
    var headerBytes = new java.lang.String(headerStr).getBytes("UTF-8");

    // 初始化SHA-1消息摘要
    var md = MessageDigest.getInstance("SHA-1");
    md.update(headerBytes);

    // 使用文件输入流分块读取文件
    var fis = new FileInputStream(file);
    var bufferSize = 8192; // 8KB缓冲区
    var buffer = util.java.array('byte', bufferSize);
    var bytesRead;

    while ((bytesRead = fis.read(buffer)) !== -1) {
        // 更新哈希计算（只处理实际读取的字节）
        md.update(buffer, 0, bytesRead);
    }

    // 关闭文件流
    fis.close();

    // 获取最终哈希值
    var digestBytes = md.digest();

    // 转换为十六进制字符串
    var hexChars = [];
    for (var i = 0; i < digestBytes.length; i++) {
        var hex = (digestBytes[i] & 0xFF).toString(16);
        hexChars.push(hex.length === 1 ? '0' + hex : hex);
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
            if (e.javaException instanceof java.net.SocketTimeoutException ||
                e instanceof java.net.SocketTimeoutException) {
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

            let string = response.body().string()

            let jsons = null;
            try {
                jsons = JSON.parse(string);
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
            
            log("发送请求……")
            // 使用统一的请求执行函数
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

// 更新代理池
//if (update_proxy)
updateProxys();

//检查更新
checkVersion();

//开始更新
startUpdate()

// 同步代理
synProxys();

//自动下滑更新列表

console.info("------→>★更新完成★<←------")

exit();