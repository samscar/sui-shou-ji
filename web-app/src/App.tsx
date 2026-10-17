import { useState, useCallback, useEffect } from 'react';
import { parseCCBXLS, parseCCBData, TripOptions } from './parser';
import { exportToExcel } from './excel';
import {
  ExpenseRecord,
  IncomeRecord,
  TransferRecord,
  CategoryConfig,
  UserConfig,
  UserKeywordMapping,
  CCBRow,
  RefundMatch,
  EditedRecord,
  TripRange,
  TripRecord,
} from './types';
import {
  loadDefaultConfig,
  loadUserConfig,
  saveUserConfig,
  mergeConfigs,
  addCustomMapping,
  removeCustomMapping,
  addEditedRecord,
} from './configManager';
import { HOME_MAIN_CATEGORIES, TRIP_TARGET } from './trip';
import { S } from './styles';
import DropZone from './components/DropZone';
import TabBar, { TabItem, TabKey } from './components/TabBar';
import PasswordModal from './components/modals/PasswordModal';
import EditCategoryModal from './components/modals/EditCategoryModal';
import MappingModal from './components/modals/MappingModal';
import ConfigEditorModal from './components/modals/ConfigEditorModal';
import OverviewTab from './tabs/OverviewTab';
import PendingTab from './tabs/PendingTab';
import RefundTab from './tabs/RefundTab';
import TransferTab from './tabs/TransferTab';
import TripTab from './tabs/TripTab';

export default function App() {
  // 文件处理状态
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 解析结果
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [tab, setTab] = useState<TabKey>('overview');

  // 退款配对：原始行留一份，供「剔除清单」恢复某一条时重新解析
  const [rawRows, setRawRows] = useState<CCBRow[]>([]);
  const [refundMatches, setRefundMatches] = useState<RefundMatch[]>([]);
  const [ignoredMatchKeys, setIgnoredMatchKeys] = useState<Set<string>>(new Set());

  // 出行区间：一次性，只活在本次会话
  const [tripRange, setTripRange] = useState<TripRange | null>(null);
  const [tripExcludedKeys, setTripExcludedKeys] = useState<Set<string>>(new Set());
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);

  // 配置管理
  const [config, setConfig] = useState<CategoryConfig | null>(null);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);

  // 弹窗
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | IncomeRecord | null>(null);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [configEditorOpen, setConfigEditorOpen] = useState(false);

  // 初始化配置
  useEffect(() => {
    const defaultConfig = loadDefaultConfig();
    const userCfg = loadUserConfig();
    setConfig(mergeConfigs(defaultConfig, userCfg));
    setUserConfig(userCfg);
  }, []);

  // ESC 关闭弹窗
  useEffect(() => {
    if (!pendingFile && !editingRecord && !mappingModalOpen && !configEditorOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        setPendingFile(null);
        setEditingRecord(null);
        setMappingModalOpen(false);
        setConfigEditorOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingFile, editingRecord, mappingModalOpen, configEditorOpen, loading]);

  /**
   * 唯一的重解析入口。剔除清单的恢复、出行区间的应用与撤销都从这里回到同一份原始行，
   * 保证配对状态、区间状态与交易修正记录不会各算一遍。
   */
  const runParse = useCallback(
    (
      rows: CCBRow[],
      cfg: CategoryConfig,
      edited: EditedRecord[],
      ignored: Set<string>,
      range: TripRange | null,
      excluded: Set<string>
    ) => {
      const options: TripOptions | undefined = range
        ? {
            range,
            target: TRIP_TARGET,
            excludedMainCategories: HOME_MAIN_CATEGORIES,
            excludedKeys: excluded,
          }
        : undefined;

      const result = parseCCBData(rows, cfg, edited, ignored, options);
      setExpenses(result.expenses);
      setIncomes(result.incomes);
      setTransfers(result.transfers);
      setRefundMatches(result.allMatches);
      setTripRecords(result.tripRecords);
      return result;
    },
    []
  );

  // ---- 文件与解析 ----

  const processZip = useCallback(
    async (file: File, password: string) => {
      setFileName(file.name);
      setError(null);
      setExpenses([]);
      setIncomes([]);
      setTransfers([]);
      setTripRecords([]);
      setTripRange(null);
      setTripExcludedKeys(new Set());
      setTab('overview');

      if (!config) {
        setError('配置未加载，请刷新页面重试');
        return;
      }

      setLoading(true);
      try {
        const { ZipReader, BlobReader, BlobWriter } = await import('@zip.js/zip.js');
        const reader = new ZipReader(new BlobReader(file), { password: password.trim() });
        const entries = await reader.getEntries();
        let xlsBlob: Blob | null = null;

        for (const entry of entries) {
          if (
            !entry.directory &&
            (entry.filename.toLowerCase().endsWith('.xls') ||
              entry.filename.toLowerCase().endsWith('.xlsx')) &&
            entry.getData
          ) {
            xlsBlob = await entry.getData!(new BlobWriter());
            break;
          }
        }

        await reader.close();

        if (!xlsBlob) {
          setError('压缩包中未找到 .xls 文件，请确认压缩包内容。');
          return;
        }

        const rows = parseCCBXLS(await xlsBlob.arrayBuffer());
        if (rows.length === 0) {
          setError('XLS 文件中未解析到有效的交易记录。');
          return;
        }

        const emptyIgnored = new Set<string>();
        setRawRows(rows);
        setIgnoredMatchKeys(emptyIgnored);
        const result = runParse(
          rows,
          config,
          userConfig?.editedRecords ?? [],
          emptyIgnored,
          null,
          new Set()
        );

        if (
          result.expenses.length === 0 &&
          result.incomes.length === 0 &&
          result.transfers.length === 0
        ) {
          setError('未能识别任何交易记录，请检查 XLS 文件格式是否与建设银行流水格式一致。');
        }
      } catch (err: any) {
        console.error(err);
        if (err.message?.includes('password') || err.message?.includes('encrypted')) {
          setError('解压密码错误，请检查后重试。');
        } else if (err.message?.includes('format')) {
          setError('无法解析该文件，请确认是建设银行流水压缩包。');
        } else {
          setError(`处理失败：${err.message || '未知错误'}`);
        }
      } finally {
        setLoading(false);
      }
    },
    [config, userConfig, runParse]
  );

  const openPasswordModal = useCallback((file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('请选择 .zip 压缩包文件');
      return;
    }
    setPendingFile(file);
  }, []);

  const closePasswordModal = useCallback(() => {
    if (loading) return;
    setPendingFile(null);
  }, [loading]);

  // ---- 剔除清单 ----

  const toggleMatch = (key: string) => {
    if (!config || rawRows.length === 0) return;
    const next = new Set(ignoredMatchKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);

    setIgnoredMatchKeys(next);
    runParse(rawRows, config, userConfig?.editedRecords ?? [], next, tripRange, tripExcludedKeys);
  };

  // ---- 出行区间 ----

  const applyTrip = (start: string, end: string) => {
    if (!config || rawRows.length === 0) return;
    const range: TripRange = { start, end };
    const emptyExcluded = new Set<string>();

    setTripRange(range);
    setTripExcludedKeys(emptyExcluded);
    runParse(rawRows, config, userConfig?.editedRecords ?? [], ignoredMatchKeys, range, emptyExcluded);
  };

  const clearTrip = () => {
    if (!config || rawRows.length === 0) return;
    setTripRange(null);
    setTripExcludedKeys(new Set());
    runParse(rawRows, config, userConfig?.editedRecords ?? [], ignoredMatchKeys, null, new Set());
  };

  const toggleTripRecord = (key: string) => {
    if (!config || !tripRange || rawRows.length === 0) return;
    const next = new Set(tripExcludedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);

    setTripExcludedKeys(next);
    runParse(rawRows, config, userConfig?.editedRecords ?? [], ignoredMatchKeys, tripRange, next);
  };

  // ---- 编辑分类 ----

  const handleSaveEdit = (main: string, sub: string) => {
    if (!editingRecord || !userConfig) return;

    addEditedRecord(
      editingRecord.备注,
      editingRecord.日期,
      editingRecord.分类,
      editingRecord.子分类,
      main,
      sub
    );
    const latest = loadUserConfig();
    setUserConfig(latest);

    // addEditedRecord 已记下本次编辑，重新解析会通过 findEditedRecord 自动应用
    if (config && rawRows.length > 0) {
      runParse(rawRows, config, latest.editedRecords, ignoredMatchKeys, tripRange, tripExcludedKeys);
    }
    setEditingRecord(null);
  };

  // ---- 配置管理 ----

  const refreshConfig = () => {
    const latest = loadUserConfig();
    setUserConfig(latest);
    setConfig(mergeConfigs(loadDefaultConfig(), latest));
    return latest;
  };

  const handleAddMapping = (keyword: string, type: 'expend' | 'income', main: string, sub: string) => {
    if (!keyword || !main || !sub) return;
    addCustomMapping(keyword, main, sub, type);
    refreshConfig();
    setMappingModalOpen(false);
  };

  const handleRemoveMapping = (keyword: string, type: 'expend' | 'income') => {
    removeCustomMapping(keyword, type);
    refreshConfig();
  };

  const handleExportConfig = () => {
    if (!config) return;
    const exportData = {
      version: '1.0.0',
      expendCategories: config.expendCategories,
      incomeCategories: config.incomeCategories,
      wealthManagementKeywords: config.wealthManagementKeywords,
      merchantKeywords: config.merchantKeywords,
      _meta: {
        exportTime: new Date().toISOString(),
        customMappingsCount: userConfig?.customMappings.length || 0,
        editedRecordsCount: userConfig?.editedRecords.length || 0,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `分类表-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setConfigEditorOpen(false);
    alert(
      '分类表已下载。\n\n' +
        '用途：备份，或在另一台设备打开本页面后用「导入配置」载入。\n' +
        '如需让本机立即生效，请改用「保存并生效」。'
    );
  };

  /** 从 categories.json 格式中提取用户自定义映射（比对内置配置） */
  const extractCustomMappings = (
    imported: any,
    defaultConfig: CategoryConfig
  ): UserKeywordMapping[] => {
    const mappings: UserKeywordMapping[] = [];
    const collect = (
      source: Record<string, Record<string, string[]>>,
      base: Record<string, Record<string, string[]>>,
      type: 'expend' | 'income'
    ) => {
      for (const [mainCat, subCats] of Object.entries(source || {})) {
        for (const [subCat, keywords] of Object.entries(subCats as Record<string, string[]>)) {
          const builtin = base[mainCat]?.[subCat] || [];
          for (const keyword of (keywords as string[]).filter((k) => !builtin.includes(k))) {
            mappings.push({
              keyword,
              mainCategory: mainCat,
              subCategory: subCat,
              type,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    };
    collect(imported.expendCategories, defaultConfig.expendCategories, 'expend');
    collect(imported.incomeCategories, defaultConfig.incomeCategories, 'income');
    return mappings;
  };

  const handleImportConfig = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        // 格式一：categories.json 格式（含 expendCategories）
        if (data.expendCategories && data.incomeCategories) {
          const newUserConfig: UserConfig = {
            customMappings: extractCustomMappings(data, loadDefaultConfig()),
            editedRecords: [],
            updatedAt: new Date().toISOString(),
          };
          saveUserConfig(newUserConfig);
          setUserConfig(newUserConfig);
          setConfig(mergeConfigs(loadDefaultConfig(), newUserConfig));
          alert(
            `导入成功。\n\n· 自定义映射词条：${newUserConfig.customMappings.length} 条\n\n` +
              '注意：分类表格式不含交易修正记录，本次未导入任何修正。\n' +
              '交易修正记录只存在于本浏览器，无法通过文件迁移。'
          );
          return;
        }

        // 格式二：用户配置格式（含 customMappings）
        if (data.customMappings && Array.isArray(data.customMappings)) {
          const newUserConfig: UserConfig = {
            customMappings: data.customMappings,
            editedRecords: data.editedRecords || [],
            updatedAt: new Date().toISOString(),
          };
          saveUserConfig(newUserConfig);
          setUserConfig(newUserConfig);
          setConfig(mergeConfigs(loadDefaultConfig(), newUserConfig));
          alert(
            `导入成功！\n- 映射词条：${newUserConfig.customMappings.length} 条\n` +
              `- 编辑记录：${newUserConfig.editedRecords.length} 条`
          );
          return;
        }

        alert(
          '配置文件格式不正确\n\n支持格式：\n1. categories.json（包含 expendCategories）\n2. 用户配置文件（包含 customMappings）'
        );
      } catch (err) {
        alert('导入失败：' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const openConfigEditor = () => {
    if (!config) return;
    setConfigEditorOpen(true);
  };

  const configEditorJson = config
    ? JSON.stringify(
        {
          version: '1.0.0',
          expendCategories: config.expendCategories,
          incomeCategories: config.incomeCategories,
          wealthManagementKeywords: config.wealthManagementKeywords,
          merchantKeywords: config.merchantKeywords,
        },
        null,
        2
      )
    : '';

  /**
   * 保存并生效。单文件交付形态下用户没有源码目录，因此把编辑结果与内置分类表比对出的差异
   * 写入用户修改（localStorage），无需刷新页面即刻生效。
   */
  const handleApplyConfig = (text: string): string | null => {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return 'JSON 格式错误：' + (err as Error).message;
    }
    if (!parsed.expendCategories || !parsed.incomeCategories) {
      return '配置格式错误：必须包含 expendCategories 和 incomeCategories';
    }

    const newUserConfig: UserConfig = {
      customMappings: extractCustomMappings(parsed, loadDefaultConfig()),
      // 分类表编辑器不涉及交易修正，原样保留已有编辑记录
      editedRecords: userConfig?.editedRecords ?? [],
      updatedAt: new Date().toISOString(),
    };
    saveUserConfig(newUserConfig);
    setUserConfig(newUserConfig);
    setConfig(mergeConfigs(loadDefaultConfig(), newUserConfig));
    setConfigEditorOpen(false);
    alert(
      `已保存并生效。\n\n· 自定义映射词条：${newUserConfig.customMappings.length} 条\n` +
        `· 交易修正记录：${newUserConfig.editedRecords.length} 条（本次未改动）`
    );
    return null;
  };

  const handleDownloadConfig = (text: string): string | null => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed.expendCategories || !parsed.incomeCategories) {
        return '配置格式错误：必须包含 expendCategories 和 incomeCategories';
      }
    } catch (err) {
      return 'JSON 格式错误：' + (err as Error).message;
    }

    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `分类表-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return null;
  };

  // ---- 导出与 Tab ----

  const hasData = expenses.length > 0 || incomes.length > 0 || transfers.length > 0;

  const pendingExpenses = expenses.filter((e) => e.分类 === '其他杂项');
  const pendingIncomes = incomes.filter((i) => i.分类 === '其他收入');
  const tripActive = tripRecords.filter((r) => !r.撤销).length;

  const tabs: TabItem[] = [
    { key: 'overview', label: '概览' },
    {
      key: 'pending',
      label: '待分类',
      count: pendingExpenses.length + pendingIncomes.length,
      disabled: pendingExpenses.length + pendingIncomes.length === 0,
    },
    {
      key: 'refund',
      label: '退款剔除',
      count: refundMatches.length,
      disabled: refundMatches.length === 0,
    },
    { key: 'transfer', label: '转账', count: transfers.length, disabled: transfers.length === 0 },
    { key: 'trip', label: '出行区间', count: tripActive },
  ];

  const pendingCount = pendingExpenses.length + pendingIncomes.length;

  // 当前 Tab 因数据变化而变空时，退回概览
  useEffect(() => {
    const current = tabs.find((t) => t.key === tab);
    if (current?.disabled) setTab('overview');
  }, [tab, pendingCount, refundMatches.length, transfers.length]);

  return (
    <div style={S.container}>
      <h1 style={S.title}>建设银行流水 → 随手记</h1>
      <p style={S.subtitle}>
        拖拽建设银行流水压缩包到下方区域，在弹窗中输入解压密码，一键生成随手记账单
      </p>

      <DropZone
        fileName={fileName}
        loading={loading}
        dragOver={dragOver}
        onFileSelect={openPasswordModal}
        onDragOver={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
      />

      {error && <div style={S.errorBox}>{error}</div>}

      {hasData && (
        <>
          <TabBar
            tabs={tabs}
            active={tab}
            onChange={setTab}
            onExport={() => exportToExcel(expenses, incomes, transfers)}
            onOpenMapping={() => setMappingModalOpen(true)}
          />

          {tab === 'overview' && (
            <OverviewTab
              expenses={expenses}
              incomes={incomes}
              transfers={transfers}
              pendingExpenses={pendingExpenses.length}
              pendingIncomes={pendingIncomes.length}
              tripApplied={tripActive}
              refundPairs={refundMatches.length - ignoredMatchKeys.size}
              onGoTab={setTab}
            />
          )}

          {tab === 'pending' && (
            <PendingTab
              expenses={pendingExpenses}
              incomes={pendingIncomes}
              onEdit={setEditingRecord}
            />
          )}

          {tab === 'refund' && (
            <RefundTab matches={refundMatches} ignoredKeys={ignoredMatchKeys} onToggle={toggleMatch} />
          )}

          {tab === 'transfer' && <TransferTab transfers={transfers} />}

          {tab === 'trip' && (
            <TripTab
              applied={tripRange}
              records={tripRecords}
              onApply={applyTrip}
              onClear={clearTrip}
              onToggle={toggleTripRecord}
            />
          )}
        </>
      )}

      {pendingFile && (
        <PasswordModal
          fileName={pendingFile.name}
          loading={loading}
          onConfirm={(pwd) => {
            const file = pendingFile;
            setPendingFile(null);
            processZip(file, pwd);
          }}
          onClose={closePasswordModal}
        />
      )}

      {editingRecord && config && (
        <EditCategoryModal
          record={editingRecord}
          config={config}
          onSave={handleSaveEdit}
          onClose={() => setEditingRecord(null)}
        />
      )}

      {mappingModalOpen && config && userConfig && (
        <MappingModal
          config={config}
          userConfig={userConfig}
          onAddMapping={handleAddMapping}
          onRemoveMapping={handleRemoveMapping}
          onExportConfig={handleExportConfig}
          onImportConfig={handleImportConfig}
          onOpenEditor={openConfigEditor}
          onClose={() => setMappingModalOpen(false)}
        />
      )}

      {configEditorOpen && (
        <ConfigEditorModal
          initialJson={configEditorJson}
          onApply={handleApplyConfig}
          onDownload={handleDownloadConfig}
          onClose={() => setConfigEditorOpen(false)}
        />
      )}
    </div>
  );
}
