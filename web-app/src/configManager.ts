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
 * 合并内置配置 + 用户自定义配置
 */
export function mergeConfigs(base: CategoryConfig, user: UserConfig): CategoryConfig {
  const merged: CategoryConfig = JSON.parse(JSON.stringify(base));
  
  // 合并用户自定义映射
  for (const mapping of user.customMappings) {
    const { keyword, mainCategory, subCategory, type } = mapping;
    
    const categories = type === 'income' ? merged.incomeCategories : merged.expendCategories;
    
    if (!categories[mainCategory]) {
      categories[mainCategory] = {};
    }
    if (!categories[mainCategory][subCategory]) {
      categories[mainCategory][subCategory] = [];
    }
    if (!categories[mainCategory][subCategory].includes(keyword)) {
      categories[mainCategory][subCategory].push(keyword);
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
 * 导出用户配置（用于备份）
 */
export function exportUserConfig(): string {
  const config = loadUserConfig();
  return JSON.stringify(config, null, 2);
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