import { S } from '../styles';
import { TransferRecord } from '../types';

// 转账只是给人扫一眼，不参与分类，表里只显示前若干条
const PREVIEW = 50;

interface Props {
  transfers: TransferRecord[];
}

export default function TransferTable({ transfers }: Props) {
  return (
    <div style={S.tableBox}>
      <div style={S.tableTitle}>
        转账记录 ({transfers.length} 笔)
        {transfers.length > PREVIEW && ` · 仅显示前 ${PREVIEW} 笔`}
      </div>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>日期</th>
            <th style={S.th}>转出账户</th>
            <th style={S.th}>转入账户</th>
            <th style={S.th}>金额</th>
            <th style={S.th}>备注</th>
          </tr>
        </thead>
        <tbody>
          {transfers.slice(0, PREVIEW).map((r, i) => (
            <tr key={`${r.日期}-${r.备注}-${i}`}>
              <td style={S.td}>{r.日期}</td>
              <td style={S.td}>{r.转出账户}</td>
              <td style={S.td}>{r.转入账户}</td>
              <td style={S.td}>¥{r.金额.toFixed(2)}</td>
              <td style={{ ...S.td, maxWidth: '400px', wordBreak: 'break-word' }}>{r.备注}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
