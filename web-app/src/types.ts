// 交易类型
export const TRADE_TYPE_EXPEND = 1;
export const TRADE_TYPE_INCOME = 2;
export const TRADE_TYPE_TRANSFER = 3;

// 账户
export const ACCOUNT_CASH = '现金';
export const ACCOUNT_BANK = '银行卡';
export const ACCOUNT_WEALTH_MANAGEMENT = '家庭理财账户';

// 记录结构
export interface ExpenseRecord {
  交易类型: '支出';
  日期: string;
  分类: string;
  子分类: string;
  支出账户: string;
  金额: number;
  商家: string;
  备注: string;
}

export interface IncomeRecord {
  交易类型: '收入';
  日期: string;
  分类: string;
  子分类: string;
  收入账户: string;
  金额: number;
  备注: string;
}

export interface TransferRecord {
  交易类型: '转账';
  日期: string;
  转出账户: string;
  转入账户: string;
  金额: number;
  备注: string;
}

// CCB CSV 原始列名
export interface CCBRow {
  序号: string;
  摘要: string;
  币别: string;
  钞汇: string;
  交易日期: string;
  交易金额: string;
  账户余额: string;
  交易地点附言: string;
  对方账号与户名: string;
}

// 分类配置结构
export interface CategoryConfig {
  version: string;
  expendCategories: Record<string, Record<string, string[]>>;
  incomeCategories: Record<string, Record<string, string[]>>;
  wealthManagementKeywords: string[];
  merchantKeywords: string[];
}

// 用户自定义映射词条
export interface UserKeywordMapping {
  keyword: string;
  mainCategory: string;
  subCategory: string;
  type: 'expend' | 'income';
  createdAt: string;
}

// 用户配置
export interface UserConfig {
  customMappings: UserKeywordMapping[];
  editedRecords: EditedRecord[];
  updatedAt: string;
}

// 编辑后的记录
export interface EditedRecord {
  原始备注: string;
  交易日期: string;
  原始分类: string;
  原始子分类: string;
  新分类: string;
  新子分类: string;
  editedAt: string;
}

// ---- 出行区间 ----

// 一次外出所占的日期范围，端点按日期计算（闭区间）
export interface TripRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// 一条被出行区间改判过的支出。key 用于「不计入」的定位与撤销。
export interface TripRecord {
  key: string;
  日期: string;
  金额: number;
  原分类: string;
  原子分类: string;
  备注: string;
  // 用户在本会话里点了「不计入」，该笔保持原分类
  撤销: boolean;
}

// ---- 退款配对 ----

// 配对层级：全额 1:1 / 拆分退款（一笔出账被多笔退款合计冲抵）
export type RefundMatchKind = 'full' | 'split';

// 一条配对结果。出账与退款的行号指向 CCBRow[] 的下标，供剔除清单还原。
export interface RefundMatch {
  // 以出账行下标为键，稳定且唯一
  key: string;
  kind: RefundMatchKind;
  出账行: number;
  退款行: number[];
  出账日期: string;
  出账金额: number;
  出账备注: string;
  退款日期: string;
  退款合计: number;
  退款明细: CCBRow[];
}