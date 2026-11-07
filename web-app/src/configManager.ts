import { CategoryConfig, UserConfig, UserKeywordMapping, EditedRecord } from './types';
import defaultCategories from './config/categories.json';

const USER_CONFIG_KEY = 'ccb-to-sui-user-config';

/**
 * 加载内置分类配置
 */
export function loadDefaultConfig(): CategoryConfig {
  return defaultCategories as CategoryConfig;
}

/**
 * 加载用户自定义配置（localStorage）
 */
export function loadUserConfig(): UserConfig {
  try {
    const stored = localStorage.getItem(USER_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('加载用户配置失败', e);
  }
  return {
    customMappings: [],
    editedRecords: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 保存用户配置到 localStorage
 */
export function saveUserConfig(config: UserConfig): void {
  try {
    config.updatedAt = new Date().toISOString();
    localStorage.setItem(USER_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('保存用户配置失败', e);
  }
}

/**
 * 一份「交易类型 + 主分类 + 子分类」的引用，用于校验分类名是否落在内置分类表里。
 */
export interface CategoryRef {
  type: 'expend' | 'income';
  mainCategory: string;
  subCategory: string;
}

/**
 * 校验一组分类引用是否都落在内置分类表里，返回违规项的可读描述；空数组表示全部通过。
 *
 * 内置分类表是分类名的唯一权威。名字对不上只可能是笔误或旧版本遗留，
 * 一旦落地就会在下拉框里凭空多出一个分类，进而让按分类名判断的逻辑（例如
 * 出行区间的居家支出白名单）失效。设计依据见 docs/adr/0007-分类名以分类表为准.md。
 */
export function findUnknownCategories(refs: CategoryRef[], builtin: CategoryConfig): string[] {
  const seen = new Set<string>();
  const unknown: string[] = [];

  for (const ref of refs) {
    const categories = ref.type === 'income' ? builtin.incomeCategories : builtin.expendCategories;
    const label = ref.type === 'income' ? '收入' : '支出';
    const subs = categories[ref.mainCategory];

    let desc: string | null = null;
    if (!subs) {
      desc = `${label} / ${ref.mainCategory}（主分类不在分类表中）`;
    } else if (!subs[ref.subCategory]) {
      desc = `${label} / ${ref.mainCategory} / ${ref.subCategory}（子分类不在分类表中）`;
    }

    if (desc && !seen.has(desc)) {
      seen.add(desc);
      unknown.push(desc);
    }
  }

  return unknown;
}

/**
 * 合并内置配置 + 用户自定义配置
 *
 * 只往分类表里加关键词，绝不新建分类：自定义映射的分类名必须已经存在于内置分类表。
 * 从前这里对缺失的主分类执行 `categories[mainCategory] = {}`，于是编辑器里一个
 * 笔误（交流通信 → 交流通讯）就能凭空长出一个并列的主分类，且此后每次启动都会
 * 重建它。读取侧无从报错，只能丢弃并留下告警。
 */
export function mergeConfigs(base: CategoryConfig, user: UserConfig): CategoryConfig {
  const merged: CategoryConfig = JSON.parse(JSON.stringify(base));

  for (const mapping of user.customMappings) {
    const { keyword, mainCategory, subCategory, type } = mapping;

    const categories = type === 'income' ? merged.incomeCategories : merged.expendCategories;
    const subs = categories[mainCategory];

    if (!subs || !subs[subCategory]) {
      console.warn(
        `[分类表] 已丢弃一条分类不存在的自定义映射：${mainCategory} / ${subCategory} ← ${keyword}`
      );
      continue;
    }

    if (!subs[subCategory].includes(keyword)) {
      subs[subCategory].push(keyword);
    }
  }

  return merged;
}

/**
 * 添加自定义映射词条
 */
export function addCustomMapping(
  keyword: string,
  mainCategory: string,
  subCategory: string,
  type: 'expend' | 'income'
): UserKeywordMapping {
  const userConfig = loadUserConfig();
  
  const mapping: UserKeywordMapping = {
    keyword,
    mainCategory,
    subCategory,
    type,
    createdAt: new Date().toISOString(),
  };
  
  // 避免重复添加
  const exists = userConfig.customMappings.some(
    m => m.keyword === keyword && m.type === type
  );
  
  if (!exists) {
    userConfig.customMappings.push(mapping);
    saveUserConfig(userConfig);
  }
  
  return mapping;
}

/**
 * 删除自定义映射词条
 */
export function removeCustomMapping(keyword: string, type: 'expend' | 'income'): void {
  const userConfig = loadUserConfig();
  userConfig.customMappings = userConfig.customMappings.filter(
    m => !(m.keyword === keyword && m.type === type)
  );
  saveUserConfig(userConfig);
}

/**
 * 添加编辑后的记录
 */
export function addEditedRecord(
  原始备注: string,
  交易日期: string,
  原始分类: string,
  原始子分类: string,
  新分类: string,
  新子分类: string
): EditedRecord {
  const userConfig = loadUserConfig();
  
  const record: EditedRecord = {
    原始备注,
    交易日期,
    原始分类,
    原始子分类,
    新分类,
    新子分类,
    editedAt: new Date().toISOString(),
  };
  
  // 移除同一天同备注的旧编辑记录
  userConfig.editedRecords = userConfig.editedRecords.filter(
    r => !(r.原始备注 === 原始备注 && r.交易日期 === 交易日期)
  );
  
  userConfig.editedRecords.push(record);
  saveUserConfig(userConfig);
  
  return record;
}

/**
 * 清空所有用户配置
 */
export function clearUserConfig(): void {
  localStorage.removeItem(USER_CONFIG_KEY);
}

/**
 * 导入用户配置（用于恢复）
 */
export function importUserConfig(jsonStr: string): boolean {
  try {
    const config: UserConfig = JSON.parse(jsonStr);
    if (config.customMappings && Array.isArray(config.customMappings)) {
      saveUserConfig(config);
      return true;
    }
    return false;
  } catch (e) {
    console.error('导入配置失败', e);
    return false;
  }
}