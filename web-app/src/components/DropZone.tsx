import { useRef } from 'react';
import { S } from '../styles';

interface Props {
  fileName: string | null;
  loading: boolean;
  dragOver: boolean;
  /** 已解析出数据后收成一条文件栏，把首屏让给 Tab 内容 */
  compact: boolean;
  onFileSelect: (file: File) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
}

export default function DropZone({
  fileName,
  loading,
  dragOver,
  compact,
  onFileSelect,
  onDragOver,
  onDragLeave,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const dropHandlers = {
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      onDragLeave();
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      onDragOver();
    },
    onDragLeave,
  };

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".zip"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) onFileSelect(file);
      }}
      style={{ display: 'none' }}
    />
  );

  if (compact) {
    return (
      <div style={S.fileBar} {...dropHandlers}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          📁 已导入：{fileName}
          {loading && '（处理中…）'}
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          style={{
            ...S.button,
            ...S.buttonSecondary,
            padding: '6px 14px',
            fontSize: '13px',
            ...(loading ? S.buttonDisabled : {}),
          }}
        >
          换一份流水
        </button>
        {hiddenInput}
      </div>
    );
  }

  return (
    <div
      style={{
        ...S.dropZone,
        ...(dragOver ? S.dropZoneActive : S.dropZoneIdle),
        ...(loading ? { opacity: 0.6, cursor: 'wait' } : {}),
      }}
      onClick={() => !loading && inputRef.current?.click()}
      {...dropHandlers}
    >
      <div style={S.dropIcon}>{loading ? '⏳' : '📁'}</div>
      <div style={S.dropText}>{loading ? '正在处理中...' : '拖拽 .zip 文件到此处'}</div>
      <div style={S.dropHint}>{fileName ? `已选择：${fileName}` : '或点击选择文件'}</div>
      {hiddenInput}
    </div>
  );
}
