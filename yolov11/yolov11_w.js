// yolov11.js - YOLO 检测与结果处理模块
if (typeof config === 'undefined' || !config ||
    Object.keys(config).length === 0) {
    try {
        config = require("../config.js");
    } catch (e) {
        config = {
            YOLO置信度阈值: 0.01,
            YOLO重叠率阈值: 0.1,
            YOLO尝试遮挡修复: 0,
            YOLO启用GPU: 0
        }
    }
}
// --- 常量定义 ---
const YOLO_PLUGIN_NAME = "com.circlefork.yolo"; // 插件包名
const MODEL_SUBDIR = "/yolov11/model"; // 模型文件夹相对于本脚本的路径
const MODEL_NAME = "yzm"; // 模型名
const MODEL_USE_GPU = config && config.YOLO启用GPU ? true : false;

// 检测模型：yolo11n 单类 icon，但检测头扩到 111 类以兼容插件的老解码逻辑
// （插件按原 111 类模型的通道数读输出；class 0 为真正的图标类，其余类恒为 0）
const MODEL_LABELS = ["icon", "unused1", "unused2", "unused3", "unused4", "unused5", "unused6", "unused7", "unused8", "unused9", "unused10", "unused11", "unused12", "unused13", "unused14", "unused15", "unused16", "unused17", "unused18", "unused19", "unused20", "unused21", "unused22", "unused23", "unused24", "unused25", "unused26", "unused27", "unused28", "unused29", "unused30", "unused31", "unused32", "unused33", "unused34", "unused35", "unused36", "unused37", "unused38", "unused39", "unused40", "unused41", "unused42", "unused43", "unused44", "unused45", "unused46", "unused47", "unused48", "unused49", "unused50", "unused51", "unused52", "unused53", "unused54", "unused55", "unused56", "unused57", "unused58", "unused59", "unused60", "unused61", "unused62", "unused63", "unused64", "unused65", "unused66", "unused67", "unused68", "unused69", "unused70", "unused71", "unused72", "unused73", "unused74", "unused75", "unused76", "unused77", "unused78", "unused79", "unused80", "unused81", "unused82", "unused83", "unused84", "unused85", "unused86", "unused87", "unused88", "unused89", "unused90", "unused91", "unused92", "unused93", "unused94", "unused95", "unused96", "unused97", "unused98", "unused99", "unused100", "unused101", "unused102", "unused103", "unused104", "unused105", "unused106", "unused107", "unused108", "unused109", "unused110"];

// --- 模型参数 ---
//类别置信度阈值
const confThreshold = (config && config.YOLO置信度阈值) || 0.01;
//重叠率阈值
const nmsThreshold = (config && config.YOLO重叠率阈值) || 0.1;
// 尝试遮挡修复
const OccRepair = (config && config.YOLO尝试遮挡修复) || 0;

const tag = "[YOLO]";
// --- 模块级变量 (用于存储初始化状态和实例) ---
var yoloV11 = null;
var isYoloInitialized = false;

// 预估分界y。必须大于所有小图标的y，否则结果会缺少
// 与实际分界y越接近，结果越准确
const REFER_Y = 130;


// global.x_refer表示截图上的文案"请在下图依次点击："末尾的x，也就是小图标的开始
// global.x_refer由前置程序根据控件获取，小图标有效分界x
// 小图标x必须大于global.x_refer，在它右边。
if (typeof global.x_refer === 'undefined' ||
    !global.x_refer || global.x_refer < 1) {
    // 若前置程序没有赋值，则根据实际初始化为200
    global.x_refer = 200;
}


events.on("exit", function() {
    if (yoloV11) {
        yoloV11.release();
    }
});


/**
 * @description 初始化 YOLO 插件和模型。
 * 该函数在模块首次加载时自动执行一次。
 * @returns {boolean} 初始化是否成功
 */
function initializeYolo() {
    // 防止重复初始化
    if (isYoloInitialized) {
        console.log(tag + "已初始化，跳过");
        return true;
    }
    // 如果实例存在但未初始化成功（上次失败），则不再尝试
    if (yoloV11 && !isYoloInitialized) {
        console.warn(tag + "初始化曾失败，不再尝试。");
        return false;
    }

    console.log(tag + "正在初始化...");
    try {
        console.log(`${tag}加载插件Yolo-plugin...`);
        var Yolo = plugins.load(YOLO_PLUGIN_NAME);
        if (!Yolo) {
            throw new Error(`插件Yolo-plugin加载失败！`);
        }

        yoloV11 = new Yolo();
        console.log(tag + "加载成功，实例已创建");

        // --- 使用 __dirname 获取模型路径 ---
        const modelPath = files.cwd() + MODEL_SUBDIR;
        console.log(`${tag}路径: ${MODEL_SUBDIR}`);
        console.log(`${tag}初始化模型: ${MODEL_NAME}`);
        console.log(`${tag}是否加载GPU: ${MODEL_USE_GPU?'是':'否'}`);

        // 初始化模型
        isYoloInitialized = yoloV11.init(modelPath, MODEL_NAME, MODEL_USE_GPU, MODEL_LABELS);

        if (!isYoloInitialized) {
            console.error(tag + " yolo.init() 初始化失败！请检查模型路径、名称、标签及插件权限。");
            console.error('请尝试将配置{YOLO启用GPU:1}改为0再试。');
            yoloV11 = null; // 初始化失败，清空实例
            isYoloInitialized = false;
            throw Error();
            return false;
        }
        console.log(tag + "初始化成功！");
        return true;

    } catch (error) {
        //console.error(`${tag}初始化过程中发生错误: ${error}`);
        yoloV11 = null; // 出错时清空实例
        isYoloInitialized = false;
        throw error;
        return false;
    }
}


/**
 * @description 对原始检测结果进行排序和处理。
 * 规则: 根据实际情况，验证码有两组数据，一组是小图标，另一组是大图标。
        小图标是上方"请在下图依次点击："后面，大图标是下面点击区域。
        根据数据y的大小分类大小图标、label成对匹配，
        小图标的x大小确定先后顺序。prob置信度越高优先匹配。
        以及未能label成功匹配的补偿方案。
        实际验证码图片小图标应该有2、3个，成对匹配应该有4或6个。
 * @param {Array<object>} data - YOLO 检测原始结果数组，格式: [{x, y, width, height, prob, label}, ...]
 * @param {object} [bitmap] - 原图 Bitmap，用于 matcher 双塔特征提取（插件 JNI 接入后生效）
 * @returns {Array<object>|null} - 处理后的结果数组 [{centerX, centerY, prob, label}, ...]（A 顺序，依次点击对应 B 位置），或在失败/无效输入时返回 null。
 */
function sortAndProcessResults(data, bitmap) {
    // log(data)
    // 输入验证
    if (!Array.isArray(data)) {
        console.error("结果处理: 输入数据不是数组。");
        return [];
    }


    try {
        // 获得分界y，小于分界y为小图标，大于分界y为大图标
        const y_limit = getYRefer(data);
        // log(y_limit)

        var len = data.length;
        // 检查数据长度是否满足处理逻辑要求 (4或6)
        // [DSH 补丁] nc=1 + matcher 方案下，现版面是 n 参照 + n 目标 + 1 干扰 = 5 或 7 框，
        // 属于正常情况。只有"框太少"才是错误；绝不能进下面那段按 label 分组的修正逻辑
        // （nc=1 时所有框 label 都是 icon，分组会把 7 个框压成 1 对，直接毁掉数据）。
        if (len < 4) {
            console.error("预期长度为 4 或 6");
            // console.error("实际长度为：" + len);
            if (len < 4) {
                console.error("长度过小");
                console.error('可能验证码区域有遮挡');
                console.error('请检查tmp/pic.png验证码截图');
                console.error('    或tmp/error/local/目录');
                if (len === 0) {
                    console.error("如果你发现截图是黑屏，可能由于屏幕保护导致不允许截图")
                    console.error("可尝试将社区APP加入截图白名单(移出黑名单)，或者关闭屏幕保护")
                } else {
                    console.warn('若无遮挡——→')
                    console.error("请尝试：");

                    if (nmsThreshold < 0.9) {
                        console.error('   1.提高[YOLO重叠率阈值]值');
                        console.warn(`当前 (重叠率阈值: ${nmsThreshold})`);
                    }
                    if (confThreshold > 0.1) {
                        console.error('   2.降低[YOLO置信度阈值]值');
                        console.warn(`当前 (置信度阈值: ${confThreshold})`);
                    }
                }
                return [];
            }

            console.log(tag + "开始尝试进行修正...");

            // 步骤1：分组
            var groups = {};
            data.forEach(item => {
                let label = item.label;
                groups[label] = groups[label] || [];
                groups[label].push(item);
            });
            //log(groups)

            // 步骤2：筛选结果
            var result = [];
            // 修复遮挡数组
            var y_limit_single = [];
            // 最多3个图标
            var n = 3;

            Object.keys(groups).forEach(label => {
                // ======= 前置通用处理 =======
                // 按置信度降序排序(按label提取)
                var group = groups[label].slice()
                    // 过滤掉无效项
                    .filter(item => !(item.y < y_limit && item.x < global.x_refer))
                    .sort((a, b) => b.prob - a.prob);

                // 最高置信度项(第1项)
                var topItem = group[0];

                // ========== 跳过规则 =========

                // 跳过空数组
                if (typeof topItem === 'undefined' ||
                    !topItem || group.length < 1)
                    return;

                // 规则1：跳过全组y>y_limit
                if (group.every(item => item.y > y_limit)) return;

                // 规则2：全组y<y_limit，保留第一个
                if (group.every(item => item.y < y_limit)) {
                    // 尝试修复遮挡上方参照图标
                    // 添加小于y_limit的元素，其中y=0的元素仅保留一个
                    if (y_limit_single.every(item => item.y !== 0) &&
                        n--) {
                        y_limit_single.push(topItem);
                    }

                    return;
                }

                // ========== 成对匹配(经过前面跳过规则，剩下的必有匹配) =========

                // 核心逻辑：寻找配对项
                //let pairItem = null;
                // 遍历匹配(从第2项开始)
                for (let i = 1; i < group.length; i++) {
                    let currentItem = group[i];
                    // 于topItem区分，跳过相同区域的数据
                    if ((topItem.y > y_limit && currentItem.y > y_limit) ||
                        (topItem.y < y_limit && currentItem.y < y_limit))
                        continue;

                    //pairItem = currentItem;
                    // 添加到结果（必须保留两项）
                    // 经过上面处理，能确保数据都是成对，上面1个，下面1个
                    result.push(topItem, currentItem);
                    n--;
                    break;
                }
            });

            //log(y_limit_single)
            //log(result)
            // 尝试修复遮挡
            if (y_limit_single.length > 0 && OccRepair) {
                console.error('尝试遮挡修复……');
                console.error("遮挡修复，结果不一定正确!");
                // 提取数组result中所有的label，用于去重过滤
                let aLabels = new Set(result.map(item => item.label));
                // 过滤去重
                var B_data = Array.from(
                    data.slice()
                    // 目标为分界y下方的候选项，去除已存在label
                    .filter(item => item.y > y_limit && !aLabels.has(item.label))
                    .reduce((m, i) =>
                        // 然后执行去重逻辑
                        m.has(i.label) && m.get(i.label).prob >= i.prob ? m : m.set(i.label, i),
                        new Map()
                    ).values()
                ).sort((a, b) => b.prob - a.prob);
                //log(B_data)

                for (let i = 0; i < y_limit_single.length; i++) {
                    let single_b = B_data[i];
                    // 成对匹配
                    if (typeof single_b !== 'undefined' && single_b)
                        result.push(y_limit_single[i], single_b);
                }
            }

            //len = result.length;
            console.log(tag + "修正后长度为：" + result.length);
            // 检查数据长度是否满足处理逻辑要求 (4或6)
            if (result.length !== 4 && result.length !== 6) {
                //log(data)
                console.error('结果依旧不符合预期')
                //return [];
            }
            //替换数据
            data = result;

            sleep(500);

        }

        //log(data)
        // ==================== 1. 数据准备阶段 ====================
        // 1.1 按y坐标升序排序（浅拷贝避免修改原数组）
        //const sortedByY = data.slice().sort((a, b) => a.y - b.y);
        var sortedByY = data;

        // 1.2 计算分组边界位置
        // 最小的Y，最小Y的height
        //const minY = sortedByY[0].y;
        //const height = Math.max(minY, 50);

        // 1.3 创建分组A（y值较小的部分，按x升序排序），定义为小图标
        // 新方案（nc=1）：所有框 label 均为 icon，不再按 label 去重
        // 直接收集小于分界y且在小图标有效x区内的框，按x升序（点击顺序）
        var groupA = [];
        for (var i = 0; i < sortedByY.length; i++) {
            var item = sortedByY[i];
            if (item.y < y_limit && item.x > global.x_refer) {
                groupA.push(item);
            }
        }
        // 同x高度重叠的重复框只保留置信度最高者
        groupA.sort((a, b) => a.x - b.x || b.prob - a.prob);
        var dedupA = [];
        for (var i = 0; i < groupA.length; i++) {
            if (i === 0 || Math.abs(groupA[i].x - groupA[i - 1].x) > 5) {
                dedupA.push(groupA[i]);
            }
        }
        groupA = dedupA;

        //log(groupA)

        // 1.4 创建分组B（y值较大的部分，按prob倒序），定义为大图标
        // 新方案：全量收集大于分界y的框，按中心点距离去重
        var groupB = [];
        for (var i = 0; i < sortedByY.length; i++) {
            var item = sortedByY[i];
            if (item.y > y_limit) {
                groupB.push(item);
            }
        }
        groupB.sort((a, b) => b.prob - a.prob);
        var dedupB = [];
        for (var i = 0; i < groupB.length; i++) {
            var dup = false;
            for (var j = 0; j < dedupB.length; j++) {
                if (Math.abs(groupB[i].x - dedupB[j].x) < 5 &&
                    Math.abs(groupB[i].y - dedupB[j].y) < 5) {
                    dup = true;
                    break;
                }
            }
            if (!dup) dedupB.push(groupB[i]);
        }
        groupB = dedupB;

        //log(groupB)

        // 1.5 校验结果
        let glen = groupA.length + groupB.length;
        if (groupA.length < 2 || groupA.length > 3 ||
            glen < 4 || glen < sortedByY.length ||
            groupA.length !== groupB.length) {

            console.error('发现预期长度错误！');
            log(tag + ('→处理后长度：').padStart(7) + (glen));
            console.error(('→上方参照数据：').padStart(17) + groupA.length)
            console.error(('→下方候选数据：').padStart(17) + groupB.length)
            log(tag + '预期有效数据：' + (groupA.length * 2));
            sleep(500);
        }

        if (groupA.length < 2 || groupA.length > 3 ||
            groupB.length < groupA.length) {

            console.error('结果解析错误！');
            console.error('可能验证码区域有遮挡');
            console.error('请检查tmp/pic.png验证码截图');
            console.error('    或tmp/error/local/目录');


            if (groupA.length > 3) {
                console.warn('若无遮挡——→')

                console.error('    异常原因：[参照数据>3]');
                console.error("请尝试：");

                if (nmsThreshold > 0.1 && len > 15) {
                    console.error('   1.降低[YOLO重叠率阈值]值');
                    console.warn(`当前 (重叠率阈值: ${nmsThreshold})`);
                }
                if (confThreshold < 0.9) {
                    console.error('   2.提高[YOLO置信度阈值]值');
                    console.warn(`当前 (置信度阈值: ${confThreshold})`);
                }

            } else {
                console.warn('若无遮挡——→')

                if (groupA.length < 2)
                    console.error('    异常原因：[参照数据＜2]');
                if (groupB.length < groupA.length)
                    console.error('    异常原因：[候选数据＜参照数据]');

                console.error("请尝试：");

                if (nmsThreshold < 0.9 && len <= 15) {
                    console.error('   1.提高[YOLO重叠率阈值]值');
                    console.warn(`当前 (重叠率阈值: ${nmsThreshold})`);
                }
                if (confThreshold > 0.1) {
                    console.error('   2.降低[YOLO置信度阈值]值');
                    console.warn(`当前 (置信度阈值: ${confThreshold})`);
                }
            }
            return [];
        }


        // ==================== 2. matcher 双塔特征配对（新方案）====================
        // 配对不再依赖类别标签（nc=1 全为 icon），改用双塔特征相似度：
        // A 区第 i 个参照图标（按 x 升序）→ B 区相似度最高且未被占用的候选
        // ===== matcher 特征提取（预留插件 JNI 接入点）=====
        // 插件 libandroid_ncnn_yolo11.so 待实现 extractMatcher 接口：
        //   yoloV11.extractMatcher(bitmap, [{x,y,w,h},...]) -> JSON string
        //   或 Array [{feat:[128]}]（feat 已 L2 归一化）
        // 未接入时返回 null，配对降级为置信度启发式并告警。
        var groupC = [];
        var featA = null;
        var featB = null;
        if (bitmap && yoloV11 && typeof yoloV11.extractMatcher === 'function') {
            try {
                var needA = groupA.map(function(it) {
                    return { x: it.x, y: it.y, w: it.width, h: it.height };
                });
                var needB = groupB.map(function(it) {
                    return { x: it.x, y: it.y, w: it.width, h: it.height };
                });
                var rawA = yoloV11.extractMatcher(bitmap, needA, files.cwd() + MODEL_SUBDIR, "matcher");
                var rawB = yoloV11.extractMatcher(bitmap, needB, files.cwd() + MODEL_SUBDIR, "matcher");
                featA = typeof rawA === 'string' ? JSON.parse(rawA) : rawA;
                featB = typeof rawB === 'string' ? JSON.parse(rawB) : rawB;
            } catch (e) {
                console.error(tag + 'matcher 特征提取失败: ' + e);
                featA = featB = null;
            }
        }

        if (featA && featB && featA.length === groupA.length &&
            featB.length === groupB.length) {
            // ---- 双塔相似度：穷举最优分配（参照 n<=3、候选 m<=4，最多 24 种排列）----
            // 不能用贪心：若两个参照都最看好同一个候选，贪心会先到先得，
            // 导致"两个都配错"（实测样例：R1 抢了 R2 的 0.940 候选，两个全反）。
            var nA = featA.length, nB = featB.length;
            var S = [], featOk = true;
            for (var i0 = 0; i0 < nA && featOk; i0++) {
                var fa0 = featA[i0].feat;
                if (!fa0) { featOk = false; break; }
                var row0 = [];
                for (var j0 = 0; j0 < nB; j0++) {
                    var fb0 = featB[j0].feat;
                    if (!fb0) { featOk = false; break; }
                    var s0 = 0;
                    for (var d0 = 0; d0 < fa0.length; d0++) {
                        s0 += fa0[d0] * fb0[d0];
                    }
                    row0.push(s0);
                }
                S.push(row0);
            }

            if (featOk && nA > 0 && nB >= nA) {
                var usedTmp = {}, curPick = [], bestSum = -1e9, bestPick = null;
                var recAssign = function (i, sum) {
                    if (i === nA) {
                        if (sum > bestSum) {
                            bestSum = sum;
                            bestPick = curPick.slice(0);
                        }
                        return;
                    }
                    for (var j = 0; j < nB; j++) {
                        if (usedTmp[j]) continue;
                        usedTmp[j] = true;
                        curPick.push(j);
                        recAssign(i + 1, sum + S[i][j]);
                        curPick.pop();
                        usedTmp[j] = false;
                    }
                };
                recAssign(0, 0);
                if (bestPick && bestPick.length === nA) {
                    var simMean = 0;
                    for (var i1 = 0; i1 < nA; i1++) {
                        groupC.push(groupB[bestPick[i1]]);   // 保持 A 顺序 = 点击顺序
                        simMean += S[i1][bestPick[i1]];
                    }
                    simMean /= nA;
                    console.log(tag + 'matcher 配对完成（最优分配），参照数: ' + groupA.length +
                        ', 配对相似度均值: ' + simMean.toFixed(3));
                }
            }
        } else {
            // ---- 降级：matcher 未接入或特征不足，按 B 区置信度顺序配对 ----
            // B 已按 prob 降序；A 数量 <= B 数量时按顺序一一对应
            if (groupB.length >= groupA.length) {
                groupC = groupB.slice(0, groupA.length);
            } else {
                groupC = groupB.slice();
            }
            if (!(featA && featB)) {
                console.warn(tag + 'matcher 未接入（插件需实现 extractMatcher），当前使用置信度启发式配对，结果可能不正确！');
            } else {
                console.warn(tag + 'matcher 特征数量不匹配，已降级为置信度启发式配对。');
            }
        }

        // ==================== 5. 最终结果处理 ====================

        // 5. 格式化 groupC 的结果
        var finalResult = groupC.map(item => {
            // 防御：跳过占位符或无效项，避免 undefined 计算导致 Numberx 异常
            if (!item || item.label === "PLACEHOLDER" || typeof item.prob !== 'number') {
                return null;
            }
            let centerX = item.x + (item.width / 2);
            let centerY = item.y + (item.height / 2);
            // 替代 toFixed+parseFloat，纯数学运算，不经过字符串转换
            let prob = Math.round(item.prob * 100) / 100;
            return {
                centerX: Math.round(centerX),
                centerY: Math.round(centerY),
                prob: prob,
                label: item.label
            };
        }).filter(item => item !== null);

        log(tag + '处理完毕，图标数量: ' + finalResult.length);

        // 释放大引用，帮助 GC
        data = null;
        sortedByY = null;
        groups = null;
        result = null;
        y_limit_single = null;
        B_data = null;
        groupA = null;
        groupB = null;
        groupC = null;
        featA = null;
        featB = null;
        if (typeof gc === 'function') gc();

        return finalResult;

    } catch (error) {
        console.error(`结果处理: 排序或格式化过程中发生错误: ${error}`);
        console.error(error.lineNumber);
        return [];
    }
}

// 获取小图标与大图标分界y
function getYRefer(data) {
    // ------- 根据数据计算（但有局限性，如果上方参照图标全被遮挡，分界y将没有意义）
    // 获取y最小的一个有效元素(其中prob最大的)

    // y最小的有效元素，
    var f = data.slice().filter(item => item.y < REFER_Y && item.x > global.x_refer);
    var minYItem = f.reduce((a, b) => a.y < b.y ? a : b, {});
    //log(minYItem)
    var y = (minYItem.y + minYItem.height) || 0;
    //log(y)

    // 其中prob最大的有效元素
    var maxProb = f.filter(item => item.y < y && item.y >= minYItem.y)
        .reduce((a, b) => a.prob > b.prob ? a : b, {});
    //log(maxProb)
    // 该元素的数据整合成分界y
    y = (maxProb.y + maxProb.height) || 0;

    if (typeof global.y_refer === 'undefined' || !global.y_refer)
        return y;

    // -------- global.y_refer由前置程序根据控件获取，真实有效
    // global.y_refer表示截图上的文案"请在下图依次点击："后面的小图标，与下方点击区域的分界，主要点击区域上边缘y
    //log(global.y_refer)
    if (global.y_refer > y) return global.y_refer;

    if (global.y_refer > maxProb.y)
        return y + random(15, 20);

    return -1;
}



/**
 * @description 对指定路径的图片执行 YOLO 检测并处理结果。
 * @param {string} imagePath - 要检测的图片文件的绝对路径。
 * @param {number} [confThreshold=DEFAULT_CONF_THRESHOLD] - 置信度阈值 (可选)。 
 * @returns {Array<object>|null} - 处理后的检测结果数组，或在失败时返回 null。
 */
function detectAndProcess(imagePath) {
    // 检查初始化状态
    if (!isYoloInitialized || !yoloV11) {
        console.error(tag + "未初始化或初始化失败，尝试重新初始化...");
        try {
            // 尝试再次初始化
            initializeYolo();
        } catch (e) {}
        if (!isYoloInitialized || !yoloV11)
            return null;
    }

    // 检查图片路径
    if (!imagePath || typeof imagePath !== 'string') {
        console.error("检测处理: 无效的图片路径。");
        return null;
    }
    if (!files.exists(imagePath)) {
        console.error(`检测处理: 图片文件不存在: ${imagePath}`);
        return null;
    }

    let cardImg = null;
    try {
        // 读取图片
        console.log(`${tag}读取图片: ${imagePath}`);
        cardImg = images.read(imagePath); // 使用函数参数 imagePath
        if (!cardImg) {
            console.error(`检测处理: 读取图片失败: ${imagePath}`);
            return null;
        }

        // 执行检测
        console.log(`${tag}配置 (置信度阈值: ${confThreshold})`);
        console.log(`${tag}配置 (重叠率阈值: ${nmsThreshold})`);
        // 注意：yolo.detect 可能需要 Bitmap 对象，images.read 返回的是 Image 对象
        // 需要确认 yolo.detect 接受的参数类型，如果是 Bitmap，需要 img.bitmap
        let rawResults = yoloV11.detect(cardImg.bitmap, confThreshold, nmsThreshold, 640);
        console.log(`${tag}识别完成，数据数量: ${rawResults ? rawResults.length : 'N/A'}`);
        //log(rawResults)
        // 处理并返回结果（新方案：检测 + matcher 双塔配对，bitmap 供特征提取）
        return sortAndProcessResults(rawResults, cardImg.bitmap);

    } catch (error) {
        console.error(`${tag}识别过程中发生错误: ${error}`);
        console.error(error.lineNumber);
        return [];
    } finally {
        // 释放图片资源（只在 finally 中释放一次）
        if (cardImg) {
            cardImg.recycle(); // 回收图片对象，防止内存泄漏
            cardImg = null;
        }
    }
}

// --- 模块初始化 ---
// 在模块加载时执行一次初始化尝试
initializeYolo();

// --- 导出功能 ---
// 导出主函数
module.exports = detectAndProcess;