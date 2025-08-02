// yolov11.js - YOLO 检测与结果处理模块
if (typeof config === 'undefined' || !config) {
    config = require("../config.js");
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
const confThreshold = config && config.YOLO置信度阈值 ?
    config.YOLO置信度阈值 : 0.01;
//重叠率阈值
const nmsThreshold = config && config.YOLO重叠率阈值 ?
    config.YOLO重叠率阈值 : 0.1;

const tag = "[YOLO]";
// --- 模块级变量 (用于存储初始化状态和实例) ---
let yoloInstance = null;
let isYoloInitialized = false;


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
        let YoloPlugin = plugins.load(YOLO_PLUGIN_NAME);
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
 * @returns {Array<object>|null} - 处理后的 B 组结果数组 [{centerX, centerY, prob, label}, ...]，或在失败/无效输入时返回 null。
 */
function sortAndProcessResults(data) {
    //log(data)
    // 输入验证
    if (!Array.isArray(data)) {
        console.error("结果处理: 输入数据不是数组。");
        return new Array();
    }
    let len = data.length;
    // 检查数据长度是否满足处理逻辑要求 (4或6)
    if (len !== 4 && len !== 6) {
        console.error("结果处理: 预期长度为 4 或 6");
        console.error("实际长度为：" + len);

        if (len < 4) {
            console.error("长度过小");
            console.error("请尝试：");

            if (nmsThreshold < 0.9) {
                console.error(' 1.提高[YOLO重叠率阈值]值');
                console.warn(`当前 (重叠率阈值: ${nmsThreshold})`);
            }
            if (confThreshold > 0.1) {
                console.error(' 2.降低[YOLO置信度阈值]值');
                console.warn(`当前 (置信度阈值: ${confThreshold})`);
            }

            return new Array();
        }

        if (len > 14) {
            console.error("长度过多，但能修正");
            console.error("建议尝试：");

            if (nmsThreshold > 0.1) {
                console.error(' 1.降低[YOLO重叠率阈值]值');
                console.warn(`当前 (重叠率阈值: ${nmsThreshold})`);
            }
            if (nmsThreshold < 0.6 && confThreshold < 0.7) {
                console.error(' 2.提升[YOLO置信度阈值]值');
                console.warn(`当前 (置信度阈值: ${confThreshold})`);
            }


        }
        console.log(tag + "开始尝试进行修正...");

        // 步骤1：分组
        const groups = {};
        data.forEach(item => {
            const label = item.label;
            groups[label] = groups[label] || [];
            groups[label].push(item);
        });

        // 步骤2：筛选结果
        const result = [];

        Object.keys(groups).forEach(label => {
            const group = groups[label];

            // 规则1：跳过全组低置信度
            if (group.every(item => item.prob < 0.16)) return;

            // 规则2：跳过单一元素组
            if (group.length < 2) return;

            // 规则3：按置信度降序排序
            const sortedGroup = group.slice()
                .sort((a, b) => b.prob - a.prob);
            const topItem = sortedGroup[0]; // 最高置信度项

            // 核心逻辑：寻找配对项
            let pairItem = null;
            let maxDiff = -1; // 记录最大Y差（初始值-1）

            // 遍历剩余项（从置信度第2高开始）
            for (let i = 1; i < sortedGroup.length; i++) {
                let currentItem = sortedGroup[i];
                let diff = Math.round(Math.abs(currentItem.y - topItem.y));

                // 策略1：优先匹配Y差>100的项
                if (diff > 100) {
                    pairItem = currentItem;
                    break; // 找到即停止
                }

                // 策略2：记录最大Y差项（用于无>100时）
                if (diff > maxDiff) {
                    maxDiff = diff;
                    pairItem = currentItem; // 更新候选
                }
            }

            // 添加到结果（必须保留两项）
            result.push(topItem, pairItem);
        });
        //log(groups)
        // log(result)


        len = result.length;
        console.log(tag + "修正后长度为：" + len);
        // 检查数据长度是否满足处理逻辑要求 (4或6)
        if (len !== 4 && len !== 6) {
            //log(data)
            console.error('结果依旧不符合预期')
            return new Array();
        }
        //替换数据
        data = result;
        console.warn("数据减少，结果不一定正确");
        sleep(500);

    }


    try {
        //log(data)
        // ==================== 1. 数据准备阶段 ====================
        // 1.1 按y坐标升序排序（浅拷贝避免修改原数组）
        const sortedByY = data.slice().sort((a, b) => a.y - b.y);

        // 1.2 计算分组边界位置（原数组的一半长度）
        //  const halfLen = Math.floor(sortedByY.length / 2);
        // 最小的Y
        const minY = sortedByY[0].y;

        // 1.3 创建分组A（y值较小的前半部分，按x升序排序）
        // var groupA = sortedByY.slice(0, halfLen).sort((a, b) => a.x - b.x);
        // 收集y与minY差小于80的数据，且去重
        const groupA = Array.from(
            sortedByY
            .filter(item => Math.abs(item.y - minY) < 80)
            .reduce((m, i) =>
                // 然后执行去重逻辑
                m.has(i.label) && m.get(i.label).prob >= i.prob ? m : m.set(i.label, i),
                new Map()
            ).values()
        ).sort((a, b) => a.x - b.x);

        //log(groupA)

        // 1.4 创建分组B（y值较大的后半部分，按prob倒序）
        //var groupB = sortedByY.slice(halfLen).sort((a, b) => b.prob - a.prob);
        // 收集y与minY差大于80的数据，且去重
        const groupB = Array.from(
            sortedByY
            .filter(item => Math.abs(item.y - minY) > 80)
            .reduce((m, i) =>
                // 然后执行去重逻辑
                m.has(i.label) && m.get(i.label).prob >= i.prob ? m : m.set(i.label, i),
                new Map()
            ).values()
        ).sort((a, b) => b.prob - a.prob);

        //log(groupB)
        if (groupA.length + groupB.length < sortedByY) {
            console.warn('发现重复数据！');
            log(tag + '去重后数据长度：' + (groupA.length + groupB.length));
            sleep(500);
        }

        if (groupA.length < 2 || groupB.length < groupA.length) {
            console.error('结果解析错误！');
            console.warn('上方指标数据长度：' + groupA.length)
            console.warn('下方目标数据长度：' + groupB.length)
            console.error('可能验证码区域有遮挡');
            console.error('请检查tmp/pic.png验证码截图');
            console.error("若无遮挡，请尝试：");

            if (nmsThreshold < 0.9) {
                console.error(' 1.提高[YOLO重叠率阈值]值');
                console.warn(`当前 (重叠率阈值: ${nmsThreshold})`);
            }
            if (confThreshold > 0.1) {
                console.error(' 2.降低[YOLO置信度阈值]值');
                console.warn(`当前 (置信度阈值: ${confThreshold})`);
            }
            return new Array();
        }


        // ==================== 2. 建立快速查找索引 ====================
        // 2.1 使用Map结构存储分组B的元素（label作为key）
        const labelMap = new Map();

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
        const groupC = [];
        const usedItems = new Set(); // 新增：记录已使用的元素

        // 3.2 第一轮匹配：按分组A的顺序处理
        groupA.forEach(item => {
            const candidates = labelMap.get(item.label);

            // 检查候选元素是否存在且未被使用过
            if (candidates && candidates.length > 0 && !usedItems.has(candidates[0])) {
                const matchedItem = candidates.shift();
                groupC.push(matchedItem);
                usedItems.add(matchedItem); // 标记为已使用
            } else {
                groupC.push(placeholder); // 无匹配则占位
            }
        });

        // ==================== 4. 处理未匹配元素 ====================
        // 4.1 收集所有未被使用的groupB元素（按原始顺序）
        const unusedItems = groupB.filter(item => !usedItems.has(item));

        // ==================== 5. 最终结果处理 ====================
        // 5.1 替换占位符（按groupC原始顺序填充）
        let replaceIndex = 0;
        const finalGroupC = groupC.map(item => {
            if (item === placeholder && replaceIndex < unusedItems.length) {
                return unusedItems[replaceIndex++];
            }
            return item;
        });

        // 6. 格式化 groupC 的结果
        let finalResult = finalGroupC.map(item => {
            let centerX = item.x + (item.width / 2);
            let centerY = item.y + (item.height / 2);
            return {
                centerX: Math.round(centerX),
                centerY: Math.round(centerY),
                prob: parseFloat(item.prob.toFixed(2)), // 保留两位小数
                label: item.label
            };
        });

        return finalResult;

    } catch (error) {
        console.error(`结果处理: 排序或格式化过程中发生错误: ${error}`);
        return new Array();
    }
}

// 检查数组中所有元素的y值差距是否全小于，是则返回y
function checkYDiffLessThan(arr, max) {
    // 提取所有y值
    const yValues = arr.map(item => item.y);
    // 元素数量≤1时，默认不满足
    if (yValues.length <= 1) return false;
    // 计算最大y值和最小y值的差值
    const maxY = Math.max.apply(null, yValues);
    const minY = Math.min.apply(null, yValues);
    // 返回差值是否小于60
    return (maxY - minY < max) ? (maxY + minY) / 2 : false;
};


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
        console.log(`${tag}检测 (置信度阈值: ${confThreshold})`);
        console.log(`${tag}检测 (重叠率阈值: ${nmsThreshold})`);
        // 注意：yolo.detect 可能需要 Bitmap 对象，images.read 返回的是 Image 对象
        // 需要确认 yolo.detect 接受的参数类型，如果是 Bitmap，需要 img.bitmap
        let rawResults = yoloInstance.detect(img.bitmap, confThreshold, nmsThreshold, 640);
        console.log(`${tag}检测完成，结果数量: ${rawResults ? rawResults.length : 'N/A'}`);
        //log(rawResults)
        // 处理并返回结果
        return sortAndProcessResults(rawResults);

    } catch (error) {
        console.error(`${tag}检测过程中发生错误: ${error}`);
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