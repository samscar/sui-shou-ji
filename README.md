# 建设银行流水 → 随手记

将建设银行导出的账户流水文件转换为随手记可导入的 Excel 格式。基于 React + TypeScript，
**所有处理均在浏览器本地完成，密码与文件不会上传到任何服务器。**

## 日常使用：双击 `启动应用.command`

双击仓库根目录的 `启动应用.command` 即可。脚本会自动完成全部准备工作：

1. 查找 Node.js —— 本机的 node **不在系统默认 PATH 里**（只在 `~/.local/bin`），脚本内置候选路径自行探测
2. 依赖缺失时自动 `npm install`
3. 默认端口 5173 被占用时自动顺延（5174、5175…）
4. 启动本地服务，服务就绪后自动用浏览器打开

终端窗口会保持打开显示日志。**按 Ctrl + C 或直接关闭窗口即停止服务。**
改代码后浏览器会自动热更新，不需要重新构建。

> **首次双击时 macOS 可能拦截**，提示"来自身份不明的开发者"。
> 按住 Control 点该文件 → 选「打开」→ 在弹窗中点「打开」。之后双击就不再提示。

## 在没有 Node 的环境用：单文件 HTML

`web-app/dist/index.html` 是**自包含的单文件应用** —— JavaScript 与 CSS 全部内联，
无外部依赖，用 Chrome 双击打开即可。适用于发给别人，或本机没装 node 的场景。
它是一个文件，复制走就是整份应用，没有配套文件夹。

注意它是**构建产物**：改源码后需要重新生成：

```bash
cd web-app && npm run build:standalone
```

## 两种入口的数据不互通（重要）

自定义映射词条与交易修正记录保存在浏览器的 localStorage，而 localStorage **按 origin 隔离**：

| 入口 | origin | 数据存放处 |
| --- | --- | --- |
| `启动应用.command` | `http://localhost:5173` | 本地这笔数据 |
| `dist/index.html` | `file://` | **另一笔互不相干的数据** |

也就是说，在一边积累的修正，**不会出现在另一边**。要在两者之间搬运，用
「管理分类映射 → 导出我的修改」生成文件，再在目标入口「导入配置」载入。

同一入口内部则是持续累积的：同一设备同一个浏览器，越用越准。
**但清除浏览器数据会一并清除这些修改，建议定期导出备份。**

## 使用步骤

1. 从建设银行网上银行下载流水文件（`.zip` 压缩包）
2. 拖拽压缩包到页面区域，或点击选择文件
3. 在弹出的对话框中输入银行设置的解压密码
4. 系统自动解析 XLS 流水数据并按随手记格式分类
5. 表格仅显示待分类的记录（其他杂项 / 其他收入），点击「编辑」逐个修正
6. 点击「管理分类映射」添加新关键词，后续解析会自动应用
7. 点击「导出随手记账单 (.xlsx)」下载，导入随手记

## 开发

```bash
cd web-app
npm install
npm run dev          # 开发服务器，浏览器访问 http://localhost:5173/
```

### 两种构建形态

| 命令 | 产物 | 用途 |
| --- | --- | --- |
| `npm run build` | `dist-web/` 下多文件（HTML + JS + CSS） | 常规部署 / `npm run preview` |
| `npm run build:standalone` | `dist/index.html` 单文件，约 760 KB | 双击即用、分发给他人 |

`build:standalone` 通过 `vite-plugin-singlefile` 把 JS/CSS 内联进 HTML。之所以必须内联而不是仅改
相对路径：在 `file://` 协议下浏览器会对 ES module 按 opaque origin 施加 CORS 限制，外链的
`<script type="module">` 会被直接拒绝加载。

多文件构建特意输出到 `dist-web/`，避免误跑一次 `npm run build` 就把可双击的单文件产物覆盖掉。

## 目录结构

```
启动应用.command               双击启动（日常入口）
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
