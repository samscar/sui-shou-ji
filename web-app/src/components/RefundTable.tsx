import { S } from '../styles';
import { RefundMatch } from '../types';

interface Props {
  matches: RefundMatch[];
  ignoredKeys: Set<string>;
  onToggle: (key: string) => void;
}

/**
 * 剔除清单。照 ADR-0004 的要求：逐对呈现、默认生效、可逐条恢复。
 */
export default function RefundTable({ matches, ignoredKeys, onToggle }: Props) {
  return (
    <div style={S.tableBox}>
      <div style={S.tableTitle}>
        全额退款配对（已剔除 {matches.length - ignoredKeys.size} / {matches.length} 对）
      </div>
      <div style={{ padding: '0 16px 12px', fontSize: '13px', color: '#6b7280', lineHeight: 1.7 }}>
        退款与它冲抵的那笔支出成对剔除，不计入支出与收入。这个判断是自动做的，可能出错——
        若某一对判断有误，点「恢复」把两笔放回账单。
      </div>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>原支出</th>
            <th style={S.th}>退款</th>
            <th style={S.th}>金额</th>
            <th style={S.th}>状态</th>
            <th style={S.th}>操作</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const ignored = ignoredKeys.has(m.key);
            return (
              <tr key={m.key} style={ignored ? { opacity: 0.45 } : undefined}>
                <td style={S.td}>
                  <div>{m.出账日期}</div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      maxWidth: '280px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.出账备注}
                  </div>
                </td>
                <td style={S.td}>
                  <div>{m.退款日期}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {m.kind === 'split' ? `拆成 ${m.退款行.length} 笔退款` : '1 笔退款'}
                  </div>
                </td>
                <td style={{ ...S.td, ...S.amountRed }}>-¥{m.出账金额.toFixed(2)}</td>
                <td style={{ ...S.td, color: ignored ? '#6b7280' : '#22c55e', fontWeight: 600 }}>
                  {ignored ? '已恢复' : '已剔除'}
                </td>
                <td style={S.td}>
                  <button
                    onClick={() => onToggle(m.key)}
                    style={{
                      ...S.button,
                      ...(ignored ? S.buttonWarning : S.buttonSecondary),
                      padding: '4px 8px',
                      fontSize: '12px',
                    }}
                  >
                    {ignored ? '重新剔除' : '恢复'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
