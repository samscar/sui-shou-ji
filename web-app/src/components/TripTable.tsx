import { S } from '../styles';
import { TripRecord } from '../types';

interface Props {
  records: TripRecord[];
  onToggle: (key: string) => void;
}

/**
 * 区间归类清单。与剔除清单同构：批量判断必须看得见、撤得回。
 */
export default function TripTable({ records, onToggle }: Props) {
  const active = records.filter((r) => !r.撤销).length;

  return (
    <div style={S.tableBox}>
      <div style={S.tableTitle}>
        区间归类清单（已改判 {active} / {records.length} 笔）
      </div>
      <div style={{ padding: '0 16px 12px', fontSize: '13px', color: '#6b7280', lineHeight: 1.7 }}>
        这段日期内的支出已整体归入「出差旅游 / 其他消费」。判断是整段做的，可能把不该算的算进来——
        点「不计入」把那一笔退回它原来的分类。
      </div>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>日期</th>
            <th style={S.th}>原分类</th>
            <th style={S.th}>原子分类</th>
            <th style={S.th}>金额</th>
            <th style={S.th}>备注</th>
            <th style={S.th}>状态</th>
            <th style={S.th}>操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.key} style={r.撤销 ? { opacity: 0.45 } : undefined}>
              <td style={S.td}>{r.日期}</td>
              <td style={S.td}>{r.原分类}</td>
              <td style={S.td}>{r.原子分类}</td>
              <td style={{ ...S.td, ...S.amountRed }}>-¥{r.金额.toFixed(2)}</td>
              <td style={{ ...S.td, maxWidth: '360px', wordBreak: 'break-word' }}>{r.备注}</td>
              <td style={{ ...S.td, color: r.撤销 ? '#6b7280' : '#4f6ef7', fontWeight: 600 }}>
                {r.撤销 ? '已撤销' : '已改判'}
              </td>
              <td style={S.td}>
                <button
                  onClick={() => onToggle(r.key)}
                  style={{
                    ...S.button,
                    ...(r.撤销 ? S.buttonWarning : S.buttonSecondary),
                    padding: '4px 8px',
                    fontSize: '12px',
                  }}
                >
                  {r.撤销 ? '恢复' : '不计入'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
