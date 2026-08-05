import * as XLSX from 'xlsx';
import {
  TRADE_TYPE_EXPEND,
  TRADE_TYPE_INCOME,
  TRADE_TYPE_TRANSFER,
  ACCOUNT_CASH,
  ACCOUNT_BANK,
  ACCOUNT_WEALTH_MANAGEMENT,
  ExpenseRecord,
  IncomeRecord,
  TransferRecord,
  CCBRow,
} from './types';

// ---- 分类配置（从 Python 脚本完整迁移） ----

const categoryExpend: Record<string, [string, string]> = {
  // 行车交通
  '石油': ['行车交通', '加油'],
  '石化': ['行车交通', '加油'],
  '停车': ['行车交通', '停车'],
  '深圳通': ['行车交通', '地铁'],
  '滴滴出行': ['行车交通', '打车'],
  // 购物消费
  '天猫': ['购物消费', '日常购物'],
  '淘宝': ['购物消费', '日常购物'],
  '京东': ['购物消费', '日常购物'],
  '盒马': ['购物消费', '日常购物'],
  '快团团': ['购物消费', '日常购物'],
  '超市': ['购物消费', '日常购物'],
  '便利店': ['购物消费', '日常购物'],
  '华润万家': ['购物消费', '日常购物'],
  '新一佳': ['购物消费', '日常购物'],
  '沃尔玛': ['购物消费', '日常购物'],
  '钱大妈': ['购物消费', '日常购物'],
  '土地公': ['购物消费', '日常购物'],
  '致远创想科技': ['购物消费', '美妆护肤'],
  '微信支付-微信转账': ['购物消费', '日常购物'],
  '支付宝-还款': ['购物消费', '日常购物'],
  // 出差旅游
  '中国铁路网络有限公司': ['出差旅游', '交通费'],
  '携程旅行网': ['出差旅游', '其他消费'],
  '中铁网络': ['出差旅游', '交通费'],
  // 食品酒水
  '美团': ['食品酒水', '日常餐饮'],
  '北京三快在线科技有限公司': ['食品酒水', '日常餐饮'],
  '餐饮': ['食品酒水', '日常餐饮'],
  '美食': ['食品酒水', '日常餐饮'],
  '用膳团': ['食品酒水', '日常餐饮'],
  '三津汤包': ['食品酒水', '日常餐饮'],
  '合合乐团餐': ['食品酒水', '日常餐饮'],
  '美餐': ['食品酒水', '日常餐饮'],
  '家企乐': ['食品酒水', '日常餐饮'],
  '魔盒CITYBOX': ['食品酒水', '日常餐饮'],
  // 居家生活
  '物业': ['居家生活', '物业费'],
  '水务集团': ['居家生活', '水费'],
  '深圳燃气': ['居家生活', '燃气费'],
  '深圳供电局': ['居家生活', '电费'],
  '淘天物流': ['居家生活', '快递费'],
  // 医疗教育
  '药房': ['医疗教育', '药品费'],
  // 金融保险
  '基金': ['金融保险', '投资理财'],
  '房贷': ['金融保险', '房贷'],
  // 交流通信
  '广东移动': ['交流通信', '手机话费'],
  '中国电信': ['交流通信', '手机话费'],
};

const categoryIncome: Record<string, [string, string]> = {
  '退货': ['其他收入', '退款'],
  '工资': ['职业收入', '工资收入'],
};

const wealthManagementKeywords = new Set(['基金', '理财']);

// ---- 核心解析函数 ----

function isWealthManagementOperation(remark: string): boolean {
  const lower = remark.toLowerCase();
  for (const keyword of wealthManagementKeywords) {
    if (lower.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function getTradeType(amount: number, abstract: string, fullRemark: string): number {
  const isWM = isWealthManagementOperation(fullRemark);
  if (amount < 0 && !isWM) {
    return TRADE_TYPE_EXPEND;
  } else if (isWM || abstract === '跨行转出') {
    return TRADE_TYPE_TRANSFER;
  } else {
    return TRADE_TYPE_INCOME;
  }
}

function getCategory(remark: string, tradeType: number): [string, string] {
  const lower = remark.toLowerCase();
  const config = tradeType === TRADE_TYPE_INCOME ? categoryIncome : categoryExpend;

  // 优先匹配关键词
  for (const [keyword, category] of Object.entries(config)) {
    if (lower.includes(keyword.toLowerCase())) {
      return category;
    }
  }

  // 默认分类
  if (tradeType === TRADE_TYPE_EXPEND) {
    return ['其他杂项', '其他支出'];
  } else {
    return ['其他收入', '收入'];
  }
}

function getTransferOutAccount(amount: number, isWM: boolean): string {
  if (amount < 0) {
    return ACCOUNT_BANK;
  } else if (isWM) {
    return ACCOUNT_WEALTH_MANAGEMENT;
  } else {
    return ACCOUNT_CASH;
  }
}

function getTransferInAccount(amount: number, isWM: boolean): string {
  if (amount > 0) {
    if (isWM) {
      return ACCOUNT_BANK;
    } else {
      return ACCOUNT_CASH;
    }
  } else {
    if (isWM) {
      return ACCOUNT_WEALTH_MANAGEMENT;
    } else {
      return ACCOUNT_CASH;
    }
  }
}

/**
 * 解析 CCB CSV 行数据，进行分类转换
 */
export function parseCCBData(rows: CCBRow[]): {
  expenses: ExpenseRecord[];
  incomes: IncomeRecord[];
  transfers: TransferRecord[];
} {
  const expenses: ExpenseRecord[] = [];
  const incomes: IncomeRecord[] = [];
  const transfers: TransferRecord[] = [];

  for (const row of rows) {
    // 处理金额（去掉逗号分隔符）
    const amountRaw = String(row['交易金额'] || '0').replace(/,/g, '');
    const amount = parseFloat(amountRaw);
    if (isNaN(amount)) continue;

    // 日期处理 - CCB CSV 可能有多种日期格式
    let transDate = String(row['交易日期'] || '').trim();
    // 尝试标准化日期格式为 YYYY-MM-DD HH:mm:ss
    transDate = normalizeDate(transDate);

    // 生成完整备注
    const fullRemark = `${row['摘要'] || ''} ${row['交易地点附言'] || ''}`.trim();
    const abstract = String(row['摘要'] || '').trim();

    // 解析对方账户信息
    const counterpart = String(row['对方账号与户名'] || '').split('/');
    const counterpartName = counterpart.length > 1 ? counterpart[1] : '';

    const isWM = isWealthManagementOperation(fullRemark);
    const tradeType = getTradeType(amount, abstract, fullRemark);

    if (tradeType === TRADE_TYPE_EXPEND) {
      const [mainCat, subCat] = getCategory(fullRemark, TRADE_TYPE_EXPEND);
      // 也检查对方户名
      const [mainCatByName, subCatByName] = counterpartName
        ? getCategory(counterpartName, TRADE_TYPE_EXPEND)
        : [mainCat, subCat];

      expenses.push({
        交易类型: '支出',
        日期: transDate,
        分类: mainCatByName !== '其他杂项' ? mainCatByName : mainCat,
        子分类: mainCatByName !== '其他杂项' ? subCatByName : subCat,
        支出账户: ACCOUNT_BANK,
        金额: Math.abs(amount),
        商家: counterSearch(fullRemark),
        备注: fullRemark,
      });
    } else if (tradeType === TRADE_TYPE_TRANSFER) {
      transfers.push({
        交易类型: '转账',
        日期: transDate,
        转出账户: getTransferOutAccount(amount, isWM),
        转入账户: getTransferInAccount(amount, isWM),
        金额: Math.abs(amount),
        备注: fullRemark,
      });
    } else {
      const [mainCat, subCat] = getCategory(fullRemark, TRADE_TYPE_INCOME);
      const [mainCatByName, subCatByName] = counterpartName
        ? getCategory(counterpartName, TRADE_TYPE_INCOME)
        : [mainCat, subCat];

      incomes.push({
        交易类型: '收入',
        日期: transDate,
        分类: mainCatByName !== '其他收入' ? mainCatByName : mainCat,
        子分类: mainCatByName !== '其他收入' ? subCatByName : subCat,
        收入账户: ACCOUNT_BANK,
        金额: amount,
        备注: fullRemark,
      });
    }
  }

  return { expenses, incomes, transfers };
}

function normalizeDate(dateStr: string): string {
  // 处理常见日期格式
  // 2024-01-15 00:00:00, 2024/01/15, 20240115, etc.
  const cleaned = dateStr.replace(/[年月]/g, '-').replace(/[日]/g, '').trim();

  // 如果已经是 YYYY-MM-DD HH:mm:ss 格式
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // 尝试解析日期
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    const h = String(parsed.getHours()).padStart(2, '0');
    const min = String(parsed.getMinutes()).padStart(2, '0');
    const s = String(parsed.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }

  return cleaned;
}

/** 从备注中提取商家/平台名称 */
function counterSearch(remark: string): string {
  const keywords = [
    '美团', '淘宝', '天猫', '京东', '盒马', '滴滴出行',
    '携程旅行网', '快团团', '华润万家', '沃尔玛',
    '钱大妈', '深圳通', '支付宝', '微信支付',
  ];
  for (const kw of keywords) {
    if (remark.includes(kw)) return kw;
  }
  return '其他';
}

/**
 * 解析 CSV 文本内容为 CCB 行数据
 * 兼容不同编码和表头格式的 CCB 流水
 */
export function parseCCBCSV(csvText: string): CCBRow[] {
  // 移除 BOM
  let text = csvText.replace(/^\uFEFF/, '');

  // 尝试移除 CCB CSV 文件头几行（可能的标题行等）
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');

  // 查找表头行
  let headerIndex = lines.findIndex(
    (line) =>
      line.includes('交易日期') &&
      (line.includes('交易金额') || line.includes('摘要'))
  );

  if (headerIndex < 0) {
    headerIndex = lines.findIndex(
      (line) =>
        line.includes('摘要') && line.includes('对方')
    );
  }

  if (headerIndex < 0) {
    headerIndex = 0; // fallback - use first line as header
  }

  const headerLine = lines[headerIndex];
  const headers = parseCSVLine(headerLine);

  // 列名映射
  const colMap: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].replace(/["""]/g, '').trim();
    colMap[h] = String(i);
  }

  // 映射所有可能的列名变体
  function getCol(key: string): number | undefined {
    const idx = colMap[key];
    return idx !== undefined ? parseInt(idx) : undefined;
  }

  const idxIdx = getCol('序号') ?? getCol('编号');
  const idxAbstract = getCol('摘要');
  const idxCurrency = getCol('币别') ?? getCol('货币');
  const idxCashFlag = getCol('钞汇');
  const idxDate = getCol('交易日期');
  const idxAmount = getCol('交易金额') ?? getCol('发生额') ?? getCol('金额');
  const idxBalance = getCol('账户余额') ?? getCol('余额');
  const idxRemark = getCol('交易地点/附言') ?? getCol('交易地点附言') ?? getCol('附言') ?? getCol('摘要附言') ?? getCol('交易地点');
  const idxCounterpart = getCol('对方账号与户名') ?? getCol('对方户名') ?? getCol('对方');

  if (idxDate === undefined || idxAmount === undefined) {
    throw new Error(
      '无法识别 CSV 列名。需要包含"交易日期"和"交易金额"列。文件表头: ' +
        headers.join(', ')
    );
  }

  const rows: CCBRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

    // 确保 values 足够长
    const maxCol = Math.max(
      idxIdx ?? -1,
      idxAbstract ?? -1,
      idxCurrency ?? -1,
      idxCashFlag ?? -1,
      idxDate,
      idxAmount,
      idxBalance ?? -1,
      idxRemark ?? -1,
      idxCounterpart ?? -1
    );

    // 如果 values 不够长，填充空字符串（解决导出 CSV 不包含空值的问题）
    while (values.length <= maxCol) {
      values.push('');
    }

    rows.push({
      序号: idxIdx !== undefined ? values[idxIdx] : '',
      摘要: idxAbstract !== undefined ? values[idxAbstract] : '',
      币别: idxCurrency !== undefined ? values[idxCurrency] : '',
      钞汇: idxCashFlag !== undefined ? values[idxCashFlag] : '',
      交易日期: values[idxDate] || '',
      交易金额: values[idxAmount] || '',
      账户余额: idxBalance !== undefined ? values[idxBalance] : '',
      交易地点附言: idxRemark !== undefined ? values[idxRemark] : '',
      对方账号与户名: idxCounterpart !== undefined ? values[idxCounterpart] : '',
    });
  }

  return rows;
}

/**
 * 解析 XLS 二进制数据为 CCB 行数据
 * 使用 SheetJS (xlsx) 库读取 .xls 格式
 */
export function parseCCBXLS(data: ArrayBuffer): CCBRow[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('工作簿中没有工作表');
  }

  const sheet = workbook.Sheets[sheetName];
  const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // 查找表头行（包含"序号"和"摘要"等列名）
  let headerIndex = -1;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i] || [];
    const rowStr = row.map(String);
    if (
      rowStr.some((v) => v.includes('序号')) &&
      rowStr.some((v) => v.includes('摘要')) &&
      rowStr.some((v) => v.includes('交易日期'))
    ) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) {
    throw new Error('无法找到表头行（需要包含"序号"、"摘要"、"交易日期"等列）');
  }

  const headers: string[] = (allRows[headerIndex] || []).map(String);

  // 列名映射
  const colMap: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].replace(/["""]/g, '').trim();
    if (h) colMap[h] = i;
  }

  function getCol(...keys: string[]): number | undefined {
    for (const key of keys) {
      if (key in colMap) return colMap[key];
    }
    return undefined;
  }

  const idxIdx = getCol('序号');
  const idxAbstract = getCol('摘要');
  const idxCurrency = getCol('币别');
  const idxCashFlag = getCol('钞汇');
  const idxDate = getCol('交易日期');
  const idxAmount = getCol('交易金额');
  const idxBalance = getCol('账户余额');
  const idxRemark = getCol('交易地点/附言', '交易地点附言', '附言', '交易地点');
  const idxCounterpart = getCol('对方账号与户名', '对方户名', '对方');

  if (idxDate === undefined || idxAmount === undefined) {
    throw new Error(
      '无法识别表头列名。需要包含"交易日期"和"交易金额"列。表头: ' +
        headers.join(', ')
    );
  }

  const rows: CCBRow[] = [];
  for (let i = headerIndex + 1; i < allRows.length; i++) {
    const rawRow = allRows[i] || [];
    // 跳过空行
    if (rawRow.length === 0 || rawRow.every((v: any) => v === undefined || v === null || String(v).trim() === '')) {
      continue;
    }

    // 格式化日期：xlsx 读取时日期可能是 Date 对象，也可能是数字
    let dateStr = '';
    const dateCell = rawRow[idxDate];
    if (dateCell instanceof Date) {
      const y = dateCell.getFullYear();
      const m = String(dateCell.getMonth() + 1).padStart(2, '0');
      const d = String(dateCell.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d} 00:00:00`;
    } else {
      dateStr = String(dateCell ?? '');
    }

    // 格式化金额：数字转字符串，保留原样
    let amountStr = '';
    const amountCell = rawRow[idxAmount];
    if (typeof amountCell === 'number') {
      amountStr = String(amountCell);
    } else {
      amountStr = String(amountCell ?? '').replace(/,/g, '');
    }

    // 格式化余额
    let balanceStr = '';
    const balanceCell = idxBalance !== undefined ? rawRow[idxBalance] : undefined;
    if (typeof balanceCell === 'number') {
      balanceStr = String(balanceCell);
    } else if (balanceCell !== undefined && balanceCell !== null) {
      balanceStr = String(balanceCell).replace(/,/g, '');
    }

    rows.push({
      序号: idxIdx !== undefined ? String(rawRow[idxIdx] ?? '') : '',
      摘要: idxAbstract !== undefined ? String(rawRow[idxAbstract] ?? '') : '',
      币别: idxCurrency !== undefined ? String(rawRow[idxCurrency] ?? '') : '',
      钞汇: idxCashFlag !== undefined ? String(rawRow[idxCashFlag] ?? '') : '',
      交易日期: dateStr,
      交易金额: amountStr,
      账户余额: balanceStr,
      交易地点附言: idxRemark !== undefined ? String(rawRow[idxRemark] ?? '') : '',
      对方账号与户名: idxCounterpart !== undefined ? String(rawRow[idxCounterpart] ?? '') : '',
    });
  }

  return rows;
}

/**
 * 简单的 CSV 行解析（处理引号包裹的字段）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);

  return result;
}