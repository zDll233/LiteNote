<!-- markdownlint-disable -->

<div align="center">

<img src="./src-tauri/icons/icon.png" width="120" alt="轻签图标">

# 轻签 LiteNote

轻量、可定制的本地待办桌面小部件<br>
基于 Tauri 2 + React 构建

[反馈问题](https://github.com/zDll233/LiteNote/issues) · [更新日志](docs/CHANGELOG.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![React 19](https://img.shields.io/badge/React-19-blue?logo=react)
![Tauri v2](https://img.shields.io/badge/Tauri-v2-%2324C8D8?logo=tauri)
![Rust Edition 2021](https://img.shields.io/badge/Rust-2021-%23000000?logo=rust)

</div>

---

## 为什么选择轻签

很多待办或笔记工具功能堆叠、体积偏大，不适合「贴在桌面、随手记一笔」。轻签专注 **本地待办** 小部件：无边框透明面板、托盘常驻、一键唤出，数据留在本机，适合日常清单与桌面常驻。

## 功能特点

- **本地待办** — SQLite 存储，支持完成/删除、置顶、重要程度颜色、截止时间、拖拽排序

- **循环待办** — 支持每天/每周/每月重复提醒，可自定义具体时间和目标日，到期自动进入下一轮

- **截止时间提醒** — 普通待办支持设置截止时间，到期前 15 分钟系统通知；循环待办按规则自动重复提醒

- **周日历** — 顶部周一到周日日历条，可切换周，点击筛选当日待办；红点标记有待办的日期，橙色点标记逾期任务

- **拖拽分配日期** — 拖拽待办到日历上的日期，自动设置截止时间

- **桌面小部件体验** — 透明毛玻璃风格、面板透明度可调、窗口置顶、关闭后隐藏到系统托盘

- **多主题切换** — 内置毛玻璃、深色、浅色三套主题，一键切换

- **快捷唤出** — 全局快捷键 `Ctrl+Shift+L`（macOS 为 `⌘+Shift+L`）显示/隐藏主窗口

- **内嵌设置** — 外观（透明度、时钟显示）、主题切换、语言（简体中文 / English / 跟随系统）、开机启动，全部在主窗口弹窗内完成

- **跨平台** — 支持 Windows（NSIS 安装包 + 绿色便携版）与 macOS（`.app` / `.dmg`）

<p align="center">
  <img src="docs/images/main.png" width="32%" alt="毛玻璃主窗口">&nbsp;
  <img src="docs/images/maoboli.png" width="32%" alt="毛玻璃效果">&nbsp;
  <img src="docs/images/qianse.png" width="32%" alt="浅色主题">&nbsp;
</p>

## 应用场景

- 桌面常驻的轻量待办清单
- 游戏、看视频时随手记待办
- 周期性提醒事项（每天喝水、每周例会、每月还款等）
- 有截止时间的事项提醒（本地通知）

## 下载安装

前往 [GitHub Releases](https://github.com/zDll233/LiteNote/releases) 下载最新版本。

> **Windows 用户注意：** 部分精简版/企业版 Windows 10 可能未安装 WebView2 运行时。安装包已内置引导下载，若仍有问题请手动安装 [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)。

## 从源码构建

### 环境要求

- [Node.js](https://nodejs.org/) 18+ 与 [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) stable
- [Tauri CLI 2](https://v2.tauri.app/)（通过 `pnpm tauri` 调用即可）

**Windows 额外需要：** Microsoft C++ Build Tools (MSVC) + Windows SDK

**macOS 额外需要：** Xcode Command Line Tools

### 步骤

```bash
git clone https://github.com/zDll233/LiteNote.git
cd LiteNote

pnpm install

# 开发模式（Tauri + 前端热更新）
pnpm tauri dev

# 仅前端预览（无 Tauri API）
pnpm dev
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=zDll233/LiteNote&type=Date&legend=top-left)](https://star-history.com/#zDll233/LiteNote&Date)

## 贡献

欢迎通过 [Issue](https://github.com/zDll233/LiteNote/issues) 反馈问题或提交 Pull Request。

## 许可证

本项目采用 [MIT](LICENSE) 许可证。
