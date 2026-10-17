# Issue tracker：本地 markdown

本仓库的 issue 与 spec 以 markdown 文件的形式存放在 `.scratch/` 目录下，不依赖任何远程追踪器或 CLI 工具。

## 组织约定

- 一个功能一个目录：`.scratch/<feature-slug>/`
- 规格文件为 `.scratch/<feature-slug>/spec.md`
- 实施工单一个文件一个工单，位于 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号；**不要**把所有工单合并成单个 tickets 文件
- 分诊状态记录为每个工单文件靠顶部的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 评论与讨论历史追加到文件底部，置于 `## Comments` 标题之下

## 当 skill 说「发布到 issue 追踪器」时

在 `.scratch/<feature-slug>/` 下新建文件（目录不存在则一并创建）。

## 当 skill 说「获取相关工单」时

读取对应路径的文件。用户通常直接给出路径或工单编号。

## Wayfinding 相关操作

供 `/wayfinder` 使用。**地图（map）**是一个文件，其下每个工单对应一个**子文件**。

- **地图**：`.scratch/<effort>/map.md`，正文承载 Notes / Decisions-so-far / Fog 三部分。
- **子工单**：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 开始编号，正文写待解问题。`Type:` 行记录工单类型（`research`/`prototype`/`grilling`/`task`）；`Status:` 行记录 `claimed`/`resolved`。
- **阻塞关系**：靠顶部的 `Blocked by: NN, NN` 行表示。当它列出的所有文件都为 `resolved` 时，该工单解除阻塞。
- **前沿查询（frontier）**：扫描 `.scratch/<effort>/issues/`，筛出未完成、未阻塞、未被认领的文件；按编号取第一个。
- **认领**：把 `Status:` 置为 `claimed` 并保存，然后才开始动工。
- **收尾**：在 `## Answer` 标题下追加答案，把 `Status:` 置为 `resolved`，最后把上下文指针（gist + 链接）追加到 `map.md` 的 Decisions-so-far。
