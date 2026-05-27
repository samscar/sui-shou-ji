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