# 建设银行流水 → 随手记

将建设银行导出的账户流水文件转换为随手记可导入的 Excel 格式。

## Web 应用（推荐）

一个基于 React + TypeScript 的本地 Web 应用，拖拽即可完成转换。

### 启动服务

```bash
cd web-app
npm install
npm run dev
```

服务启动后访问 `http://localhost:5173/`。

### 使用方式

1. 从建设银行网上银行下载流水文件（.zip 压缩包）
2. 输入压缩包解压密码
3. 将压缩包拖拽到页面区域，或点击选择文件
4. 系统自动解析 XLS 流水数据，按随手记格式分类
5. 点击「导出随手记账单」下载 Excel 文件，导入随手记

> 所有处理均在浏览器本地完成，密码和文件不会上传到任何服务器。

---

## Python 脚本

原始命令行版本，需要 Python 环境。

### 环境准备

```bash
pip install -r requirements.txt
```

### 使用方式

```bash
source venv/bin/activate  # 激活虚拟环境（可选）
python3 convert_ccb_to_sui.py  # 运行脚本，按提示输入文件路径
deactivate  # 使用完毕后退出虚拟环境（可选）
```
