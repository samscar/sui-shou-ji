# 建设银行流水 → 随手记

将建设银行导出的账户流水文件转换为随手记可导入的 Excel 格式。基于 React + TypeScript，
**所有处理均在浏览器本地完成，密码与文件不会上传到任何服务器。**

## 日常使用：双击即可

`web-app/dist/index.html` 是**自包含的单文件应用**——JavaScript 与 CSS 全部内联在 HTML 里，
没有任何外部依赖。用 Chrome 直接双击打开即可，不需要命令行、不需要 Node 环境、不需要联网。

```
web-app/dist/index.html
```

把它复制到桌面或任意目录都能用（复制单个文件即可，没有配套文件夹）。

### 使用步骤

1. 从建设银行网上银行下载流水文件（`.zip` 压缩包）
2. 拖拽压缩包到页面区域，或点击选择文件
3. 在弹出的对话框中输入银行设置的解压密码
4. 系统自动解析 XLS 流水数据并按随手记格式分类
5. 表格仅显示待分类的记录（其他杂项 / 其他收入），点击「编辑」逐个修正
6. 点击「管理分类映射」添加新关键词，后续解析会自动应用
7. 点击「导出随手记账单 (.xlsx)」下载，导入随手记

### 你的修改保存在哪

自定义映射词条与交易修正记录保存在**本浏览器的 localStorage** 中，不会写入 HTML 文件本身。
由此带来两点需要留意：

- **同一台设备、同一个浏览器**可以持续累积修正，越用越准
- **换设备不会自动同步**。需要在旧设备「管理分类映射 → 导出我的修改」，
  再在新设备「导入配置」载入该文件

> 注意：清除浏览器数据会一并清除这些修改，建议定期导出备份。

## 开发

```bash
cd web-app
npm install
npm run dev          # 开发服务器，浏览器访问 http://localhost:5173/
```

### 两种构建形态

| 命令 | 产物 | 用途 |
| --- | --- | --- |
| `npm run build` | `dist/` 下多文件（HTML + JS + CSS） | 常规部署 / `npm run preview` |
| `npm run build:standalone` | `dist/index.html` 单文件，约 760 KB | 双击即用、分发给他人 |

`build:standalone` 通过 `vite-plugin-singlefile` 把 JS/CSS 内联进 HTML。之所以必须内联而不是仅改
相对路径：在 `file://` 协议下浏览器会对 ES module 按 opaque origin 施加 CORS 限制，外链的
`<script type="module">` 会被直接拒绝加载。

## 目录结构

```
web-app/
├── index.html                 开发入口
├── vite.config.ts             两种构建形态的配置
├── src/
│   ├── App.tsx                界面与主流程
│   ├── parser.ts              银行流水解析与分类
│   ├── configManager.ts       用户修改的读写与合并
│   ├── excel.ts               导出随手记账单
│   └── config/categories.json 内置分类表
└── dist/index.html            单文件产物（已纳入版本控制）
```

术语定义见 [`CONTEXT.md`](./CONTEXT.md)，架构决策见 [`docs/adr/`](./docs/adr/)。
