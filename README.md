# 知识卡 / 题卡加一

一款基于 uni-app + Vue 3 的知识卡片应用，主要用于整理知识点、按分类刷题、进行测验复习，并支持本地数据导入导出。
当前实际只测试并兼顾了 H5 和 App 端。

## 功能

- 卡片管理：新增、编辑、删除、查看卡片详情。
- 分类管理：分类创建、编辑、删除，以及未分类兜底处理。
- 卡片检索：支持按关键词快速搜索卡片内容。
- Markdown 录入与展示：正文内容使用 Markdown 编写并渲染。
- 测验复习：支持抽题测验、每日测验和结果统计。
- 批量操作：支持卡片批量分类转移和批量删除。
- 数据迁移：支持 JSON 导入和导出，便于备份与恢复。

## 技术栈

- Vue 3
- uni-app
- TypeScript
- Vite
- markdown-it

## 环境准备

建议使用 Node.js 18 及以上版本，并安装 npm。

```bash
npm install
```

## 运行与构建

常用命令如下，当前优先覆盖 H5 和 App 场景，其他平台命令可以直接查看 `package.json`。

```bash
# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# H5 构建
npm run build:h5

# 类型检查
npm run type-check
```

## 数据导入与导出

在“我的”页面可以进行 JSON 数据导入与导出。

- H5 端导出后会直接下载 JSON 文件。
- App 端导出会写入公共文档目录，并轮转保留 5 个备份槽位。
- 导入时会合并分类和卡片数据，保留现有数据并尽量复用同名分类。

另外，仓库还提供了一个 Word 转卡片脚本，可将 `.docx` 文档转换为初始卡片数据：

```bash
npm run import:word -- <path-to-docx-or-directory>
```

## 目录结构

```text
src/
  components/   通用组件
  composables/  组合式逻辑
  constants/    常量定义
  data/         初始数据
  pages/        页面
  services/     数据读写与导入导出
  types/        TypeScript 类型
  utils/        工具函数
scripts/        数据转换脚本
docs/           开发记录
```

## 说明

- 应用数据默认保存在本地 storage，导入导出用于迁移和备份。
- 当前项目的实际验证范围主要是 H5 和 App，其他端如果要发布建议先补充回归测试。
- App 打包相关配置位于 `src/manifest.json`。
- 页面路由与 TabBar 配置位于 `src/pages.json`。
