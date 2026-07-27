import { create } from 'zustand';

const useAlertStore = create((set) => ({
  // Toast 알림
  toasts: [],
  
  // Toast 추가
  addToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // 자동 제거는 ToastItem 컴포넌트의 useEffect에서 처리
    // (컴포넌트 언마운트 시 타이머 정리를 위해)

    return id;
  },

  // Toast 제거
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // 편의 메서드
  success: (message, duration) => useAlertStore.getState().addToast(message, 'success', duration),
  error: (message, duration) => useAlertStore.getState().addToast(message, 'error', duration),
  info: (message, duration) => useAlertStore.getState().addToast(message, 'info', duration),
  warning: (message, duration) => useAlertStore.getState().addToast(message, 'warning', duration),

  // Alert Modal
  alert: null,
  
  // Alert 표시
  showAlert: (message, title = null, onConfirm = null) => {
    return new Promise((resolve) => {
      set({
        alert: {
          message,
          title,
          onConfirm: () => {
            if (onConfirm) onConfirm();
            resolve(true);
            set({ alert: null });
          },
        },
      });
    });
  },

  // Alert 닫기
  closeAlert: () => {
    set({ alert: null });
  },

  // Confirm Dialog
  confirm: null,

  // Confirm 표시
  showConfirm: (message, title = null) => {
    return new Promise((resolve) => {
      set({
        confirm: {
          message,
          title,
          onConfirm: () => {
            resolve(true);
            set({ confirm: null });
          },
          onCancel: () => {
            resolve(false);
            set({ confirm: null });
          },
        },
      });
    });
  },
}));

export default useAlertStore;
