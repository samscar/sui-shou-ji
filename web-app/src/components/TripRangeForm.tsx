import { useState } from 'react';
import { S } from '../styles';
import { TripRange } from '../types';

interface Props {
  applied: TripRange | null;
  onApply: (start: string, end: string) => void;
  onClear: () => void;
}

/**
 * 出行区间的起止日期输入。区间是一次性的，所以这里只管本次会话。
 */
export default function TripRangeForm({ applied, onApply, onClear }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const bothFilled = Boolean(start && end);
  const reversed = bothFilled && start > end;
  const canApply = bothFilled && !reversed;

  return (
    <div style={S.tripForm}>
      <div>
        <label style={S.modalFieldLabel} htmlFor="trip-start">
          起始日期
        </label>
        <input
          id="trip-start"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={S.dateInput}
        />
      </div>
      <div>
        <label style={S.modalFieldLabel} htmlFor="trip-end">
          结束日期
        </label>
        <input
          id="trip-end"
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          style={S.dateInput}
        />
      </div>
      <button
        onClick={() => canApply && onApply(start, end)}
        disabled={!canApply}
        style={{
          ...S.button,
          ...S.buttonPrimary,
          ...(canApply ? {} : S.buttonDisabled),
          marginBottom: '2px',
        }}
      >
        应用区间
      </button>
      {applied && (
        <button
          onClick={onClear}
          style={{ ...S.button, ...S.buttonGhost, marginBottom: '2px' }}
        >
          清除区间
        </button>
      )}
      {reversed && (
        <div style={{ ...S.modalError, width: '100%', marginTop: 0 }}>
          起始日期不能晚于结束日期。
        </div>
      )}
    </div>
  );
}
