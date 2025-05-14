<div align="center">
<h1><a >小米社区自动化脚本</a></h1>

</div>

## **项目介绍**

* 此脚本是在线更新脚本，用于下载（更新）完整包。
* 全包只有2个文件，只有10KB，压缩后不到5KB。
* 支持的功能：
  * 免梯子，国内加速下载
  * 下载完整包
  * 需要构建的文件结果若不存在，会自动构建
  * 支持增量更新
  

--- 
## **正式开始：**  

### 脚本下载：

[在线加速下载版（推荐）](https://github.com/wengzhenquan/autojs6/releases/tag/online)  

### 在线下载包文件结构

```
/
├─ 【小社脚本】一键更新程序.js
└─ version  # 最小版本文件

```   

启动`【小社脚本】一键更新程序.js` 即可下载下面完整结构文件和目录

### 完整文件结构
```
/
├─ tmp/         # 临时工作目录
｜   └─ error/  # 错误截图记录
｜ 
├─ 【小社脚本】启动程序.js
├─ 【小社脚本】一键更新程序.js
├─ 【小社脚本】Run_x.x.x.js 
├─ config.js    # 配置文件
├─ version      # 版本信息
└─ README.md    # 说明文档

  ---- (yolov11本地签到模块) ----  
  
└─ yolov11/     
    ├─ yolov11_w.js # 本地YOLO脚本
    └─ model/       # 模型文件目录
        ├─ yzm.bin
        └─ yzm.param
Yolo-Plugins.apk  # Yolo插件(需安装）
```       



**AutoJs6**   
建议使用最新版   
（最低支持6.5.0，再低无法保证支持）   
[点击下载](https://github.com/SuperMonster003/AutoJs6/releases)  


--- 
**支持跳转小程序版 社区APP下载：**  

[网盘下载](https://www.123912.com/s/RYmDVv-bwUch)  
[备用地址](https://www.123865.com/s/RYmDVv-bwUch)   

