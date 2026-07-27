/**
 * Alert 유틸리티 함수
 * 브라우저 기본 alert() 대신 사용하는 커스텀 알림 시스템
 */

import useAlertStore from '../store/useAlertStore';

/**
 * Toast 알림 표시 (간단한 메시지)
 * @param {string} message - 표시할 메시지
 * @param {'success'|'error'|'info'|'warning'} type - 알림 타입
 * @param {number} duration - 표시 시간 (ms, 기본값: 3000)
 * @returns {number} Toast ID
 */
export const toast = (message, type = 'info', duration = 3000) => {
  return useAlertStore.getState().addToast(message, type, duration);
};

/**
 * 성공 메시지 Toast
 */
export const toastSuccess = (message, duration = 3000) => {
  return useAlertStore.getState().success(message, duration);
};

/**
 * 에러 메시지 Toast
 */
export const toastError = (message, duration = 5000) => {
  return useAlertStore.getState().error(message, duration);
};

/**
 * 정보 메시지 Toast
 */
export const toastInfo = (message, duration = 3000) => {
  return useAlertStore.getState().info(message, duration);
};

/**
 * 경고 메시지 Toast
 */
export const toastWarning = (message, duration = 4000) => {
  return useAlertStore.getState().warning(message, duration);
};

/**
 * Alert 모달 표시 (확인 버튼만)
 * @param {string} message - 표시할 메시지
 * @param {string} title - 제목 (선택)
 * @returns {Promise<boolean>} 항상 true 반환 (확인 클릭 시)
 */
export const alert = (message, title = null) => {
  return useAlertStore.getState().showAlert(message, title);
};

/**
 * Confirm 다이얼로그 표시 (확인/취소 버튼)
 * @param {string} message - 표시할 메시지
 * @param {string} title - 제목 (선택)
 * @returns {Promise<boolean>} 확인 클릭 시 true, 취소 클릭 시 false
 */
export const confirm = (message, title = null) => {
  return useAlertStore.getState().showConfirm(message, title);
};

// 기본 export
export default {
  toast,
  toastSuccess,
  toastError,
  toastInfo,
  toastWarning,
  alert,
  confirm,
};
