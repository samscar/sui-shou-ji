import { CCBRow, RefundMatch } from './types';

/**
 * 退款配对。
 *
 * 判定顺序见 docs/adr/0004-退款配对剔除.md：
 *   第一层 全额 1:1    —— 同商户、金额绝对值相等、出账不晚于退款
 *   第二层 全额 1:N    —— 同一商户下多笔退款合计等于一笔出账（拆分退款）
 *
 * 金额不相等的场景（部分退款）不在这里处理：配不上就原样保留，退款仍按收入计入账单。
 */

// 退款语义。本仓库的真实流水里，退款字样只出现在「摘要」列，附言一次都没有。
// 这里仍然把摘要与附言拼起来扫，是为了不依赖某一个列的位置。
export const REFUND_KEYWORDS = ['退货', '退款', '撤销', '冲正', '退回'];

// 附言最后一段若命中这些词，说明它不是商户名，不能拿来做匹配。
// 「微信转账」不在这里：它虽然是渠道词不是商户名，但充值退款的附言两边都只有它，
// 排掉会让「充值 -204.00 ↔ 退款 +204.00」这类合法配对全部落空。
const GENERIC_MERCHANT_WORDS = new Set([
  '消费',
  '消费退货',
  '转账',
  '付款',
  '收款',
  '商户',
  '公司',
  '中心',
  '扫码付款',
  '还款',
  '缴费',
  '充值',
  '其他',
]);

// 单笔出账最多允许被几笔退款拆开冲抵
const MAX_SPLIT_PARTS = 3;

// 子集和搜索的候选上限。超出说明该商户流水太密，配对不可靠，直接放弃。
const MAX_SPLIT_CANDIDATES = 12;

export function amountOf(row: CCBRow): number {
  const raw = String(row.交易金额 ?? '').replace(/,/g, '').trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/** 把 20260901 与 2026-09-01 00:00:00 统一成 20260901，便于比较与求差 */
export function dayOf(row: CCBRow): number {
  const m = String(row.交易日期 ?? '').match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (!m) return 0;
  return Number(`${m[1]}${m[2]}${m[3]}`);
}

/**
 * 取一条流水的商户名候选。
 *
 * 「对方账号与户名」里的户名在出账行有八成被打码（***公司、**转账），
 * 所以出账侧只能靠附言；退款侧户名是完整的，两边取并集再求交集才能对上。
 */
function merchantTokens(row: CCBRow): Set<string> {
  const tokens = new Set<string>();

  const raw = String(row.对方账号与户名 ?? '');
  const slash = raw.lastIndexOf('/');
  const name = (slash >= 0 ? raw.slice(slash + 1) : '').trim();
  if (name.length >= 2 && !name.includes('**')) {
    tokens.add(name);
  }

  const memo = String(row.交易地点附言 ?? '').trim();
  const dash = memo.lastIndexOf('-');
  const tail = (dash >= 0 ? memo.slice(dash + 1) : memo).trim();
  if (tail.length >= 2 && !tail.includes('**') && !GENERIC_MERCHANT_WORDS.has(tail)) {
    tokens.add(tail);
  }

  return tokens;
}

function sharesMerchant(a: CCBRow, b: CCBRow): boolean {
  const ta = merchantTokens(a);
  if (ta.size === 0) return false;
  for (const t of merchantTokens(b)) {
    if (ta.has(t)) return true;
  }
  return false;
}

export function isRefundRow(row: CCBRow): boolean {
  if (amountOf(row) <= 0) return false;
  const text = `${row.摘要 ?? ''} ${row.交易地点附言 ?? ''}`;
  return REFUND_KEYWORDS.some((kw) => text.includes(kw));
}

function withinCents(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

function summarize(rows: CCBRow[], indexes: number[]) {
  return indexes.map((i) => rows[i]);
}

/**
 * 在候选中找一组「笔数 2..MAX_SPLIT_PARTS、合计等于 target」的退款。
 * 优先笔数少的组合，减少拍脑袋。
 */
function findSplit(
  candidates: number[],
  refundAmount: (i: number) => number,
  target: number
): number[] | null {
  if (candidates.length > MAX_SPLIT_CANDIDATES) return null;

  for (let n = 2; n <= MAX_SPLIT_PARTS; n++) {
    const picked: number[] = [];

    const walk = (start: number, remaining: number, depth: number): boolean => {
      if (depth === 0) return withinCents(remaining, 0) && picked.length === n;
      for (let k = start; k <= candidates.length - depth; k++) {
        const i = candidates[k];
        picked.push(i);
        if (walk(k + 1, remaining - refundAmount(i), depth - 1)) return true;
        picked.pop();
      }
      return false;
    };

    if (walk(0, target, n)) return [...picked];
  }
  return null;
}

/**
 * 对一批流水做退款配对。
 *
 * 返回全部配对结果；哪些生效由调用方按 key 过滤——这样「剔除清单里恢复某一条」
 * 不需要重跑配对，行为可预期。
 */
export function matchRefunds(rows: CCBRow[]): RefundMatch[] {
  const matches: RefundMatch[] = [];
  const taken = new Set<number>();

  const refunds = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => isRefundRow(row))
    .sort((a, b) => dayOf(a.row) - dayOf(b.row) || a.index - b.index);

  // ---- 第一层：全额 1:1 ----
  for (const { row: refund, index: refundIndex } of refunds) {
    if (taken.has(refundIndex)) continue;

    const amount = amountOf(refund);
    const day = dayOf(refund);

    const candidates = rows
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row, index }) =>
          !taken.has(index) &&
          amountOf(row) < 0 &&
          withinCents(-amountOf(row), amount) &&
          dayOf(row) <= day &&
          sharesMerchant(row, refund)
      );

    if (candidates.length === 0) continue;

    // 多候选时取日期最近的一笔（歧义候选往往同额同商户同分类，取哪笔都不改变分类总额）
    candidates.sort((a, b) => dayOf(b.row) - dayOf(a.row) || b.index - a.index);
    const out = candidates[0];

    taken.add(refundIndex);
    taken.add(out.index);
    matches.push({
      key: `o${out.index}`,
      kind: 'full',
      出账行: out.index,
      退款行: [refundIndex],
      出账日期: out.row.交易日期,
      出账金额: -amountOf(out.row),
      出账备注: `${out.row.摘要 ?? ''} ${out.row.交易地点附言 ?? ''}`.trim(),
      退款日期: refund.交易日期,
      退款合计: amount,
      退款明细: summarize(rows, [refundIndex]),
    });
  }

  // ---- 第二层：全额 1:N（拆分退款）----
  for (let outIndex = 0; outIndex < rows.length; outIndex++) {
    if (taken.has(outIndex)) continue;
    const out = rows[outIndex];
    const outAmount = amountOf(out);
    if (outAmount >= 0) continue;

    const total = -outAmount;
    const outDay = dayOf(out);

    const candidates = refunds
      .filter(
        ({ row, index }) =>
          !taken.has(index) &&
          dayOf(row) >= outDay &&
          amountOf(row) <= total + 0.005 &&
          sharesMerchant(row, out)
      )
      .map(({ index }) => index);

    if (candidates.length < 2) continue;

    const picked = findSplit(candidates, (i) => amountOf(rows[i]), total);
    if (!picked) continue;

    picked.forEach((i) => taken.add(i));
    taken.add(outIndex);
    matches.push({
      key: `o${outIndex}`,
      kind: 'split',
      出账行: outIndex,
      退款行: picked,
      出账日期: out.交易日期,
      出账金额: total,
      出账备注: `${out.摘要 ?? ''} ${out.交易地点附言 ?? ''}`.trim(),
      退款日期: rows[picked[0]].交易日期,
      退款合计: picked.reduce((sum, i) => sum + amountOf(rows[i]), 0),
      退款明细: summarize(rows, picked),
    });
  }

  return matches;
}

/** 配对占据的全部行下标（含出账与退款） */
export function occupiedRows(matches: RefundMatch[]): Set<number> {
  const occupied = new Set<number>();
  for (const match of matches) {
    occupied.add(match.出账行);
    match.退款行.forEach((i) => occupied.add(i));
  }
  return occupied;
}
