/**
 * 分类表一致性的回归校验。
 *
 * 对应 docs/adr/0007-分类名以分类表为准.md：自定义映射只能引用内置分类表里
 * 已有的主分类与子分类，不得凭空造出新分类。历史上正是在编辑器里把「交流通信」
 * 写成「交流通讯」，才让下拉框中同时出现两个并列的主分类。
 *
 *   npm run verify:config
 */
import { mergeConfigs, findUnknownCategories, CategoryRef } from '../src/configManager';
import { CategoryConfig, UserConfig, UserKeywordMapping } from '../src/types';
import defaultCategories from '../src/config/categories.json';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? ' ok ' : 'FAIL'}  ${name}  (期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)})`
  );
}

function mapping(
  keyword: string,
  mainCategory: string,
  subCategory: string
): UserKeywordMapping {
  return { keyword, mainCategory, subCategory, type: 'expend', createdAt: '' };
}

function userConfig(customMappings: UserKeywordMapping[]): UserConfig {
  return { customMappings, editedRecords: [], updatedAt: '' };
}

const builtin = defaultCategories as CategoryConfig;

// 读取侧会打印丢弃告警，测试期间压掉以免盖住用例输出
const warn = console.warn;
console.warn = () => {};

// ---- 用例 1：分类表用的是「交流通讯」，不是「交流通信」 ----
{
  check('内置分类表含交流通讯', '交流通讯' in builtin.expendCategories, true);
  check('内置分类表不含交流通信', '交流通信' in builtin.expendCategories, false);
}

// ---- 用例 2：主分类不在分类表时不新建分类，关键词也不落地 ----
{
  const merged = mergeConfigs(builtin, userConfig([mapping('测试号', '交流通信', '手机话费')]));
  check('幽灵主分类不被创建', '交流通信' in merged.expendCategories, false);
  check(
    '幽灵主分类下的关键词不落地',
    merged.expendCategories['交流通讯']['手机话费'].includes('测试号'),
    false
  );
}

// ---- 用例 3：主分类存在但子分类不存在时，同样丢弃 ----
{
  const merged = mergeConfigs(builtin, userConfig([mapping('测试号', '交流通讯', '流量费')]));
  check('幽灵子分类不被创建', '流量费' in merged.expendCategories['交流通讯'], false);
  check(
    '幽灵子分类下的关键词不落地',
    merged.expendCategories['交流通讯']['手机话费'].includes('测试号'),
    false
  );
}

// ---- 用例 4：分类名合法时照常并入，且不重复 ----
{
  const merged = mergeConfigs(
    builtin,
    userConfig([mapping('测试号', '交流通讯', '手机话费'), mapping('广东移动', '交流通讯', '手机话费')])
  );
  const keywords = merged.expendCategories['交流通讯']['手机话费'];
  check('合法映射并入', keywords.includes('测试号'), true);
  check('已存在的关键词不重复追加', keywords.filter((k) => k === '广东移动').length, 1);
}

// ---- 用例 5：校验能同时报出主分类与子分类两侧的违规 ----
{
  const refs: CategoryRef[] = [
    { type: 'expend', mainCategory: '交流通信', subCategory: '手机话费' },
    { type: 'expend', mainCategory: '交流通讯', subCategory: '流量费' },
  ];
  check('报出主分类违规', findUnknownCategories(refs, builtin), [
    '支出 / 交流通信（主分类不在分类表中）',
    '支出 / 交流通讯 / 流量费（子分类不在分类表中）',
  ]);
}

// ---- 用例 6：分类表自检——自身全量引用必然通过 ----
{
  const refs: CategoryRef[] = [];
  for (const [mainCategory, subs] of Object.entries(builtin.expendCategories)) {
    for (const subCategory of Object.keys(subs)) {
      refs.push({ type: 'expend', mainCategory, subCategory });
    }
  }
  for (const [mainCategory, subs] of Object.entries(builtin.incomeCategories)) {
    for (const subCategory of Object.keys(subs)) {
      refs.push({ type: 'income', mainCategory, subCategory });
    }
  }
  check('分类表自检通过', findUnknownCategories(refs, builtin), []);
}

console.warn = warn;

console.log('');
if (failures > 0) {
  console.log(`${failures} 项未通过`);
  process.exit(1);
}
console.log('全部通过');
