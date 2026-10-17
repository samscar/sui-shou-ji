import { useState } from 'react';
import { S } from '../../styles';
import { CategoryConfig, UserConfig } from '../../types';

interface Props {
  config: CategoryConfig;
  userConfig: UserConfig;
  onAddMapping: (keyword: string, type: 'expend' | 'income', main: string, sub: string) => void;
  onRemoveMapping: (keyword: string, type: 'expend' | 'income') => void;
  onExportConfig: () => void;
  onImportConfig: (file: File) => void;
  onOpenEditor: () => void;
  onClose: () => void;
}

export default function MappingModal({
  config,
  userConfig,
  onAddMapping,
  onRemoveMapping,
  onExportConfig,
  onImportConfig,
  onOpenEditor,
  onClose,
}: Props) {
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<'expend' | 'income'>('expend');
  const [main, setMain] = useState('');
  const [sub, setSub] = useState('');

  const categories = type === 'expend' ? config.expendCategories : config.incomeCategories;

  return (
    <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
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
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ ...S.passwordInputInModal, marginBottom: '12px' }}
          />

          <label style={S.modalFieldLabel}>交易类型</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as 'expend' | 'income');
              setMain('');
              setSub('');
            }}
            style={S.categorySelect}
          >
            <option value="expend">支出</option>
            <option value="income">收入</option>
          </select>

          <label style={S.modalFieldLabel}>主分类</label>
          <select
            value={main}
            onChange={(e) => {
              setMain(e.target.value);
              setSub('');
            }}
            style={S.categorySelect}
          >
            <option value="">请选择主分类</option>
            {Object.keys(categories).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <label style={S.modalFieldLabel}>子分类</label>
          <select
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            style={S.categorySelect}
            disabled={!main}
          >
            <option value="">请选择子分类</option>
            {main &&
              Object.keys(categories[main] || {}).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>

          <div style={S.modalActions}>
            <button onClick={onClose} style={{ ...S.button, ...S.buttonGhost }}>
              取消
            </button>
            <button
              onClick={() => onAddMapping(keyword.trim(), type, main, sub)}
              style={{ ...S.button, ...S.buttonPrimary }}
              disabled={!keyword.trim() || !main || !sub}
            >
              添加
            </button>
          </div>
        </div>

        {userConfig.customMappings.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>已添加的映射</div>
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              {userConfig.customMappings.map((m, i) => (
                <div
                  key={`${m.keyword}-${m.type}-${i}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    marginBottom: '6px',
                  }}
                >
                  <span>
                    <strong>{m.keyword}</strong> → {m.mainCategory} / {m.subCategory}
                  </span>
                  <button
                    onClick={() => onRemoveMapping(m.keyword, m.type)}
                    style={{ ...S.button, ...S.buttonGhost, padding: '2px 8px', fontSize: '12px' }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ fontWeight: 600, marginBottom: '12px' }}>配置管理</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            自定义映射词条保存在本浏览器中，可导出为文件或直接编辑分类表。
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <button
              onClick={onOpenEditor}
              style={{ ...S.button, ...S.buttonPrimary, fontSize: '13px' }}
            >
              ✏️ 直接编辑分类表
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onExportConfig}
              style={{ ...S.button, ...S.buttonSecondary, fontSize: '13px' }}
            >
              📤 导出分类表
            </button>
            <label
              style={{
                ...S.button,
                ...S.buttonSecondary,
                fontSize: '13px',
                cursor: 'pointer',
                marginBottom: 0,
              }}
            >
              📥 导入配置
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) onImportConfig(file);
                }}
                style={{ display: 'none' }}
              />
            </label>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {userConfig.customMappings.length} 条自定义映射、{userConfig.editedRecords.length} 条修正记录
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
