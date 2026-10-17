import { useState } from 'react';
import { S } from '../../styles';

interface Props {
  fileName: string;
  loading: boolean;
  onConfirm: (password: string) => void;
  onClose: () => void;
}

export default function PasswordModal({ fileName, loading, onConfirm, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!password.trim()) {
      setError('请输入压缩包解压密码');
      return;
    }
    onConfirm(password);
  };

  return (
    <div
      style={S.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={S.modal} role="dialog" aria-modal="true" aria-label="输入解压密码">
        <div style={S.modalTitle}>输入解压密码</div>
        <div style={S.modalSubtitle}>文件：{fileName}</div>
        <label style={S.modalFieldLabel} htmlFor="zip-password">
          解压密码
        </label>
        <div style={S.passwordWrapper}>
          <input
            id="zip-password"
            autoFocus
            type={showPassword ? 'text' : 'password'}
            placeholder="请输入压缩包解压密码"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
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
        {error && <div style={S.modalError}>{error}</div>}
        <div style={S.modalActions}>
          <button onClick={onClose} style={{ ...S.button, ...S.buttonGhost }} disabled={loading}>
            取消
          </button>
          <button onClick={submit} style={{ ...S.button, ...S.buttonPrimary }} disabled={loading}>
            {loading ? '处理中...' : '确认解压'}
          </button>
        </div>
      </div>
    </div>
  );
}
