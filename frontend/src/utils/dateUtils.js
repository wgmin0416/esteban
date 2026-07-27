/**
 * 날짜를 포맷팅하는 유틸 함수들
 */

/**
 * 경기 날짜/시간 포맷팅 (MM.DD HH:mm 또는 YYYY.MM.DD HH:mm ~ HH:mm)
 * @param {string|Date} startTime - 시작 시간
 * @param {string|Date} endTime - 종료 시간 (선택)
 * @param {boolean} includeYear - 연도 포함 여부 (선택, 기본값: false)
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatMatchDateTime = (startTime, endTime = null, includeYear = false) => {
  const start = new Date(startTime);
  const month = String(start.getMonth() + 1).padStart(2, '0');
  const day = String(start.getDate()).padStart(2, '0');
  const startHour = String(start.getHours()).padStart(2, '0');
  const startMin = String(start.getMinutes()).padStart(2, '0');
  
  if (endTime) {
    const end = new Date(endTime);
    const endHour = String(end.getHours()).padStart(2, '0');
    const endMin = String(end.getMinutes()).padStart(2, '0');
    
    if (includeYear) {
      const year = start.getFullYear();
      return `${year}.${month}.${day} ${startHour}:${startMin} ~ ${endHour}:${endMin}`;
    }
    
    return `${month}.${day} ${startHour}:${startMin} ~ ${endHour}:${endMin}`;
  }
  
  if (includeYear) {
    const year = start.getFullYear();
    return `${year}.${month}.${day} ${startHour}:${startMin}`;
  }
  
  return `${month}.${day} ${startHour}:${startMin}`;
};

/**
 * 전체 날짜/시간 포맷팅 (YYYY.MM.DD. HH:mm)
 * @param {string|Date} dateTime - 날짜/시간
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatFullDateTime = (dateTime) => {
  const date = new Date(dateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day}. ${hour}:${min}`;
};

/**
 * 날짜만 포맷팅 (YYYY.MM.DD 또는 YYYY-MM-DD)
 * @param {string|Date} date - 날짜
 * @param {boolean} includeTime - 시간 포함 여부 (선택, 기본값: false)
 * @param {string} separator - 구분자 (선택, 기본값: '.')
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatDate = (date, includeTime = false, separator = '.') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  if (includeTime) {
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${year}${separator}${month}${separator}${day} ${hour}:${min}`;
  }
  
  if (separator === '-') {
    return `${year}-${month}-${day}`;
  }
  
  return `${year}.${month}.${day}`;
};
