import { useState } from 'react';
import { S } from '../styles';
import { ExpenseRecord, IncomeRecord, TransferRecord } from '../types';
import { TabKey } from '../components/TabBar';

interface Props {
  expenses: ExpenseRecord[];
  incomes: IncomeRecord[];
  transfers: TransferRecord[];
  pendingExpenses: number;
  pendingIncomes: number;
  tripApplied: number;
  refundPairs: number;
  onGoTab: (key: TabKey) => void;
}

const sum = (list: { 金额: number }[]) => list.reduce((s, r) => s + r.金额, 0);

export default function OverviewTab({
  expenses,
  incomes,
  transfers,
  pendingExpenses,
  pendingIncomes,
  tripApplied,
  refundPairs,
  onGoTab,
}: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingTotal = pendingExpenses + pendingIncomes;
  const allDone = pendingTotal === 0 && transfers.length === 0;

  return (
    <div>
      <div style={S.statsGrid}>
        <div style={{ ...S.statCard, backgroundColor: '#ef4444' }}>
          <div style={S.statLabel}>支出</div>
          <div style={S.statValue}>¥{sum(expenses).toFixed(2)}</div>
          <div style={S.statSub}>{expenses.length} 笔</div>
        </div>
        <div style={{ ...S.statCard, backgroundColor: '#22c55e' }}>
          <div style={S.statLabel}>收入</div>
          <div style={S.statValue}>¥{sum(incomes).toFixed(2)}</div>
          <div style={S.statSub}>{incomes.length} 笔</div>
        </div>
        <div style={{ ...S.statCard, backgroundColor: '#6366f1' }}>
          <div style={S.statLabel}>转账</div>
          <div style={S.statValue}>¥{sum(transfers).toFixed(2)}</div>
          <div style={S.statSub}>{transfers.length} 笔</div>
        </div>
      </div>

      {allDone && (
        <div style={{ textAlign: 'center', padding: '24px 0 8px', color: '#22c55e' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>✓</div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>所有记录已分类完成</div>
        </div>
      )}

      <div
        style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#374151',
          lineHeight: 2,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>待办</div>
        <div>
          待分类 <strong>{pendingTotal}</strong> 笔（支出 {pendingExpenses} · 收入 {pendingIncomes}）
          {pendingTotal > 0 && (
            <button
              onClick={() => onGoTab('pending')}
              style={{
                background: 'none',
                border: 'none',
                color: '#4f6ef7',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                padding: '0 4px',
              }}
            >
              去处理 →
            </button>
          )}
        </div>
        <div>
          出行区间已改判 <strong>{tripApplied}</strong> 笔
          <button
            onClick={() => onGoTab('trip')}
            style={{
              background: 'none',
              border: 'none',
              color: '#4f6ef7',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              padding: '0 4px',
            }}
          >
            {tripApplied > 0 ? '查看清单 →' : '设置区间 →'}
          </button>
        </div>
        <div>
          退款剔除 <strong>{refundPairs}</strong> 对
          {refundPairs > 0 && (
            <button
              onClick={() => onGoTab('refund')}
              style={{
                background: 'none',
                border: 'none',
                color: '#4f6ef7',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                padding: '0 4px',
              }}
            >
              查看清单 →
            </button>
          )}
        </div>
      </div>

      <div style={S.helpBox}>
        <button
          onClick={() => setHelpOpen((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            cursor: 'pointer',
          }}
        >
          {helpOpen ? '▾' : '▸'} 使用说明
        </button>
        {helpOpen && (
          <div style={{ marginTop: '12px' }}>
            <strong>使用步骤</strong>
            <br />
            1. 从建设银行网上银行下载流水文件（.zip 格式压缩包）
            <br />
            2. 将压缩包拖拽到上方区域，或点击选择文件
            <br />
            3. 在弹出的对话框中输入您在银行设置的解压密码
            <br />
            4. 系统自动解析 XLS 流水数据，按随手记格式分类
            <br />
            5. 在「待分类」里逐条修正，在「退款剔除」里检查自动剔除的配对
            <br />
            6. 一次外出结束后，在「出行区间」里选起止日期，把这段日期的支出整体归入「出差旅游」
            <br />
            7. 点击「导出随手记账单 (.xlsx)」，导入随手记
            <br />
            <br />
            <strong>注意</strong>
            <br />
            - 所有处理均在您的浏览器本地完成，密码和文件不会上传到任何服务器
            <br />
            - 自定义映射词条与交易修正记录保存在浏览器 localStorage，清除浏览器数据后会丢失
            <br />
            - 出行区间只在本次会话内有效，刷新页面后需要重选
          </div>
        )}
      </div>
    </div>
  );
}
