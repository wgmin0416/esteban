import { useEffect, useCallback } from 'react';
import useAlertStore from '../../store/useAlertStore';
import './Toast.scss';

const Toast = () => {
  const toasts = useAlertStore((state) => state.toasts);
  const removeToast = useAlertStore((state) => state.removeToast);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, removeToast }) => {
  // removeToast는 zustand store에서 가져온 함수이므로 안정적
  // toast.id와 toast.duration만 의존성 배열에 포함
  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, removeToast]);

  const handleClose = useCallback(() => {
    removeToast(toast.id);
  }, [toast.id, removeToast]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`toast toast-${toast.type}`} onClick={handleClose}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={handleClose}>
        ×
      </button>
    </div>
  );
};

export default Toast;
