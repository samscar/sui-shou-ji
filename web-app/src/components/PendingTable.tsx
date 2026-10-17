import { S } from '../styles';
import { ExpenseRecord, IncomeRecord } from '../types';

interface Props {
  kind: 'expense' | 'income';
  records: (ExpenseRecord | IncomeRecord)[];
  onEdit: (record: ExpenseRecord | IncomeRecord) => void;
}

/**
 * 待分类记录表。支出与收入共用一张表，差别只在金额符号与「商家」列。
 */
export default function PendingTable({ kind, records, onEdit }: Props) {
  const isExpense = kind === 'expense';

  return (
    <div style={S.tableBox}>
      <div style={S.tableTitle}>
        {isExpense ? '待分类支出记录' : '待分类收入记录'} ({records.length} 笔)
      </div>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>日期</th>
            <th style={S.th}>分类</th>
            <th style={S.th}>子分类</th>
            <th style={S.th}>金额</th>
            {isExpense && <th style={S.th}>商家</th>}
            <th style={S.th}>备注</th>
            <th style={S.th}>操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={`${r.日期}-${r.备注}-${i}`}>
              <td style={S.td}>{r.日期}</td>
              <td style={{ ...S.td, color: '#f59e0b', fontWeight: 500 }}>{r.分类}</td>
              <td style={S.td}>{r.子分类}</td>
              <td style={{ ...S.td, ...(isExpense ? S.amountRed : S.amountGreen) }}>
                {isExpense ? '-' : '+'}¥{r.金额.toFixed(2)}
              </td>
              {isExpense && <td style={S.td}>{(r as ExpenseRecord).商家}</td>}
              <td style={{ ...S.td, maxWidth: '400px', wordBreak: 'break-word' }}>{r.备注}</td>
              <td style={S.td}>
                <button
                  onClick={() => onEdit(r)}
                  style={{ ...S.button, ...S.buttonPrimary, padding: '4px 8px', fontSize: '12px' }}
                >
                  编辑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
