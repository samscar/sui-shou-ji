import { TripRange } from './types';

/**
 * 出行区间的口径。设计依据见 docs/adr/0006-出行区间一次性批量改判.md。
 */

// 居家支出：钱花在家里，不花在路上。这些主分类不参与出行区间的改判。
// 判断依据是主分类，不是摘要——流水里没有可靠的"消费/非消费"标记。
// 「购物消费」也在其中：旅途期间网购、超市采买是日常行为，不该算成旅游花销。
export const HOME_MAIN_CATEGORIES = ['金融保险', '居家生活', '交流通信', '购物消费'];

// 区间内被改判的支出统一归到这里
export const TRIP_TARGET = { main: '出差旅游', sub: '其他消费' };

/**
 * 取日期部分，统一成 `YYYY-MM-DD`。
 *
 * 建行流水里的 `交易日期` 有两种形态：带时分秒的 `2026-10-01 00:00:00`，
 * 以及纯数字的 `20261001`。后者若直接切片比较，`"20261001" >= "2026-10-01"`
 * 在字符串序上为真、`<= "2026-10-06"` 为假，结果是一笔都命中不了。
 * 这里先归一化再比较，不依赖具体形态。
 */
function dayOf(date: string): string {
  const raw = String(date ?? '').trim();

  const separated = raw.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (separated) {
    return `${separated[1]}-${separated[2].padStart(2, '0')}-${separated[3].padStart(2, '0')}`;
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  return raw.slice(0, 10);
}

/** 日期是否落在闭区间内。start / end 均为 YYYY-MM-DD。 */
export function isInTripRange(date: string, range: TripRange): boolean {
  const d = dayOf(date);
  if (!d) return false;
  return d >= range.start && d <= range.end;
}

/** 区间的展示形式：2026-10-01 ~ 2026-10-06 */
export function formatTripRange(range: TripRange): string {
  return `${range.start} ~ ${range.end}`;
}

/** 起止都填了、且起点不晚于终点，才算一个可用的区间 */
export function isValidTripRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  return start <= end;
}

/**
 * 一条支出在区间清单里的定位键。
 *
 * 只用「备注 + 交易日期」不够：同一商户同一天可能有两笔同额消费（真实流水里
 * 10-05 就有两笔 ¥5.00 的牛肉粉），撞键会让撤销一笔连带另一笔。行号在同一个
 * 文件内稳定，加上它才唯一。
 */
export function tripKeyOf(remark: string, date: string, rowIndex: number): string {
  return `${rowIndex}|${remark}|${date}`;
}
