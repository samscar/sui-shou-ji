import React from 'react';
import { S } from '../styles';

export type TabKey = 'overview' | 'pending' | 'refund' | 'transfer' | 'trip';

export interface TabItem {
  key: TabKey;
  label: string;
  count?: number;
  disabled?: boolean;
  /** 置灰时给出的原因，悬停可见 */
  hint?: string;
}

interface Props {
  tabs: TabItem[];
  active: TabKey;
  onChange: (key: TabKey) => void;
  onExport: () => void;
  onOpenMapping: () => void;
}

export default function TabBar({ tabs, active, onChange, onExport, onOpenMapping }: Props) {
  return (
    <div style={S.tabBar}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const style: React.CSSProperties = {
          ...S.tabItem,
          ...(isActive ? S.tabItemActive : {}),
          ...(tab.disabled ? S.tabItemDisabled : {}),
        };
        return (
          <button
            key={tab.key}
            style={style}
            disabled={tab.disabled}
            title={tab.disabled ? tab.hint : undefined}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => !tab.disabled && onChange(tab.key)}
          >
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span
                style={{
                  ...S.tabBadge,
                  ...(isActive ? { backgroundColor: '#4f6ef7', color: '#fff' } : {}),
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
      <div style={S.tabBarSpacer} />
      <button
        onClick={onOpenMapping}
        style={{
          ...S.button,
          ...S.buttonSecondary,
          padding: '8px 16px',
          fontSize: '13px',
          alignSelf: 'center',
        }}
      >
        管理分类映射
      </button>
      <button
        onClick={onExport}
        style={{
          ...S.button,
          ...S.buttonSuccess,
          padding: '8px 20px',
          fontSize: '13px',
          alignSelf: 'center',
        }}
      >
        导出随手记账单 (.xlsx)
      </button>
    </div>
  );
}
