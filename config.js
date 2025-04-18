/* 小米社区签到脚本配置文件 */
var config = {
    // 解锁配置
    解锁方式: 1,           // 解锁方式：1=图案解锁, 2=数字密码, 其他=上滑解锁
    锁屏数字密码: "000000", // 数字密码（解锁方式=2时生效）
    锁屏图案坐标: [         // 图案解锁坐标（解锁方式=1时生效）
        [805, 1479],      
        [537, 1479],    //每个中括号内代表一个点位的x和y坐标
        [274, 1747],    //添加或减少点位数量时，注意遵循原格式。
        [274, 2016]
    ],
    //如果无法在桌面点击小程序，可以尝试开启坐标点击
    坐标点击: 0,           // 是否开启坐标点击(1=开启, 0=关闭)
    x: 922,                // 社区小程序x坐标
    y: 1844,               // 社区小程序y坐标
    
    //（摸黑签到）当小程序布局分析失效时，需要按照坐标点击签到按钮。
    小程序签到坐标: 0, //1自定义（下面两个配置将生效），0程序自动适配
    button_x: 0,      //签到按钮x坐标
    button_y: 0,      //签到按钮y坐标
    
    // 功能开关（1 = 启用, 0 = 禁用）
    小程序签到: 1,
    成长值记录: 1,  
    浏览帖子: 1,
    加入圈子: 0,     
//    观看视频: 0,   
//    米粉节: 0,    
//    感恩季: 0,
    双旗舰: 1,
    拔萝卜: 1,
    
    跳过小程序打开验证: 1,   //小程序页面，布局分析失效的时候，可以改成1
    悬浮窗控制台: 1,   //会装逼的控制台，没用的功能又增加拉！
    
   //以下配置需要修改系统权限，运行结束会恢复原样：0为不做改动，大于0生效。
    静音级别: 1,  //选项范围：[0,1,2]，0不改动
                //1媒体音量静音：不涉及通知（铃声）、闹钟，是应用程序音量。
                //2通知音量静音：除了闹钟，其它全静音（包含媒体静音、手机铃声）
    结束震动: 500, //时长单位ms（毫秒），0不震动。
    运行亮度: 0,  //范围[0~2）填小数：0.01、0.8、1.52,作为百分比。
    
                               
};

module.exports = config; // 导出配置
