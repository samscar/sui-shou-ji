import { useState } from 'react';
import { S } from '../../styles';

interface Props {
  initialJson: string;
  /**
   * 保存并生效。返回错误文案（校验失败时）或 null（成功）。
   * 校验留在调用方，因为它需要比对内置分类表才能算出自定义映射的差异。
   */
  onApply: (jsonText: string) => string | null;
  onDownload: (jsonText: string) => string | null;
  onClose: () => void;
}

export default function ConfigEditorModal({ initialJson, onApply, onDownload, onClose }: Props) {
  const [text, setText] = useState(initialJson);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modal, width: '100%', maxWidth: '800px', maxHeight: '90vh' }}>
        <div style={S.modalTitle}>编辑分类表</div>
        <div style={S.modalSubtitle}>
          修改后点击「保存并生效」即刻应用；「下载为文件」用于备份或在其他设备导入
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
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

        {error && (
          <div
            style={{
              color: '#ef4444',
              fontSize: '13px',
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
            }}
          >
            {error}
          </div>
        )}

        <div style={S.modalActions}>
          <button onClick={onClose} style={{ ...S.button, ...S.buttonGhost }}>
            取消
          </button>
          <button
            onClick={() => {
              const message = onApply(text);
              if (message) setError(message);
            }}
            style={{ ...S.button, ...S.buttonPrimary }}
          >
            ✅ 保存并生效
          </button>
          <button
            onClick={() => {
              const message = onDownload(text);
              if (message) setError(message);
            }}
            style={{ ...S.button, ...S.buttonSecondary }}
          >
            💾 下载为文件
          </button>
        </div>
      </div>
    </div>
  );
}
