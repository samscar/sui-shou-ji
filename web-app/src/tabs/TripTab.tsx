import TripRangeForm from '../components/TripRangeForm';
import TripTable from '../components/TripTable';
import { S } from '../styles';
import { TripRange, TripRecord } from '../types';
import { formatTripRange } from '../trip';

interface Props {
  applied: TripRange | null;
  records: TripRecord[];
  onApply: (start: string, end: string) => void;
  onClear: () => void;
  onToggle: (key: string) => void;
}

export default function TripTab({ applied, records, onApply, onClear, onToggle }: Props) {
  const active = records.filter((r) => !r.撤销);
  const amount = active.reduce((s, r) => s + r.金额, 0);

  return (
    <div>
      <div style={{ ...S.hint, marginBottom: '12px' }}>
        一次外出结束后，选起止日期，把这段期间的支出整体归入「出差旅游 / 其他消费」，
        这样随手记里能直接看到这趟一共花了多少。
        <br />
        居家支出（房贷、物业水电、话费、网购与超市采买）不参与改判——钱花在家里，不花在路上。
        <br />
        区间只在本次会话内有效，刷新页面或重新导入文件后需要重选。
      </div>

      <TripRangeForm applied={applied} onApply={onApply} onClear={onClear} />

      <div
        style={{
          ...S.tripSummary,
          ...(applied ? S.tripSummaryOn : S.tripSummaryOff),
        }}
      >
        {applied ? (
          <>
            <strong>{formatTripRange(applied)}</strong>：已改判 <strong>{active.length}</strong> 笔，
            合计 <strong>¥{amount.toFixed(2)}</strong>
            {records.length - active.length > 0 && `（另有 ${records.length - active.length} 笔不计入）`}
          </>
        ) : (
          '尚未选择出行区间。'
        )}
      </div>

      {applied && records.length === 0 && (
        <div style={{ ...S.hint, padding: '24px 0' }}>
          这段日期内没有可改判的支出。可能是日期选错了，也可能这段时间确实没有消费。
        </div>
      )}

      {records.length > 0 && <TripTable records={records} onToggle={onToggle} />}
    </div>
  );
}
