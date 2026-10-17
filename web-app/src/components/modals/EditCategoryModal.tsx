import { useState } from 'react';
import { S } from '../../styles';
import { CategoryConfig, ExpenseRecord, IncomeRecord } from '../../types';

interface Props {
  record: ExpenseRecord | IncomeRecord;
  config: CategoryConfig;
  onSave: (main: string, sub: string) => void;
  onClose: () => void;
}

/**
 * 修改分类。进入此弹窗的记录都是待分类项（分类为「其他杂项 / 其他收入」，子分类是占位值），
 * 这些值不在可选分类配置中：直接预填会让下拉框显示异常、保存后原样写回，
 * 表现为「编辑分类不生效」。因此只在当前值属于有效配置项时才预填。
 */
export default function EditCategoryModal({ record, config, onSave, onClose }: Props) {
  const isExpense = '支出账户' in record;
  const categories = isExpense ? config.expendCategories : config.incomeCategories;

  const mainValid = record.分类 in categories;
  const subValid = mainValid ? record.子分类 in categories[record.分类] : false;

  const [main, setMain] = useState(mainValid ? record.分类 : '');
  const [sub, setSub] = useState(subValid ? record.子分类 : '');

  return (
    <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.modalTitle}>修改分类</div>
        <div style={S.modalSubtitle}>备注：{record.备注}</div>

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
            onClick={() => onSave(main, sub)}
            style={{ ...S.button, ...S.buttonPrimary }}
            disabled={!main || !sub}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
