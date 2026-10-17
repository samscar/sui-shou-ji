import { useRef } from 'react';
import { S } from '../styles';

interface Props {
  fileName: string | null;
  loading: boolean;
  dragOver: boolean;
  onFileSelect: (file: File) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
}

export default function DropZone({
  fileName,
  loading,
  dragOver,
  onFileSelect,
  onDragOver,
  onDragLeave,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        ...S.dropZone,
        ...(dragOver ? S.dropZoneActive : S.dropZoneIdle),
        ...(loading ? { opacity: 0.6, cursor: 'wait' } : {}),
      }}
      onClick={() => !loading && inputRef.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        onDragLeave();
        const file = e.dataTransfer.files?.[0];
        if (file) onFileSelect(file);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
    >
      <div style={S.dropIcon}>{loading ? '⏳' : '📁'}</div>
      <div style={S.dropText}>{loading ? '正在处理中...' : '拖拽 .zip 文件到此处'}</div>
      <div style={S.dropHint}>{fileName ? `已选择：${fileName}` : '或点击选择文件'}</div>
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
    </div>
  );
}
