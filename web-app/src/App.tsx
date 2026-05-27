import { useState, useCallback, useRef } from 'react';
import { parseCCBXLS, parseCCBData } from './parser';
import { exportToExcel } from './excel';
import { ExpenseRecord, IncomeRecord, TransferRecord } from './types';

// ---- 样式常量 ----
const S = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 24px',
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
  inputRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    alignItems: 'center' as const,
  },
  passwordLabel: {
    fontSize: '14px',
    color: '#555',
    whiteSpace: 'nowrap' as const,
    fontWeight: 500,
  },
  passwordInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #d0d5dd',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
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
};

const MAX_PREVIEW = 50;

export default function App() {
  const [password, setPassword] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processZip = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('请选择 .zip 压缩包文件');
        return;
      }

      setFileName(file.name);
      setError(null);
      setExpenses([]);
      setIncomes([]);
      setTransfers([]);

      if (!password.trim()) {
        setError('请输入压缩包解压密码');
        return;
      }

      setLoading(true);
      try {
        const { ZipReader, BlobReader, BlobWriter } = await import('@zip.js/zip.js');

        const reader = new ZipReader(new BlobReader(file), {
          password: password.trim(),
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

        // 将 Blob 转为 ArrayBuffer
        const arrayBuffer = await xlsBlob.arrayBuffer();

        // 解析 XLS
        const rows = parseCCBXLS(arrayBuffer);
        if (rows.length === 0) {
          setError('XLS 文件中未解析到有效的交易记录。');
          setLoading(false);
          return;
        }

        // 分类转换
        const result = parseCCBData(rows);
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
    [password]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processZip(file);
    },
    [processZip]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processZip(file);
    },
    [processZip]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleExport = () => {
    exportToExcel(expenses, incomes, transfers);
  };

  const totalExpense = expenses.reduce((s, r) => s + r.金额, 0);
  const totalIncome = incomes.reduce((s, r) => s + r.金额, 0);
  const totalTransfer = transfers.reduce((s, r) => s + r.金额, 0);
  const hasData = expenses.length > 0 || incomes.length > 0 || transfers.length > 0;

  // ---- 渲染 ----
  return (
    <div style={S.container}>
      <h1 style={S.title}>建设银行流水 → 随手记</h1>
      <p style={S.subtitle}>
        拖拽建设银行流水压缩包到下方区域，输入解压密码，一键生成随手记账单
      </p>

      {/* 密码输入 */}
      <div style={S.inputRow}>
        <span style={S.passwordLabel}>解压密码：</span>
        <input
          type="password"
          placeholder="请输入压缩包密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            ...S.passwordInput,
            borderColor: error && !password ? '#fca5a5' : '#d0d5dd',
          }}
          disabled={loading}
        />
      </div>

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

          {/* 导出按钮 */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <button
              onClick={handleExport}
              style={{ ...S.button, ...S.buttonSuccess, padding: '12px 40px', fontSize: '15px' }}
            >
              导出随手记账单 (.xlsx)
            </button>
          </div>

          {/* 表格预览 */}
          {expenses.length > 0 && (
            <div style={S.tableBox}>
              <div style={S.tableTitle}>
                支出记录 ({expenses.length} 笔，显示前 {Math.min(expenses.length, MAX_PREVIEW)} 笔)
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
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, MAX_PREVIEW).map((r, i) => (
                    <tr key={i}>
                      <td style={S.td}>{r.日期}</td>
                      <td style={S.td}>{r.分类}</td>
                      <td style={S.td}>{r.子分类}</td>
                      <td style={{ ...S.td, ...S.amountRed }}>-¥{r.金额.toFixed(2)}</td>
                      <td style={S.td}>{r.商家}</td>
                      <td style={{ ...S.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.备注}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {incomes.length > 0 && (
            <div style={S.tableBox}>
              <div style={S.tableTitle}>
                收入记录 ({incomes.length} 笔)
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>日期</th>
                    <th style={S.th}>分类</th>
                    <th style={S.th}>子分类</th>
                    <th style={S.th}>金额</th>
                    <th style={S.th}>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.slice(0, MAX_PREVIEW).map((r, i) => (
                    <tr key={i}>
                      <td style={S.td}>{r.日期}</td>
                      <td style={S.td}>{r.分类}</td>
                      <td style={S.td}>{r.子分类}</td>
                      <td style={{ ...S.td, ...S.amountGreen }}>+¥{r.金额.toFixed(2)}</td>
                      <td style={{ ...S.td, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.备注}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
                      <td style={{ ...S.td, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.备注}</td>
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
        2. 输入您在银行设置的压缩包解压密码
        <br />
        3. 将压缩包拖拽到上方区域，或点击选择文件
        <br />
        4. 系统将自动解析 CSV 流水数据，按随手记格式分类
        <br />
        5. 点击"导出"按钮下载随手记可导入的 Excel 文件
        <br />
        <br />
        <strong>注意：</strong>所有处理均在您的浏览器本地完成，密码和文件不会上传到任何服务器。
      </div>
    </div>
  );
}