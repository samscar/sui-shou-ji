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
  CategoryConfig,
  EditedRecord,
} from './types';

// ---- 核心解析函数（配置驱动） ----

/**
 * 构建关键词到分类的映射表
 */
function buildKeywordMap(
  categories: Record<string, Record<string, string[]>>
): Map<string, [string, string]> {
  const map = new Map<string, [string, string]>();
  for (const [mainCat, subCats] of Object.entries(categories)) {
    for (const [subCat, keywords] of Object.entries(subCats)) {
      for (const kw of keywords) {
        map.set(kw.toLowerCase(), [mainCat, subCat]);
      }
    }
  }
  return map;
}

/**
 * 判断是否为理财操作
 */
function isWealthManagementOperation(
  remark: string,
  keywords: string[]
): boolean {
  const lower = remark.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * 判断交易类型
 */
function getTradeType(
  amount: number,
  abstract: string,
  fullRemark: string,
  wmKeywords: string[]
): number {
  const isWM = isWealthManagementOperation(fullRemark, wmKeywords);
  if (amount < 0 && !isWM) {
    return TRADE_TYPE_EXPEND;
  } else if (isWM || abstract === '跨行转出') {
    return TRADE_TYPE_TRANSFER;
  } else {
    return TRADE_TYPE_INCOME;
  }
}

/**
 * 根据关键词查找分类
 */
function getCategoryByKeyword(
  remark: string,
  keywordMap: Map<string, [string, string]>,
  defaultCategory: [string, string]
): [string, string] {
  const lower = remark.toLowerCase();
  for (const [kw, category] of keywordMap.entries()) {
    if (lower.includes(kw)) {
      return category;
    }
  }
  return defaultCategory;
}

/**
 * 查找编辑记录
 */
function findEditedRecord(
  备注prefix: string,
  交易日期: string,
  editedRecords: EditedRecord[]
): EditedRecord | undefined {
  return editedRecords.find(
    r => r.原始备注 === 备注prefix && r.交易日期 === 交易日期
  );
}

/**
 * 提取商家名称
 */
function counterSearch(remark: string, merchantKeywords: string[]): string {
  for (const kw of merchantKeywords) {
    if (remark.includes(kw)) return kw;
  }
  return '其他';
}

/**
 * 转账账户决策
 */
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
 * 日期格式标准化
 */
function normalizeDate(dateStr: string): string {
  const cleaned = dateStr.replace(/[年月]/g, '-').replace(/[日]/g, '').trim();
  
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
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

/**
 * 解析 CCB 行数据，进行分类转换（支持配置和编辑记录）
 */
export function parseCCBData(
  rows: CCBRow[],
  config: CategoryConfig,
  editedRecords: EditedRecord[] = []
): {
  expenses: ExpenseRecord[];
  incomes: IncomeRecord[];
  transfers: TransferRecord[];
} {
  const expenses: ExpenseRecord[] = [];
  const incomes: IncomeRecord[] = [];
  const transfers: TransferRecord[] = [];
  
  // 构建关键词映射表
  const expendKeywordMap = buildKeywordMap(config.expendCategories);
  const incomeKeywordMap = buildKeywordMap(config.incomeCategories);
  
  const wmKeywords = config.wealthManagementKeywords;
  const merchantKeywords = config.merchantKeywords;

  for (const row of rows) {
    const amountRaw = String(row['交易金额'] || '0').replace(/,/g, '');
    const amount = parseFloat(amountRaw);
    if (isNaN(amount)) continue;

    const transDate = normalizeDate(String(row['交易日期'] || '').trim());
    const fullRemark = `${row['摘要'] || ''} ${row['交易地点附言'] || ''}`.trim();
    const abstract = String(row['摘要'] || '').trim();
    
    const counterpart = String(row['对方账号与户名'] || '').split('/');
    const counterpartName = counterpart.length > 1 ? counterpart[1] : '';

    const isWM = isWealthManagementOperation(fullRemark, wmKeywords);
    const tradeType = getTradeType(amount, abstract, fullRemark, wmKeywords);

    if (tradeType === TRADE_TYPE_EXPEND) {
      // 优先查找编辑记录
      const edited = findEditedRecord(fullRemark, transDate, editedRecords);
      
      let mainCat: string, subCat: string;
      if (edited) {
        mainCat = edited.新分类;
        subCat = edited.新子分类;
      } else {
        // 关键词匹配
        const [m1, s1] = getCategoryByKeyword(
          fullRemark,
          expendKeywordMap,
          ['其他杂项', '其他支出']
        );
        
        // 对方户名二次匹配
        const [m2, s2] = counterpartName
          ? getCategoryByKeyword(counterpartName, expendKeywordMap, [m1, s1])
          : [m1, s1];
        
        mainCat = m2 !== '其他杂项' ? m2 : m1;
        subCat = m2 !== '其他杂项' ? s2 : s1;
      }

      expenses.push({
        交易类型: '支出',
        日期: transDate,
        分类: mainCat,
        子分类: subCat,
        支出账户: ACCOUNT_BANK,
        金额: Math.abs(amount),
        商家: counterSearch(fullRemark, merchantKeywords),
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
      // 收入
      const edited = findEditedRecord(fullRemark, transDate, editedRecords);
      
      let mainCat: string, subCat: string;
      if (edited) {
        mainCat = edited.新分类;
        subCat = edited.新子分类;
      } else {
        const [m1, s1] = getCategoryByKeyword(
          fullRemark,
          incomeKeywordMap,
          ['其他收入', '收入']
        );
        
        const [m2, s2] = counterpartName
          ? getCategoryByKeyword(counterpartName, incomeKeywordMap, [m1, s1])
          : [m1, s1];
        
        mainCat = m2 !== '其他收入' ? m2 : m1;
        subCat = m2 !== '其他收入' ? s2 : s1;
      }

      incomes.push({
        交易类型: '收入',
        日期: transDate,
        分类: mainCat,
        子分类: subCat,
        收入账户: ACCOUNT_BANK,
        金额: amount,
        备注: fullRemark,
      });
    }
  }

  return { expenses, incomes, transfers };
}

/**
 * 解析 XLS 二进制数据为 CCB 行数据
 */
export function parseCCBXLS(data: ArrayBuffer): CCBRow[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('工作簿中没有工作表');
  }

  const sheet = workbook.Sheets[sheetName];
  const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

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
    if (rawRow.length === 0 || rawRow.every((v: any) => v === undefined || v === null || String(v).trim() === '')) {
      continue;
    }

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

    let amountStr = '';
    const amountCell = rawRow[idxAmount];
    if (typeof amountCell === 'number') {
      amountStr = String(amountCell);
    } else {
      amountStr = String(amountCell ?? '').replace(/,/g, '');
    }

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
 * 解析 CSV 文本（备用）
 */
export function parseCCBCSV(csvText: string): CCBRow[] {
  let text = csvText.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');

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
    headerIndex = 0;
  }

  const headerLine = lines[headerIndex];
  const headers = parseCSVLine(headerLine);

  const colMap: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].replace(/["""]/g, '').trim();
    colMap[h] = String(i);
  }

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
 * 简单的 CSV 行解析
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
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