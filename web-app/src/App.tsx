import { useState, useCallback, useRef, useEffect } from 'react';
import { parseCCBXLS, parseCCBData } from './parser';
import { exportToExcel } from './excel';
import {
  ExpenseRecord,
  IncomeRecord,
  TransferRecord,
  CategoryConfig,
  UserConfig,
  UserKeywordMapping,
} from './types';
import {
  loadDefaultConfig,
  loadUserConfig,
  mergeConfigs,
  addCustomMapping,
  removeCustomMapping,
  addEditedRecord,
} from './configManager';

// 样式常量保持不变（略，为了节省篇幅）
const S = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,
  title: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  dropZone: {
    border: '2px dashed',
    borderRadius: '16px',
    padding: '48px 24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    marginBottom: '24px',
    backgroundColor: '#fafbfc',
  },
  dropZoneActive: {
    borderColor: '#4f6ef7',
    backgroundColor: '#eef2ff',
  },
  dropZoneIdle: {
    borderColor: '#d0d5dd',
  },
  dropIcon: {
    fontSize: '42px',
    marginBottom: '12px',
  },
  dropText: {
    fontSize: '16px',
    color: '#333',
    fontWeight: 600,
    marginBottom: '6px',
  },
  dropHint: {
    fontSize: '13px',
    color: '#999',
  },
  button: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    backgroundColor: '#4f6ef7',
    color: '#fff',
  },
  buttonSuccess: {
    backgroundColor: '#22c55e',
    color: '#fff',
  },
  buttonWarning: {
    backgroundColor: '#f59e0b',
    color: '#fff',
  },
  buttonSecondary: {
    backgroundColor: '#6b7280',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  errorBox: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '20px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    padding: '16px',
    borderRadius: '10px',
    textAlign: 'center' as const,
    color: '#fff',
  },
  statLabel: {
    fontSize: '13px',
    opacity: 0.85,
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '2px',
  },
  statSub: {
    fontSize: '12px',
    opacity: 0.75,
  },
  tableBox: {
    marginBottom: '24px',
  },
  tableTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
    marginBottom: '16px',
  },
  th: {
    textAlign: 'left' as const,
    padding: '8px 10px',
    borderBottom: '2px solid #e5e7eb',
    color: '#6b7280',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '7px 10px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  },
  amountRed: {
    color: '#ef4444',
    fontWeight: 500,
  },
  amountGreen: {
    color: '#22c55e',
    fontWeight: 500,
  },
  helpBox: {
    marginTop: '40px',
    padding: '16px 20px',
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#888',
    lineHeight: 1.7,
    border: '1px solid #e5e7eb',
  },
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.18)',
    padding: '24px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '12px',
  },
  modalSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '18px',
    wordBreak: 'break-all' as const,
  },
  modalFieldLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#374151',
    fontWeight: 600,
    marginBottom: '6px',
  },
  passwordWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  passwordInputInModal: {
    width: '100%',
    padding: '10px 44px 10px 14px',
    border: '1px solid #d0d5dd',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  eyeButton: {
    position: 'absolute' as const,
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px 6px',
    fontSize: '14px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  },
  buttonGhost: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  modalError: {
    fontSize: '13px',
    color: '#dc2626',
    marginTop: '8px',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  editIcon: {
    cursor: 'pointer',
    fontSize: '16px',
    marginLeft: '6px',
    opacity: 0.6,
  },
  categorySelect: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d0d5dd',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '12px',
  },
};

const MAX_PREVIEW = 50;

export default function App() {
  // 文件处理状态
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 解析结果
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);

  // 配置管理
  const [config, setConfig] = useState<CategoryConfig | null>(null);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);

  // 编辑功能
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | IncomeRecord | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');

  // 映射词条管理
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [configEditorOpen, setConfigEditorOpen] = useState(false);
  const [configJsonText, setConfigJsonText] = useState('');
  const [configEditError, setConfigEditError] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordType, setNewKeywordType] = useState<'expend' | 'income'>('expend');
  const [newKeywordMainCat, setNewKeywordMainCat] = useState('');
  const [newKeywordSubCat, setNewKeywordSubCat] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化配置
  useEffect(() => {
    const defaultConfig = loadDefaultConfig();
    const userCfg = loadUserConfig();
    const merged = mergeConfigs(defaultConfig, userCfg);
    setConfig(merged);
    setUserConfig(userCfg);
  }, []);

  // ESC 关闭弹窗
  useEffect(() => {
    if (!pendingFile && !editModalOpen && !mappingModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        setPendingFile(null);
        setEditModalOpen(false);
        setMappingModalOpen(false);
        setPassword('');
        setShowPassword(false);
        setModalError(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingFile, editModalOpen, mappingModalOpen, loading]);

  // 处理文件
  const processZip = useCallback(
    async (file: File, pwd: string) => {
      setFileName(file.name);
      setError(null);
      setExpenses([]);
      setIncomes([]);
      setTransfers([]);

      if (!config) {
        setError('配置未加载，请刷新页面重试');
        return;
      }

      setLoading(true);
      try {
        const { ZipReader, BlobReader, BlobWriter } = await import('@zip.js/zip.js');

        const reader = new ZipReader(new BlobReader(file), {
          password: pwd.trim(),
        });

        const entries = await reader.getEntries();
        let xlsBlob: Blob | null = null;

        for (const entry of entries) {
          if (
            !entry.directory &&
            (entry.filename.toLowerCase().endsWith('.xls') ||
              entry.filename.toLowerCase().endsWith('.xlsx'))
          ) {
            if (entry.getData) {
              xlsBlob = await entry.getData!(new BlobWriter());
              break;
            }
          }
        }

        await reader.close();

        if (!xlsBlob) {
          setError('压缩包中未找到 .xls 文件，请确认压缩包内容。');
          setLoading(false);
          return;
        }

        const arrayBuffer = await xlsBlob.arrayBuffer();
        const rows = parseCCBXLS(arrayBuffer);

        if (rows.length === 0) {
          setError('XLS 文件中未解析到有效的交易记录。');
          setLoading(false);
          return;
        }

        // 使用合并后的配置 + 用户编辑记录
        const result = parseCCBData(rows, config, userConfig?.editedRecords || []);
        setExpenses(result.expenses);
        setIncomes(result.incomes);
        setTransfers(result.transfers);

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
    [config, userConfig]
  );

  const openPasswordModal = useCallback((file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('请选择 .zip 压缩包文件');
      return;
    }
    setPendingFile(file);
    setPassword('');
    setShowPassword(false);
    setModalError(null);
  }, []);

  const closePasswordModal = useCallback(() => {
    if (loading) return;
    setPendingFile(null);
    setPassword('');
    setShowPassword(false);
    setModalError(null);
  }, [loading]);

  const handleConfirmPassword = useCallback(async () => {
    if (!pendingFile) return;
    if (!password.trim()) {
      setModalError('请输入压缩包解压密码');
      return;
    }
    const file = pendingFile;
    setPendingFile(null);
    setPassword('');
    setShowPassword(false);
    setModalError(null);
    await processZip(file, password);
  }, [pendingFile, password, processZip]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) openPasswordModal(file);
    },
    [openPasswordModal]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) openPasswordModal(file);
    },
    [openPasswordModal]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleExport = () => {
    exportToExcel(expenses, incomes, transfers);
  };

  // 编辑记录
  const openEditModal = (record: ExpenseRecord | IncomeRecord) => {
    setEditingRecord(record);
    // 进入此弹窗的记录均为未分类项（分类为“其他杂项/其他收入”，子分类为占位值）。
    // 这些值并不在可选分类配置中，若直接预填会导致：主分类下拉框显示异常、子分类下拉框无选项，
    // 且保存时会把“其他杂项”原样写回，表现为“编辑分类不生效”。
    // 因此仅当当前值属于有效配置项时才预填，否则置空，强制用户重新选择有效分类。
    const cats = config
      ? '支出账户' in record
        ? config.expendCategories
        : config.incomeCategories
      : undefined;
    const mainValid = !!cats && record.分类 in cats;
    const subMap = mainValid ? cats![record.分类] : undefined;
    const subValid = !!subMap && record.子分类 in subMap;
    setSelectedCategory(mainValid ? record.分类 : '');
    setSelectedSubCategory(subValid ? record.子分类 : '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingRecord || !userConfig) return;

    addEditedRecord(
      editingRecord.备注,
      editingRecord.日期,
      editingRecord.分类,
      editingRecord.子分类,
      selectedCategory,
      selectedSubCategory
    );

    // 更新本地状态
    const newUserConfig = loadUserConfig();
    setUserConfig(newUserConfig);

    // 直接修改当前记录的分类（注：addEditedRecord 已记录本次编辑，
    // 后续重新解析时会通过 findEditedRecord 自动应用，无需在此重新解析原始数据）
    if (config) {
      if ('支出账户' in editingRecord) {
        setExpenses(prev =>
          prev.map(e =>
            e.备注 === editingRecord.备注 && e.日期 === editingRecord.日期
              ? { ...e, 分类: selectedCategory, 子分类: selectedSubCategory }
              : e
          )
        );
      } else {
        setIncomes(prev =>
          prev.map(i =>
            i.备注 === editingRecord.备注 && i.日期 === editingRecord.日期
              ? { ...i, 分类: selectedCategory, 子分类: selectedSubCategory }
              : i
          )
        );
      }
    }

    setEditModalOpen(false);
    setEditingRecord(null);
  };

  // 添加映射词条
  const handleAddMapping = () => {
    if (!newKeyword.trim() || !newKeywordMainCat || !newKeywordSubCat) return;

    addCustomMapping(newKeyword.trim(), newKeywordMainCat, newKeywordSubCat, newKeywordType);

    // 刷新配置
    const newUserConfig = loadUserConfig();
    setUserConfig(newUserConfig);
    const merged = mergeConfigs(loadDefaultConfig(), newUserConfig);
    setConfig(merged);

    // 清空表单
    setNewKeyword('');
    setNewKeywordMainCat('');
    setNewKeywordSubCat('');
    setMappingModalOpen(false);
  };

  // 打开配置编辑器
  const openConfigEditor = () => {
    if (!config) return;
    
    // 将当前配置转为 JSON 文本（去掉 _meta）
    const configForEdit = {
      version: '1.0.0',
      expendCategories: config.expendCategories,
      incomeCategories: config.incomeCategories,
      wealthManagementKeywords: config.wealthManagementKeywords,
      merchantKeywords: config.merchantKeywords,
    };
    
    setConfigJsonText(JSON.stringify(configForEdit, null, 2));
    setConfigEditError(null);
    setConfigEditorOpen(true);
  };

  // 从编辑器下载配置文件
  const handleDownloadConfig = () => {
    try {
      // 验证 JSON 格式
      const parsed = JSON.parse(configJsonText);
      
      if (!parsed.expendCategories || !parsed.incomeCategories) {
        setConfigEditError('配置格式错误：必须包含 expendCategories 和 incomeCategories');
        return;
      }
      
      // 下载文件
      const blob = new Blob([configJsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'categories.json';
      a.click();
      URL.revokeObjectURL(url);
      
      setConfigEditorOpen(false);
      alert('配置文件已下载！\n\n请将下载的 categories.json 文件复制到：\nweb-app/src/config/categories.json\n然后刷新页面即可生效。');
    } catch (err) {
      setConfigEditError('JSON 格式错误：' + (err as Error).message);
    }
  };

  // 导出配置（下载）
  const handleExportConfig = () => {
    if (!config) return;
    
    // 导出格式和 categories.json 一致，可直接替换文件
    const exportData = {
      version: '1.0.0',
      expendCategories: config.expendCategories,
      incomeCategories: config.incomeCategories,
      wealthManagementKeywords: config.wealthManagementKeywords,
      merchantKeywords: config.merchantKeywords,
      // 元数据（可选，用于追踪）
      _meta: {
        exportTime: new Date().toISOString(),
        customMappingsCount: userConfig?.customMappings.length || 0,
        editedRecordsCount: userConfig?.editedRecords.length || 0,
      }
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入配置
  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json);
        
        // 格式一：categories.json 格式（包含 expendCategories）
        if (data.expendCategories && data.incomeCategories) {
          // 保存到 localStorage，作为自定义配置
          const newUserConfig: UserConfig = {
            customMappings: extractCustomMappings(data, loadDefaultConfig()),
            editedRecords: [],
            updatedAt: new Date().toISOString(),
          };
          
          localStorage.setItem('ccb-to-sui-user-config', JSON.stringify(newUserConfig));
          
          // 刷新配置
          setUserConfig(newUserConfig);
          const merged = mergeConfigs(loadDefaultConfig(), newUserConfig);
          setConfig(merged);
          
          alert(`导入成功！\n已从 categories.json 格式文件中提取 ${newUserConfig.customMappings.length} 条映射词条`);
          return;
        }
        
        // 格式二：用户配置格式（包含 customMappings）
        if (data.customMappings && Array.isArray(data.customMappings)) {
          const newUserConfig: UserConfig = {
            customMappings: data.customMappings,
            editedRecords: data.editedRecords || [],
            updatedAt: new Date().toISOString(),
          };
          
          localStorage.setItem('ccb-to-sui-user-config', JSON.stringify(newUserConfig));
          
          setUserConfig(newUserConfig);
          const merged = mergeConfigs(loadDefaultConfig(), newUserConfig);
          setConfig(merged);
          
          alert(`导入成功！\n- 映射词条：${newUserConfig.customMappings.length} 条\n- 编辑记录：${newUserConfig.editedRecords.length} 条`);
          return;
        }
        
        alert('配置文件格式不正确\n\n支持格式：\n1. categories.json（包含 expendCategories）\n2. 用户配置文件（包含 customMappings）');
      } catch (err) {
        alert('导入失败：' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 从 categories.json 格式中提取用户自定义映射（比对内置配置）
  const extractCustomMappings = (imported: any, defaultConfig: CategoryConfig): UserKeywordMapping[] => {
    const mappings: UserKeywordMapping[] = [];
    
    // 提取支出分类
    for (const [mainCat, subCats] of Object.entries(imported.expendCategories || {})) {
      for (const [subCat, keywords] of Object.entries(subCats as Record<string, string[]>)) {
        const defaultKeywords = defaultConfig.expendCategories[mainCat]?.[subCat] || [];
        const newKeywords = (keywords as string[]).filter(k => !defaultKeywords.includes(k));
        
        for (const keyword of newKeywords) {
          mappings.push({
            keyword,
            mainCategory: mainCat,
            subCategory: subCat,
            type: 'expend',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    
    // 提取收入分类
    for (const [mainCat, subCats] of Object.entries(imported.incomeCategories || {})) {
      for (const [subCat, keywords] of Object.entries(subCats as Record<string, string[]>)) {
        const defaultKeywords = defaultConfig.incomeCategories[mainCat]?.[subCat] || [];
        const newKeywords = (keywords as string[]).filter(k => !defaultKeywords.includes(k));
        
        for (const keyword of newKeywords) {
          mappings.push({
            keyword,
            mainCategory: mainCat,
            subCategory: subCat,
            type: 'income',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    
    return mappings;
  };

  // 统计
  const totalExpense = expenses.reduce((s, r) => s + r.金额, 0);
  const totalIncome = incomes.reduce((s, r) => s + r.金额, 0);
  const totalTransfer = transfers.reduce((s, r) => s + r.金额, 0);
  const hasData = expenses.length > 0 || incomes.length > 0 || transfers.length > 0;

  // 筛选"其他杂项"
  const otherExpenses = expenses.filter(e => e.分类 === '其他杂项');
  const otherIncomes = incomes.filter(i => i.分类 === '其他收入');

  return (
    <div style={S.container}>
      <h1 style={S.title}>建设银行流水 → 随手记</h1>
      <p style={S.subtitle}>
        拖拽建设银行流水压缩包到下方区域，在弹窗中输入解压密码，一键生成随手记账单
      </p>

      {/* 拖拽区域 */}
      <div
        style={{
          ...S.dropZone,
          ...(dragOver ? S.dropZoneActive : S.dropZoneIdle),
          ...(loading ? { opacity: 0.6, cursor: 'wait' } : {}),
        }}
        onClick={() => !loading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div style={S.dropIcon}>{loading ? '⏳' : '📁'}</div>
        <div style={S.dropText}>
          {loading ? '正在处理中...' : '拖拽 .zip 文件到此处'}
        </div>
        <div style={S.dropHint}>
          {fileName ? `已选择：${fileName}` : '或点击选择文件'}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* 错误提示 */}
      {error && <div style={S.errorBox}>{error}</div>}

      {/* 统计 */}
      {hasData && (
        <>
          <div style={S.statsGrid}>
            <div style={{ ...S.statCard, backgroundColor: '#ef4444' }}>
              <div style={S.statLabel}>支出</div>
              <div style={S.statValue}>¥{totalExpense.toFixed(2)}</div>
              <div style={S.statSub}>{expenses.length} 笔</div>
            </div>
            <div style={{ ...S.statCard, backgroundColor: '#22c55e' }}>
              <div style={S.statLabel}>收入</div>
              <div style={S.statValue}>¥{totalIncome.toFixed(2)}</div>
              <div style={S.statSub}>{incomes.length} 笔</div>
            </div>
            <div style={{ ...S.statCard, backgroundColor: '#6366f1' }}>
              <div style={S.statLabel}>转账</div>
              <div style={S.statValue}>¥{totalTransfer.toFixed(2)}</div>
              <div style={S.statSub}>{transfers.length} 笔</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExport}
              style={{ ...S.button, ...S.buttonSuccess, padding: '12px 40px', fontSize: '15px' }}
            >
              导出随手记账单 (.xlsx)
            </button>
            {(otherExpenses.length > 0 || otherIncomes.length > 0) && (
              <button
                onClick={() => setMappingModalOpen(true)}
                style={{ ...S.button, ...S.buttonWarning, padding: '12px 24px' }}
              >
                管理分类映射
              </button>
            )}
          </div>

          {/* 待分类记录提示 */}
          {otherExpenses.length === 0 && otherIncomes.length === 0 && transfers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#22c55e' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>所有记录已分类完成</div>
            </div>
          )}

          {/* 支出表格 - 只显示其他杂项 */}
          {otherExpenses.length > 0 && (
            <div style={S.tableBox}>
              <div style={S.tableTitle}>
                待分类支出记录 ({otherExpenses.length} 笔)
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>日期</th>
                    <th style={S.th}>分类</th>
                    <th style={S.th}>子分类</th>
                    <th style={S.th}>金额</th>
                    <th style={S.th}>商家</th>
                    <th style={S.th}>备注</th>
                    <th style={S.th}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {otherExpenses.map((r, i) => (
                    <tr key={i}>
                      <td style={S.td}>{r.日期}</td>
                      <td style={{ ...S.td, color: '#f59e0b', fontWeight: 500 }}>
                        {r.分类}
                      </td>
                      <td style={S.td}>{r.子分类}</td>
                      <td style={{ ...S.td, ...S.amountRed }}>-¥{r.金额.toFixed(2)}</td>
                      <td style={S.td}>{r.商家}</td>
                      <td style={{ ...S.td, maxWidth: '400px', wordBreak: 'break-word' }}>
                        {r.备注}
                      </td>
                      <td style={S.td}>
                        <button
                          onClick={() => openEditModal(r)}
                          style={{ ...S.button, ...S.buttonPrimary, padding: '4px 8px', fontSize: '12px' }}
                        >
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 收入表格 - 只显示其他收入 */}
          {otherIncomes.length > 0 && (
            <div style={S.tableBox}>
              <div style={S.tableTitle}>
                待分类收入记录 ({otherIncomes.length} 笔)
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>日期</th>
                    <th style={S.th}>分类</th>
                    <th style={S.th}>子分类</th>
                    <th style={S.th}>金额</th>
                    <th style={S.th}>备注</th>
                    <th style={S.th}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {otherIncomes.map((r, i) => (
                    <tr key={i}>
                      <td style={S.td}>{r.日期}</td>
                      <td style={{ ...S.td, color: '#f59e0b', fontWeight: 500 }}>
                        {r.分类}
                      </td>
                      <td style={S.td}>{r.子分类}</td>
                      <td style={{ ...S.td, ...S.amountGreen }}>+¥{r.金额.toFixed(2)}</td>
                      <td style={{ ...S.td, maxWidth: '400px', wordBreak: 'break-word' }}>
                        {r.备注}
                      </td>
                      <td style={S.td}>
                        <button
                          onClick={() => openEditModal(r)}
                          style={{ ...S.button, ...S.buttonPrimary, padding: '4px 8px', fontSize: '12px' }}
                        >
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 转账表格 */}
          {transfers.length > 0 && (
            <div style={S.tableBox}>
              <div style={S.tableTitle}>
                转账记录 ({transfers.length} 笔)
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
                  {transfers.slice(0, MAX_PREVIEW).map((r, i) => (
                    <tr key={i}>
                      <td style={S.td}>{r.日期}</td>
                      <td style={S.td}>{r.转出账户}</td>
                      <td style={S.td}>{r.转入账户}</td>
                      <td style={S.td}>¥{r.金额.toFixed(2)}</td>
                      <td style={{ ...S.td, maxWidth: '400px', wordBreak: 'break-word' }}>
                        {r.备注}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 帮助说明 */}
      <div style={S.helpBox}>
        <strong>使用说明：</strong>
        <br />
        1. 从建设银行网上银行下载流水文件（.zip 格式压缩包）
        <br />
        2. 将压缩包拖拽到上方区域，或点击选择文件
        <br />
        3. 在弹出的对话框中输入您在银行设置的解压密码
        <br />
        4. 系统将自动解析 XLS 流水数据，按随手记格式分类
        <br />
        5. <strong>表格仅显示待分类的记录</strong>（其他杂项/其他收入），点击「编辑」按钮可修改分类
        <br />
        6. 点击「管理分类映射」可添加新关键词，后续解析将自动应用
        <br />
        7. 点击"导出"按钮下载随手记可导入的 Excel 文件
        <br />
        <br />
        <strong>注意：</strong>
        <br />
        - 所有处理均在您的浏览器本地完成，密码和文件不会上传到任何服务器
        <br />
        - 编辑记录和自定义关键词会保存在浏览器 localStorage 中，清除浏览器数据后会丢失
      </div>

      {/* 密码输入弹窗 */}
      {pendingFile && (
        <div
          style={S.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePasswordModal();
          }}
        >
          <div style={S.modal} role="dialog" aria-modal="true" aria-label="输入解压密码">
            <div style={S.modalTitle}>输入解压密码</div>
            <div style={S.modalSubtitle}>
              文件：{pendingFile.name}
            </div>
            <label style={S.modalFieldLabel} htmlFor="zip-password">解压密码</label>
            <div style={S.passwordWrapper}>
              <input
                id="zip-password"
                autoFocus
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入压缩包解压密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (modalError) setModalError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmPassword();
                }}
                style={S.passwordInputInModal}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={S.eyeButton}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                title={showPassword ? '隐藏密码' : '显示密码'}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {modalError && <div style={S.modalError}>{modalError}</div>}
            <div style={S.modalActions}>
              <button
                onClick={closePasswordModal}
                style={{ ...S.button, ...S.buttonGhost }}
                disabled={loading}
              >
                取消
              </button>
              <button
                onClick={handleConfirmPassword}
                style={{ ...S.button, ...S.buttonPrimary }}
                disabled={loading}
              >
                {loading ? '处理中...' : '确认解压'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑分类弹窗 */}
      {editModalOpen && editingRecord && (
        <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && setEditModalOpen(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>修改分类</div>
            <div style={S.modalSubtitle}>
              备注：{editingRecord.备注}
            </div>
            
            <label style={S.modalFieldLabel}>主分类</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory('');
              }}
              style={S.categorySelect}
            >
              <option value="">请选择主分类</option>
              {config && Object.keys('支出账户' in editingRecord ? config.expendCategories : config.incomeCategories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <label style={S.modalFieldLabel}>子分类</label>
            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              style={S.categorySelect}
              disabled={!selectedCategory}
            >
              <option value="">请选择子分类</option>
              {config && selectedCategory && (
                '支出账户' in editingRecord
                  ? Object.keys(config.expendCategories[selectedCategory] || {}).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))
                  : Object.keys(config.incomeCategories[selectedCategory] || {}).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))
              )}
            </select>

            <div style={S.modalActions}>
              <button
                onClick={() => setEditModalOpen(false)}
                style={{ ...S.button, ...S.buttonGhost }}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                style={{ ...S.button, ...S.buttonPrimary }}
                disabled={!selectedCategory || !selectedSubCategory}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 映射词条管理弹窗 */}
      {mappingModalOpen && (
        <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && setMappingModalOpen(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>管理分类映射</div>
            <div style={S.modalSubtitle}>
              添加关键词到分类的映射，新增后将自动应用到后续解析
            </div>

            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px' }}>新增映射词条</div>
              
              <label style={S.modalFieldLabel}>关键词</label>
              <input
                type="text"
                placeholder="例如：肯德基"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                style={{ ...S.passwordInputInModal, marginBottom: '12px' }}
              />

              <label style={S.modalFieldLabel}>交易类型</label>
              <select
                value={newKeywordType}
                onChange={(e) => {
                  setNewKeywordType(e.target.value as 'expend' | 'income');
                  setNewKeywordMainCat('');
                  setNewKeywordSubCat('');
                }}
                style={S.categorySelect}
              >
                <option value="expend">支出</option>
                <option value="income">收入</option>
              </select>

              <label style={S.modalFieldLabel}>主分类</label>
              <select
                value={newKeywordMainCat}
                onChange={(e) => {
                  setNewKeywordMainCat(e.target.value);
                  setNewKeywordSubCat('');
                }}
                style={S.categorySelect}
              >
                <option value="">请选择主分类</option>
                {config && Object.keys(newKeywordType === 'expend' ? config.expendCategories : config.incomeCategories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <label style={S.modalFieldLabel}>子分类</label>
              <select
                value={newKeywordSubCat}
                onChange={(e) => setNewKeywordSubCat(e.target.value)}
                style={S.categorySelect}
                disabled={!newKeywordMainCat}
              >
                <option value="">请选择子分类</option>
                {config && newKeywordMainCat && (
                  newKeywordType === 'expend'
                    ? Object.keys(config.expendCategories[newKeywordMainCat] || {}).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))
                    : Object.keys(config.incomeCategories[newKeywordMainCat] || {}).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))
                )}
              </select>

              <div style={S.modalActions}>
                <button
                  onClick={() => setMappingModalOpen(false)}
                  style={{ ...S.button, ...S.buttonGhost }}
                >
                  取消
                </button>
                <button
                  onClick={handleAddMapping}
                  style={{ ...S.button, ...S.buttonPrimary }}
                  disabled={!newKeyword.trim() || !newKeywordMainCat || !newKeywordSubCat}
                >
                  添加
                </button>
              </div>
            </div>

            {/* 当前自定义映射列表 */}
            {userConfig && userConfig.customMappings.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: '12px' }}>已添加的映射</div>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {userConfig.customMappings.map((m, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      marginBottom: '6px',
                    }}>
                      <span>
                        <strong>{m.keyword}</strong> → {m.mainCategory} / {m.subCategory}
                      </span>
                      <button
                        onClick={() => {
                          removeCustomMapping(m.keyword, m.type);
                          setUserConfig(loadUserConfig());
                          const merged = mergeConfigs(loadDefaultConfig(), loadUserConfig());
                          setConfig(merged);
                        }}
                        style={{ ...S.button, ...S.buttonGhost, padding: '2px 8px', fontSize: '12px' }}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 导出/导入配置 */}
            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px' }}>配置管理</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                可直接编辑配置文件，或导出/导入配置
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <button
                  onClick={openConfigEditor}
                  style={{ ...S.button, ...S.buttonPrimary, fontSize: '13px' }}
                >
                  ✏️ 直接编辑配置文件
                </button>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={handleExportConfig}
                  style={{ ...S.button, ...S.buttonSecondary, fontSize: '13px' }}
                >
                  📤 导出配置
                </button>
                <label style={{ ...S.button, ...S.buttonSecondary, fontSize: '13px', cursor: 'pointer', marginBottom: 0 }}>
                  📥 导入配置
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportConfig}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {userConfig ? `${userConfig.customMappings.length} 条自定义映射` : '无配置'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 配置编辑器弹窗 */}
      {configEditorOpen && (
        <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && setConfigEditorOpen(false)}>
          <div style={{ ...S.modal, width: '100%', maxWidth: '800px', maxHeight: '90vh' }}>
            <div style={S.modalTitle}>编辑配置文件</div>
            <div style={S.modalSubtitle}>
              编辑后点击「下载配置文件」，替换 web-app/src/config/categories.json 后刷新页面生效
            </div>
            
            <textarea
              value={configJsonText}
              onChange={(e) => {
                setConfigJsonText(e.target.value);
                setConfigEditError(null);
              }}
              style={{
                width: '100%',
                height: '400px',
                padding: '12px',
                fontFamily: 'Monaco, Menlo, "Courier New", monospace',
                fontSize: '12px',
                lineHeight: '1.5',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                resize: 'vertical',
                backgroundColor: '#fafafa',
              }}
              spellCheck={false}
            />
            
            {configEditError && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
                {configEditError}
              </div>
            )}
            
            <div style={S.modalActions}>
              <button
                onClick={() => setConfigEditorOpen(false)}
                style={{ ...S.button, ...S.buttonGhost }}
              >
                取消
              </button>
              <button
                onClick={handleDownloadConfig}
                style={{ ...S.button, ...S.buttonPrimary }}
              >
                💾 下载配置文件
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}