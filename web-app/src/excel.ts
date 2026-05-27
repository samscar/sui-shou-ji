import * as XLSX from 'xlsx';
import { ExpenseRecord, IncomeRecord, TransferRecord } from './types';

/**
 * 导出为随手记格式的 Excel 文件（三个 sheet：支出、收入、转账）
 */
export function exportToExcel(
  expenses: ExpenseRecord[],
  incomes: IncomeRecord[],
  transfers: TransferRecord[]
): void {
  const wb = XLSX.utils.book_new();

  // 支出 sheet
  const expenseColumns = ['交易类型', '日期', '分类', '子分类', '支出账户', '金额', '商家', '备注'];
  const expenseData = [expenseColumns, ...expenses.map((r) => expenseColumns.map((c) => (r as any)[c] ?? ''))];
  const wsExpense = XLSX.utils.aoa_to_sheet(expenseData);
  XLSX.utils.book_append_sheet(wb, wsExpense, '支出');

  // 收入 sheet
  const incomeColumns = ['交易类型', '日期', '分类', '子分类', '收入账户', '金额', '备注'];
  const incomeData = [incomeColumns, ...incomes.map((r) => incomeColumns.map((c) => (r as any)[c] ?? ''))];
  const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
  XLSX.utils.book_append_sheet(wb, wsIncome, '收入');

  // 转账 sheet
  const transferColumns = ['交易类型', '日期', '转出账户', '转入账户', '金额', '备注'];
  const transferData = [transferColumns, ...transfers.map((r) => transferColumns.map((c) => (r as any)[c] ?? ''))];
  const wsTransfer = XLSX.utils.aoa_to_sheet(transferData);
  XLSX.utils.book_append_sheet(wb, wsTransfer, '转账');

  // 下载
  XLSX.writeFile(wb, '随手记账单.xlsx');
}