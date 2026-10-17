/**
 * 出行区间的回归校验。
 *
 * 样本是合成的——真实流水含个人消费记录，不进仓库。每个用例对应
 * docs/adr/0006-出行区间一次性批量改判.md 里的一条口径，改动区间逻辑时先跑这个。
 *
 *   npm run verify:trip
 */
import { parseCCBData, TripOptions } from '../src/parser';
import { CategoryConfig, CCBRow, EditedRecord } from '../src/types';
import { HOME_MAIN_CATEGORIES, TRIP_TARGET, tripKeyOf } from '../src/trip';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? ' ok ' : 'FAIL'}  ${name}  (期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)})`
  );
}

function row(
  摘要: string,
  交易日期: string,
  交易金额: number,
  交易地点附言: string,
  对方账号与户名 = ''
): CCBRow {
  return {
    序号: '',
    摘要,
    币别: '人民币元',
    钞汇: '钞',
    交易日期,
    交易金额: String(交易金额),
    账户余额: '',
    交易地点附言,
    对方账号与户名,
  };
}

// 合成目录：只保留判定需要的那几条关键词，其余落入「其他杂项」
const config: CategoryConfig = {
  version: 'test',
  expendCategories: {
    购物消费: { 日常购物: ['天猫'] },
    食品酒水: { 日常餐饮: ['餐饮'] },
    出差旅游: { 其他消费: ['携程'] },
    金融保险: { 房贷: ['房贷'] },
    居家生活: { 物业费: ['物业'] },
    交流通信: { 手机话费: ['移动'] },
  },
  incomeCategories: {
    其他收入: { 退款: ['退货'] },
    职业收入: { 工资收入: ['工资'] },
  },
  wealthManagementKeywords: ['基金'],
  merchantKeywords: [],
};

const RANGE = { start: '2026-10-01', end: '2026-10-06' };

function trip(excludedKeys: string[] = []): TripOptions {
  return {
    range: RANGE,
    target: TRIP_TARGET,
    excludedMainCategories: HOME_MAIN_CATEGORIES,
    excludedKeys: new Set(excludedKeys),
  };
}

function findRemark(
  list: { 备注: string; 分类: string; 子分类: string }[],
  remark: string
) {
  return list.find((r) => r.备注 === remark);
}

function categoryOf(
  list: { 备注: string; 分类: string; 子分类: string }[],
  remark: string
) {
  const hit = findRemark(list, remark);
  return hit ? `${hit.分类}/${hit.子分类}` : '（不存在）';
}

// ---- 用例 1：闭区间，端点两天都含入，区间外一天都不动 ----
{
  const rows = [
    row('消费', '2026-10-01 00:00:00', -40, '餐饮-某餐馆', 'Z/***店'),
    row('消费', '2026-10-06 00:00:00', -30, '餐饮-某面馆', 'Z/***店'),
    row('消费', '2026-09-30 00:00:00', -20, '餐饮-某食堂', 'Z/***店'),
    row('消费', '2026-10-07 00:00:00', -10, '餐饮-某档口', 'Z/***店'),
  ];
  const { expenses, tripRecords } = parseCCBData(rows, config, [], new Set(), trip());

  check('起点日 10-01 应改判', categoryOf(expenses, '消费 餐饮-某餐馆'), '出差旅游/其他消费');
  check('终点日 10-06 应改判', categoryOf(expenses, '消费 餐饮-某面馆'), '出差旅游/其他消费');
  check('区间前 09-30 不动', categoryOf(expenses, '消费 餐饮-某食堂'), '食品酒水/日常餐饮');
  check('区间后 10-07 不动', categoryOf(expenses, '消费 餐饮-某档口'), '食品酒水/日常餐饮');
  check('清单只收区间内两笔', tripRecords.length, 2);
}

// ---- 用例 2：居家支出四个主分类都不改判 ----
{
  const rows = [
    row('跨行转出', '2026-10-02 00:00:00', -10000, '还房贷', 'Z/***行'),
    row('消费', '2026-10-03 00:00:00', -399, '支付宝-天猫-某家居旗舰店', 'Z/***公司'),
    row('消费', '2026-10-02 00:00:00', -199, '支付宝-某移动营业厅', 'Z/***厅'),
    row('消费', '2026-10-04 00:00:00', -120, '微信-某物业服务中心', 'Z/***中心'),
    row('消费', '2026-10-04 00:00:00', -55, '微信-某旅拍店', 'Z/***店'),
  ];
  const { expenses, tripRecords } = parseCCBData(rows, config, [], new Set(), trip());

  check('房贷不改判', categoryOf(expenses, '跨行转出 还房贷'), '金融保险/房贷');
  check('网购不改判', categoryOf(expenses, '消费 支付宝-天猫-某家居旗舰店'), '购物消费/日常购物');
  check('话费不改判', categoryOf(expenses, '消费 支付宝-某移动营业厅'), '交流通信/手机话费');
  check('物业不改判', categoryOf(expenses, '消费 微信-某物业服务中心'), '居家生活/物业费');
  check('其余仍需改判', categoryOf(expenses, '消费 微信-某旅拍店'), '出差旅游/其他消费');
  check('清单不含居家支出', tripRecords.length, 1);
}

// ---- 用例 3：清单里标了「不计入」，该笔保持原分类，且仍留在清单里 ----
{
  const rows = [row('消费', '2026-10-03 00:00:00', -66, '餐饮-某酸汤鱼', 'Z/***店')];
  const key = tripKeyOf('消费 餐饮-某酸汤鱼', '2026-10-03 00:00:00', 0);
  const { expenses, tripRecords } = parseCCBData(rows, config, [], new Set(), trip([key]));

  check('撤销后回到原分类', categoryOf(expenses, '消费 餐饮-某酸汤鱼'), '食品酒水/日常餐饮');
  check('撤销的条目仍列在清单里', tripRecords.length, 1);
  check('  清单标记为已撤销', tripRecords[0]?.撤销, true);
  check('  清单保留原分类', `${tripRecords[0]?.原分类}/${tripRecords[0]?.原子分类}`, '食品酒水/日常餐饮');
}

// ---- 用例 4：交易修正记录先于区间套用，区间覆盖它；撤销后退回修正记录的分类 ----
{
  const rows = [row('消费', '2026-10-01 00:00:00', -40, '餐饮-某餐馆', 'Z/***店')];
  const edited: EditedRecord[] = [
    {
      原始备注: '消费 餐饮-某餐馆',
      交易日期: '2026-10-01 00:00:00',
      原始分类: '其他杂项',
      原始子分类: '其他支出',
      新分类: '食品酒水',
      新子分类: '日常餐饮',
      editedAt: '',
    },
  ];
  const key = tripKeyOf('消费 餐饮-某餐馆', '2026-10-01 00:00:00', 0);

  const withTrip = parseCCBData(rows, config, edited, new Set(), trip());
  check('区间覆盖修正记录', categoryOf(withTrip.expenses, '消费 餐饮-某餐馆'), '出差旅游/其他消费');
  check('  清单记下修正后的原分类', withTrip.tripRecords[0]?.原分类, '食品酒水');

  const undone = parseCCBData(rows, config, edited, new Set(), trip([key]));
  check('撤销后退回修正记录的分类', categoryOf(undone.expenses, '消费 餐饮-某餐馆'), '食品酒水/日常餐饮');

  const noTrip = parseCCBData(rows, config, edited);
  check('不传区间时修正记录照旧生效', categoryOf(noTrip.expenses, '消费 餐饮-某餐馆'), '食品酒水/日常餐饮');
}

// ---- 用例 5：不传区间时行为与改动前一致，清单为空 ----
{
  const rows = [
    row('消费', '2026-10-01 00:00:00', -40, '餐饮-某餐馆', 'Z/***店'),
    row('消费', '2026-10-02 00:00:00', -399, '支付宝-天猫-某家居旗舰店', 'Z/***公司'),
  ];
  const result = parseCCBData(rows, config);
  check('未启用区间时清单为空', result.tripRecords.length, 0);
  check('  分类维持关键词结果', categoryOf(result.expenses, '消费 餐饮-某餐馆'), '食品酒水/日常餐饮');
}

// ---- 用例 6：收入与转账不受区间影响 ----
{
  const rows = [
    row('汇兑', '2026-10-01 00:00:00', 20000, '工资', 'Z/***公司'),
    row('跨行转出', '2026-10-02 00:00:00', 500, '红包', 'Z/***'),
  ];
  const { incomes, transfers, tripRecords } = parseCCBData(
    rows,
    config,
    [],
    new Set(),
    trip()
  );

  check('区间内工资仍走收入', incomes.length, 1);
  check('  工资分类不变', categoryOf(incomes, '汇兑 工资'), '职业收入/工资收入');
  check('区间内转账仍走转账', transfers.length, 1);
  check('  转账不进区间清单', tripRecords.length, 0);
}

// ---- 用例 7：跨边界的退款配对不受区间影响 ----
{
  const rows = [
    row('消费', '2026-09-30 00:00:00', -989, '支付宝-某铁路服务商', 'Z/***公司'),
    row('消费退货', '2026-10-05 00:00:00', 989, '支付宝-某铁路服务商', '1/某铁路服务商'),
  ];
  const { expenses, incomes, refundMatches, tripRecords } = parseCCBData(
    rows,
    config,
    [],
    new Set(),
    trip()
  );

  check('跨边界配对仍然成立', refundMatches.length, 1);
  check('  出账被剔除，不因区间复活', expenses.length, 0);
  check('  退款被剔除，不进收入', incomes.length, 0);
  check('  剔除的流水不进区间清单', tripRecords.length, 0);
}

// ---- 用例 8：同商户同日两笔同额消费，键不能撞，撤销一笔不影响另一笔 ----
{
  const rows = [
    row('消费', '2026-10-05 00:00:00', -5, '微信-某牛肉粉店', 'Z/***店'),
    row('消费', '2026-10-05 00:00:00', -5, '微信-某牛肉粉店', 'Z/***店'),
  ];
  const all = parseCCBData(rows, config, [], new Set(), trip());
  check('同商户同日两笔都进清单', all.tripRecords.length, 2);
  check('  两笔的键互不相同', new Set(all.tripRecords.map((r) => r.key)).size, 2);

  const firstKey = all.tripRecords[0].key;
  const one = parseCCBData(rows, config, [], new Set(), trip([firstKey]));
  check('撤销一笔后退回原分类的只有一笔', one.expenses.filter((e) => e.分类 === '其他杂项').length, 1);
  check('  另一笔仍是出差旅游', one.expenses.filter((e) => e.分类 === '出差旅游').length, 1);
}

console.log('');
if (failures > 0) {
  console.log(`${failures} 项未通过`);
  process.exit(1);
}
console.log('全部通过');
