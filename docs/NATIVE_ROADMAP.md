# 原生 macOS 路线

Web Demo 用于确认功能结构、指标口径和交互。正式版建议使用 Swift、SwiftUI 和 SwiftData。

## 建议模块

```text
FocusDockApp
├── MenuBarExtra
│   ├── 当前任务与计时
│   ├── 下一项计划
│   └── 快速完成 / 推迟 / 记笔记
├── Today
├── Analytics
├── AppActivity
├── Rewards
├── DailyNotes
└── Integrations
    ├── Reminders / Calendar
    ├── Shortcuts / App Intents
    └── CloudKit
```

## 核心数据实体

- `Task`：标题、模块、计划开始、DDL、预计分钟、手动完成度、状态、关联笔记。
- `FocusSession`：任务、开始、结束、有效秒数、手动校正值。
- `AppActivitySlice`：Bundle ID、显示名、开始、结束、分类和关联专注会话。
- `DailyNote`：日期、Markdown 内容。
- `PointLedgerEntry`：来源、分值、规则版本、时间与关联任务。
- `Reward` / `Redemption`：奖品、成本和兑换记录。
- `Adjustment`：字段、旧值、新值、修改时间和原因。

## 平台能力

- 菜单栏：使用 SwiftUI `MenuBarExtra` 的 window 样式。
- 本地数据：SwiftData；同步稳定后再启用 CloudKit。
- 应用活动：通过 `NSWorkspace.frontmostApplication` 和应用激活通知记录前台应用切换，只保存 Bundle ID 与时间段。
- 通知：使用 UserNotifications 预排 DDL 提醒；任务变化时取消并重建对应通知。
- 日历与提醒事项：使用 EventKit，并将权限请求推迟到用户主动启用集成时。
- 快捷操作：使用 App Intents / Shortcuts 支持“添加任务”“开始专注”和“记录笔记”。

## 隐私边界

默认只记录应用级时长，不读取窗口标题、网页 URL、文件名、屏幕内容和键盘输入。浏览器统一视为“需结合当前专注任务判断”，允许用户设置长期分类或本次会话分类。

如果未来改用 Screen Time / Family Controls 的更细粒度数据，必须重新评估 entitlement、地区可用性、用户授权和 App Store 审核要求，不能把它当作第一版的稳定依赖。

## 从 Demo 迁移

1. 冻结 `Task`、`FocusSession`、`PointLedgerEntry` 的字段定义。
2. 将 Web Demo 的 LocalStorage JSON 作为一次性导入格式。
3. 先复刻“今天”和菜单栏计时，再迁移统计、笔记与奖励。
4. 对跨午夜计时、睡眠唤醒、时区变化、任务重复完成和同步冲突做自动化测试。
5. 完成通知、应用活动和数据恢复测试后，再作为常驻应用使用。
