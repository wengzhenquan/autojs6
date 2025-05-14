//程序运行文件标志
files.ensureDir("./tmp/")
files.create("./tmp/update_locked");
events.on("exit", () => files.remove('./tmp/update_locked'));



console.launch();

//下载超时，单位：秒。 
//网速快，可以改成10~15，网速慢改成30~60
// 参考：300Mbps宽带10s，100Mbps宽带15s，50Mbps宽带30s
var download_timeout = 15;

//版本信息
var localVersion = null;
var serverVersion = null;
var hasNewVersion = false;

var updateList = [];
var deleteList = [];

// 忽略的更新列表
var ignoreList = [
    "LICENSE", //单个文件，只需要文件名
]

var successList = [];
var errorList = [];

var github = "https://github.com/wengzhenquan/autojs6";

//加速代理
let proxys = [
    "https://gh.llkk.cc/",
    "https://git.886.be/",
    "https://ghfast.top/",
    "https://gh-proxy.ygxz.in/",
    "https://github.fxxk.dedyn.io/",

    "https://github.moeyy.xyz/", //1
    "https://gh-proxy.com/", //2

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
    localVersion = JSON.parse(files.read("./version"));

    let arr = getRandomNumbers(proxys.length - 1);

    for (let i = 0; i < proxys.length; i++) {
        let startTime = new Date().getTime();
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
            log(proxys[arr[i]])
            let time = (new Date().getTime() - startTime);
            log("请求时间：" + time + " ms");
            if (serverVersion) {
                //log(serverVersion.version)
                break;
            }
        }
    }
    if (!serverVersion) {
        console.error("更新服务器连接失败")
        return;
    }

    hasNewVersion = compareVersions(serverVersion.version, localVersion.version) > 0;

    // 检查文件清单
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

    for (var key in localVersion.updateFile) {
        if (!serverVersion.updateFile[key]) {
            deleteList.push(key);
        }
    }

    if (hasNewVersion) {
        console.warn("有新版本！！！")
        console.info("当前版本：" + localVersion.version)
        console.info("最新版本：" + serverVersion.version)
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

    } else {
        console.info("脚本已经是最新版！")
        log("小社脚本版本：" + localVersion.version)
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


//开始更新
function startUpdate() {
    if (!hasNewVersion)
        return;

    log(">>>>>★开始更新★<<<<<")
    log("开始下载文件……")
    log("请不要终止脚本")
    let filemin = 200; //最小文件大小(B)，小于这个大小都认为错误，将重试

    // 乱序数组
    let arr = getRandomNumbers(proxys.length - 1);
    let i = 0;
    for (let j = 0; j < updateList.length; j++) {
        let fileName = updateList[j];
        if (fileName.startsWith('小社脚本')) {
            fileName = serverVersion.main;
        }
        //忽略更新
        if (ignoreList.some(element => fileName.startsWith(element))) {
            continue;
        }
        log("------------------→");
        console.info("正在下载文件：" + fileName)

        var filebytes = null;
        while (i < proxys.length) {
            let startTime = new Date().getTime();
            let url = proxys[arr[i]] +
                github + "/blob/main/" + fileName;

            log('使用加速器：' + proxys[arr[i]]);
            // log(url);
            try {
                var res = null;
                let thread = threads.start(() => {
                    try {
                        res = http.get(url, {
                            timeout: download_timeout * 1000,
                        });
                    } catch (e) {}
                });
                thread.join(download_timeout * 1000);
                thread.interrupt();
                if (res.statusCode === 200) {
                    filebytes = res.body.bytes();
                }
            } catch (e) {} finally {
                let time = (new Date().getTime() - startTime);
                log("请求时间：" + time + " ms");

                //成功，跳出
                if (filebytes && filebytes.length > filemin) {
                    break;
                }

                console.error('下载失败，更换加速器重试');
                i++;
            }
        }
        //重置
        if (i >= proxys.length - 1) i = 0;

        if (!filebytes || filebytes.length < filemin) {
            console.error("下载失败")
            errorList.push(fileName)
            continue;
        } else {
            if (fileName.includes('config')) {
                let name = files.getNameWithoutExtension(fileName); //无后缀文件名
                let ext = files.getExtension(fileName); //后缀
                let time = nowDate().substr(5, 14).replace(/[- :]/g, '');
                let old = name + "_old_" + time + "." + ext;
                log("需更新配置文件config.js");
                files.rename("./" + fileName, old)
                console.error("旧config.js 已重命名为 " + old);
                console.error("请自行搬运 屏幕解锁 等配置");

            }
            files.ensureDir("./" + fileName)
            files.writeBytes("./" + fileName, filebytes);
            successList.push(fileName);
            console.info("下载成功")
            console.info('文件大小：' + formatFileSize(filebytes.length))
        }
        log("←------------------");
    }
    if (successList.length > 0) {
        log("----------------------------");
        console.log("更新成功清单:");
        successList.forEach((file) => {
            let name = !file.includes('/') ? ''.padStart(10) + file : file;
            console.info(name);
        });
        log("----------------------------");
    }

    if (errorList.length > 0) {
        log("----------------------------");
        console.log("更新失败清单:");
        errorList.forEach((file) => {
            let name = !file.includes('/') ? ''.padStart(10) + file : file;
            console.error(name);
        });
        log("----------------------------");
    }

    if (deleteList.length > 0) {
        log("----------------------------");
        console.log("删除文件清单:");
        deleteList.forEach((file) => {
            let name = !file.includes('/') ? ''.padStart(10) + file : file;
            console.error(name);
            files.remove('./' + file)
        });
        log("----------------------------");
    }



}

//检查更新
checkVersion();


//开始更新
startUpdate()

log(">>>>>★更新完成★<<<<<")
exit();