# FocusDock

FocusDock 是一个本地优先的学习时间管理 Demo，把每日计划、实际计时、应用使用、学习统计、DDL 提醒、每日笔记和奖励积分放在同一个工作界面中。

在线 Demo：<https://champshi.github.io/focusdock/>

## 当前 Demo 包含

- 今日任务、计划开始时间与 DDL
- 正计时器，以及计划时间、实际时间和任务完成度的独立调整
- 菜单栏状态的高保真界面预览
- 按天、周、月切换的模块用时柱状图、时间分布饼图和趋势图
- 应用使用分类、用时调整及当前页面前台采样
- DDL 应用内提醒、浏览器系统通知和完成任务后的鼓励弹窗
- 实时任务完成度与时间目标达成率
- 积分获取、反刷分限制、积分账本和奖品兑换
- Markdown 风格每日笔记、任务关联和自动保存
- JSON 数据导入、导出与 Demo 重置
- LocalStorage 本地持久化、离线缓存与 PWA 安装信息
- WebMCP 渐进增强：支持读取计划、创建任务、开始计时和完成任务

## 本地运行

这是一个无构建依赖的静态应用。不要直接双击 HTML；请从仓库根目录启动任意静态服务器，例如：

```bash
python3 -m http.server 4173 --directory dist
```

然后打开 <http://127.0.0.1:4173/>。

## Demo 边界

浏览器出于安全与隐私原因，不能读取其他 macOS 应用的真实使用时长。因此 Web Demo 使用可编辑示例数据，并只能采样 FocusDock 页面处于前台的时间。原生 macOS 版本计划通过 `NSWorkspace` 记录前台应用切换；浏览器、文档或窗口内容不会被读取。

浏览器通知仅在用户授权且浏览器允许时生效；稳定的后台 DDL 通知需要在原生版中使用系统通知框架。

详细合理性分析见 [docs/PRODUCT_ANALYSIS.md](docs/PRODUCT_ANALYSIS.md)，原生实现路线见 [docs/NATIVE_ROADMAP.md](docs/NATIVE_ROADMAP.md)。

## 数据与隐私

Demo 的任务、笔记、应用分类和积分都保存在当前浏览器的 LocalStorage 中，不上传到服务器。可以在设置中导出 JSON 备份或恢复初始数据。
