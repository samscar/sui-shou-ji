import PendingTable from '../components/PendingTable';
import { ExpenseRecord, IncomeRecord } from '../types';

interface Props {
  expenses: ExpenseRecord[];
  incomes: IncomeRecord[];
  onEdit: (record: ExpenseRecord | IncomeRecord) => void;
}

/**
 * 待分类。表格只显示待分类的记录（其他杂项 / 其他收入），与改动前一致。
 */
export default function PendingTab({ expenses, incomes, onEdit }: Props) {
  return (
    <div>
      {expenses.length > 0 && <PendingTable kind="expense" records={expenses} onEdit={onEdit} />}
      {incomes.length > 0 && <PendingTable kind="income" records={incomes} onEdit={onEdit} />}
    </div>
  );
}
