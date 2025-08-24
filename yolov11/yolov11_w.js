// yolov11.js - YOLO 检测与结果处理模块
if (typeof config === 'undefined' || !config ||
    Object.keys(config).length === 0) {
    try {
        config = require("../config.js");
    } catch (e) {
        config = {};
    }
}
// --- 常量定义 ---
const YOLO_PLUGIN_NAME = "com.circlefork.yolo"; // 插件包名
const MODEL_SUBDIR = "/yolov11/model"; // 模型文件夹相对于本脚本的路径
const MODEL_NAME = "yzm"; // 模型名
const MODEL_USE_GPU = config && config.YOLO启用GPU ? true : false;
const MODEL_LABELS = ["面条", "牙齿", "喷漆", "戒指", "汉堡", "双串", "气球", "三星", "四方角", "拉力器",
    "垃圾桶", "纽扣", "保龄球", "吊灯", "蚂蚱", "电脑", "网球", "地雷", "干杯", "猫头鹰",
    "胭脂", "橄榄球", "熊脚印", "锤子", "磁带", "五色球", "打拳击", "拉提琴", "项链模特",
    "吉他", "柜子", "开关", "小杯", "乒乓球拍", "BUG", "鸭子", "鼓", "钱袋", "照相",
    "方蛇", "乌龟", "车钥匙", "蜻蜓", "蜗牛", "两片叶子", "墨水", "小号", "路灯", "蛇",
    "双色帆", "工具箱", "木鱼", "铃铛", "音乐盒", "天平", "怀表", "辣椒", "鹤", "麻脑",
    "电机", "未知02", "小熊", "沙漏", "墓碑", "排球", "讲台", "汽车", "生化", "浴缸",
    "闹钟", "西瓜", "大树", "一枝花", "摩天轮", "吊钩", "别墅", "热水浴缸", "三圆", "飞机",
    "弓箭", "瞳孔", "创可贴", "蝴蝶", "圆柱", "指南针", "飞碟", "苹果", "冰淇淋", "机器人",
    "磁铁", "蒸汽火车", "鹰头", "一个铃铛", "双手提东西", "五环", "打火机", "风力发电", "派大星",
    "鸟嘴", "手掌", "树叶", "火龙", "大炮", "风车", "胡萝卜", "甜筒", "木鱼", "自行车",
    "战斗", "香烟"
];
// --- 模型参数 ---
//类别置信度阈值
const confThreshold = (config && config.YOLO置信度阈值) || 0.01;
//重叠率阈值
const nmsThreshold = (config && config.YOLO重叠率阈值) || 0.1;

// 尝试遮挡修复
const OccRepair = (config && config.YOLO尝试遮挡修复) || 0;

const tag = "[YOLO]";
// --- 模块级变量 (用于存储初始化状态和实例) ---
var yoloInstance = null;
var isYoloInitialized = false;


// global.x_refer表示截图上的文案“请在下图依次点击：”末尾的x，也就是小图标的开始
// global.x_refer由前置程序根据控件获取，小图标有效分界x
// 小图标x必须大于global.x_refer，在它右边。
if (typeof global.x_refer === 'undefined' ||
    !global.x_refer || global.x_refer < 0) {
    // 若前置程序没有赋值，则根据实际初始化为200
    global.x_refer = 200;
}


events.on("exit", function() {
    if (yoloInstance) {
        yoloInstance.release();
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
    if (yoloInstance && !isYoloInitialized) {
        console.warn(tag + "初始化曾失败，不再尝试。");
        return false;
    }

    console.log(tag + "正在初始化...");
    try {
        console.log(`${tag}加载插件Yolo-plugin...`);
        var YoloPlugin = plugins.load(YOLO_PLUGIN_NAME);
        if (!YoloPlugin) {
            throw new Error(`插件Yolo-plugin加载失败！`);
        }

        yoloInstance = new YoloPlugin();
        // yoloInstance = new Yolo();
        console.log(tag + "加载成功，实例已创建");

        // --- 使用 __dirname 获取模型路径 ---
        const modelPath = files.cwd() + MODEL_SUBDIR;
        console.log(`${tag}路径: ${MODEL_SUBDIR}`);
        console.log(`${tag}初始化模型: ${MODEL_NAME}`);
        console.log(`${tag}是否加载GPU: ${MODEL_USE_GPU?'是':'否'}`);

        // 初始化模型
        isYoloInitialized = yoloInstance.init(modelPath, MODEL_NAME, MODEL_USE_GPU, MODEL_LABELS);

        if (!isYoloInitialized) {
            console.error(tag + " yolo.init() 初始化失败！请检查模型路径、名称、标签及插件权限。");
            console.error('请尝试将配置{YOLO启用GPU:1}改为0再试。');
            yoloInstance = null; // 初始化失败，清空实例
            isYoloInitialized = false;
            throw Error();
            return false;
        }
        console.log(tag + "初始化成功！");
        return true;

    } catch (error) {
        //console.error(`${tag}初始化过程中发生错误: ${error}`);
        yoloInstance = null; // 出错时清空实例
        isYoloInitialized = false;
        throw error;
        return false;
    }
}

/**
 * @description 对原始检测结果进行排序和处理。
 * 规则: 1. 按Y坐标升序；2. 分为(A组)和(B组)；3. A组按X坐标升序；
 *       4. B组按A组排序后的标签顺序排序；5. 计算B组中心点并格式化输出。
 * @param {Array<object>} data - YOLO 检测原始结果数组，格式: [{x, y, width, height, prob, label}, ...]
 * @returns {Array<object>|null} - 处理后的 C 组结果数组 [{centerX, centerY, prob, label}, ...]，或在失败/无效输入时返回 null。
 */
function sortAndProcessResults(data) {
    //log(data)
    // 输入验证
    if (!Array.isArray(data)) {
        console.error("结果处理: 输入数据不是数组。");
        return new Array();
    }

    // 获得分界y
    const y_limit = getYRefer(data);
    //log(y_limit)

    try {
        var len = data.length;
        // 检查数据长度是否满足处理逻辑要求 (4或6)
        if (len !== 4 && len !== 6) {
            console.error("预期长度为 4 或 6");
            // console.error("实际长度为：" + len);
            if (len < 4) {
                console.error("长度过小");
                console.error('可能验证码区域有遮挡');
                console.error('请检查tmp/pic.png验证码截图');
                console.error('    或tmp/error/local/目录');
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
                return new Array();
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
                    group.length < 1)
                    return;

                // 规则1：跳过全组y>y_limit
                if (group.every(item => item.y > y_limit)) return;

                // 规则2：全组y<y_limit，保留第一个
                if (group.every(item => item.y < y_limit)) {
                    // 尝试修复遮挡上方参照图标
                    // 添加小于y_limit的元素，其中y=0的元素仅保留一个
                    if (topItem.y < y_limit &&
                        // y_limit_single.every(item => item.label !== topItem.label) &&
                        y_limit_single.every(item => item.y !== 0))
                        y_limit_single.push(topItem);

                    return;
                }

                // ========== 成对匹配(经过前面跳过规则，剩下的必有匹配) =========

                // 核心逻辑：寻找配对项
                let pairItem = null;
                // 遍历匹配
                for (let i = 1; i < group.length; i++) {
                    let currentItem = group[i];
                    // 于topItem区分，跳过相同区域的数据
                    if ((topItem.y > y_limit && currentItem.y > y_limit) ||
                        (topItem.y < y_limit && currentItem.y < y_limit))
                        continue;

                    pairItem = currentItem;
                    break;
                }

                // 添加到结果（必须保留两项）
                // 经过上面处理，能确保数据都是成对，上面1个，下面1个
                result.push(topItem, pairItem);
            });

            //log(y_limit_single)
            // log(result)
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
                    let single = y_limit_single[i];
                    let single_b = B_data[i];
                    // 成对匹配
                    if (typeof single_b !== 'undefined')
                        result.push(single, single_b);
                }
            }


            //len = result.length;
            console.log(tag + "修正后长度为：" + result.length);
            // 检查数据长度是否满足处理逻辑要求 (4或6)
            if (result.length !== 4 && result.length !== 6) {
                //log(data)
                console.error('结果依旧不符合预期')
                //return new Array();
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

        // 1.3 创建分组A（y值较小的部分，按x升序排序）
        // 收集小于分界y的图标，且去重
        var groupA = Array.from(
            sortedByY.slice()
            .filter(item => item.y < y_limit && item.x > global.x_refer)
            .reduce((m, i) =>
                // 然后执行去重逻辑
                m.has(i.label) && m.get(i.label).prob >= i.prob ? m : m.set(i.label, i),
                new Map()
            ).values()
        ).sort((a, b) => a.x - b.x);

        //log(groupA)

        // 1.4 创建分组B（y值较大的部分，按prob倒序）
        // 收集大于分界y的图标，且去重
        var groupB = Array.from(
            sortedByY.slice()
            .filter(item => item.y > y_limit)
            .reduce((m, i) =>
                // 然后执行去重逻辑
                m.has(i.label) && m.get(i.label).prob >= i.prob ? m : m.set(i.label, i),
                new Map()
            ).values()
        ).sort((a, b) => b.prob - a.prob);

        //log(groupB)

        // 1.5 校验结果
        let glen = groupA.length + groupB.length;
        if (groupA.length < 2 || groupA.length > 3 ||
            glen < 4 || glen < sortedByY.length) {

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
            return new Array();
        }


        // ==================== 2. 建立快速查找索引 ====================
        // 2.1 使用Map结构存储分组B的元素（label作为key）
        var labelMap = new Map();

        // 2.2 遍历分组B，建立label到元素的映射关系
        groupB.forEach(item => {
            if (!labelMap.has(item.label)) {
                labelMap.set(item.label, []); // 初始化空数组
            }
            labelMap.get(item.label).push(item); // 添加到对应label的数组
        });

        // ==================== 3. 核心匹配阶段 ====================
        // 3.1 定义占位符对象（用于标记未匹配的位置）
        const placeholder = {
            label: "PLACEHOLDER"
        };
        var groupC = [];
        var usedItems = new Set(); // 新增：记录已使用的元素

        // 3.2 第一轮匹配：按分组A的顺序处理
        groupA.forEach(item => {
            let candidates = labelMap.get(item.label);

            // 检查候选元素是否存在且未被使用过
            if (candidates && candidates.length > 0 &&
                !usedItems.has(candidates[0])) {

                let matchedItem = candidates.shift();
                groupC.push(matchedItem);
                usedItems.add(matchedItem); // 标记为已使用
            } else {
                groupC.push(placeholder); // 无匹配则占位
            }
        });
        //log(groupC)
        var finalGroupC = groupC;

        // ==================== 4. 处理未匹配元素 ====================
        // 使用placeholder占位的数据，需再次替换成真实数据
        if (groupC.includes(placeholder)) {
            // 4.1 收集所有未被使用的groupB元素（按原始顺序）
            let unusedItems = groupB.filter(item => !usedItems.has(item));
            //log(unusedItems)

            // 4.2 替换占位符（按groupC原始顺序填充）
            let replaceIndex = 0;
            finalGroupC = groupC.map(item => {
                if (item === placeholder && replaceIndex < unusedItems.length) {
                    return unusedItems[replaceIndex++];
                }
                return item;
            });

            console.error('存在占位匹配，结果不确保正确！');
        }

        // ==================== 5. 最终结果处理 ====================

        // 5. 格式化 groupC 的结果
        var finalResult = finalGroupC.map(item => {
            let centerX = item.x + (item.width / 2);
            let centerY = item.y + (item.height / 2);
            return {
                centerX: Math.round(centerX),
                centerY: Math.round(centerY),
                prob: parseFloat(item.prob.toFixed(2)), // 保留两位小数
                label: item.label
            };
        });

        log(tag + '处理完毕，图标数量: ' + finalResult.length);

        return finalResult;

    } catch (error) {
        console.error(`结果处理: 排序或格式化过程中发生错误: ${error}`);
        return new Array();
    }
}

// 获取小图标与大图标分界y
function getYRefer(data) {
    // ------- 根据数据计算（但有局限性，如果上方参照图标全被遮挡，分界y将没有意义）
    // 获取y最小的一个有效元素(其中prob最大的)

    // y最小的有效元素
    var f = data.slice().filter(item => item.x > global.x_refer);
    var minYItem = f.reduce((a, b) => a.y < b.y ? a : b);
    //log(minYItem)
    var y = minYItem.y + minYItem.height;

    // 其中prob最大的有效元素
    var maxProb = f.filter(item => (item.y < y && item.y >= minYItem.y))
        .reduce((a, b) => a.prob > b.prob ? a : b);
    //log(maxProb)
    // 该元素的数据整合成分界y
    y = maxProb.y + maxProb.height;

    if (typeof global.y_refer === 'undefined' || !global.y_refer)
        return y;

    // -------- global.y_refer由前置程序根据控件获取，真实有效
    // global.y_refer表示截图上的文案“请在下图依次点击：”后面的小图标，与下方点击区域的分界，主要点击区域上边缘y
    //log(global.y_refer)
    return global.y_refer > y ? global.y_refer : -1;
}

/**
 * @description 对指定路径的图片执行 YOLO 检测并处理结果。
 * @param {string} imagePath - 要检测的图片文件的绝对路径。
 * @param {number} [confThreshold=DEFAULT_CONF_THRESHOLD] - 置信度阈值 (可选)。 
 * @returns {Array<object>|null} - 处理后的检测结果数组，或在失败时返回 null。
 */
function detectAndProcess(imagePath) {
    // 检查初始化状态
    if (!isYoloInitialized || !yoloInstance) {
        console.error(tag + "未初始化或初始化失败，尝试重新初始化...");
        try {
            // 尝试再次初始化
            initializeYolo();
        } catch (e) {}
        if (!isYoloInitialized || !yoloInstance)
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

    let img = null;
    try {
        // 读取图片
        console.log(`${tag}读取图片: ${imagePath}`);
        img = images.read(imagePath); // 使用函数参数 imagePath
        if (!img) {
            console.error(`检测处理: 读取图片失败: ${imagePath}`);
            return null;
        }

        // 执行检测
        console.log(`${tag}配置 (置信度阈值: ${confThreshold})`);
        console.log(`${tag}配置 (重叠率阈值: ${nmsThreshold})`);
        // 注意：yolo.detect 可能需要 Bitmap 对象，images.read 返回的是 Image 对象
        // 需要确认 yolo.detect 接受的参数类型，如果是 Bitmap，需要 img.bitmap
        let rawResults = yoloInstance.detect(img.bitmap, confThreshold, nmsThreshold, 640);
        console.log(`${tag}识别完成，数据数量: ${rawResults ? rawResults.length : 'N/A'}`);
        //log(rawResults)
        // 处理并返回结果
        return sortAndProcessResults(rawResults);

    } catch (error) {
        console.error(`${tag}识别过程中发生错误: ${error}`);
        return null;
    } finally {
        // 释放图片资源（如果需要）
        if (img) {
            img.recycle(); // 回收图片对象，防止内存泄漏
        }
    }
}

// --- 模块初始化 ---
// 在模块加载时执行一次初始化尝试
initializeYolo();

// --- 导出功能 ---
// 导出主函数
module.exports = detectAndProcess;