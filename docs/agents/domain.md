# 领域文档

工程类 skill 在探索本仓库代码库时，应当如何消费这里的领域文档。

## 探索前先读这些

- 仓库根目录的 **`CONTEXT.md`**，或
- 若根目录存在 **`CONTEXT-MAP.md`**：它指向每个上下文各自的 `CONTEXT.md`，读取与当前议题相关的那些。
- **`docs/adr/`**：阅读与即将改动区域相关的 ADR。在多上下文仓库中，还要检查 `src/<context>/docs/adr/` 里上下文范围内的决策记录。

如果这些文件不存在，**静默跳过**：不要提示缺失，也不要主动建议创建。`/domain-modeling` skill（经由 `/grill-with-docs` 与 `/improve-codebase-architecture` 触发）会在术语或决策真正被确定时惰性创建它们。

## 文件结构

单上下文仓库（大多数仓库）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文仓库（根目录存在 `CONTEXT-MAP.md`）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 上下文级决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用术语表中的词汇

当输出中需要命名某个领域概念时（issue 标题、重构提案、假设、测试名），使用 `CONTEXT.md` 中定义的说法，不要漂移到术语表明确排除的同义词。

如果所需的术语尚未进入术语表，这是一个信号：要么你在发明项目并不使用的语言（应当重新考虑），要么确实存在缺口（记下来交给 `/domain-modeling`）。

## ADR 冲突必须显式指出

如果输出内容与既有 ADR 相矛盾，要明确指出而不是静默覆盖：

> _与 ADR-0007（event-sourced orders）冲突，但值得重新讨论，因为……_
