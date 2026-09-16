// 말머리(카테고리) 정의 — 공지는 관리자만 선택 가능
export const BOARD_CATEGORIES = [
  { value: '공지', adminOnly: true, color: '#ff5a1f' },
  { value: '자유', adminOnly: false, color: '#2563eb' },
  { value: '후기', adminOnly: false, color: '#16a34a' },
  { value: '질문', adminOnly: false, color: '#9333ea' },
  { value: '건의', adminOnly: false, color: '#d97706' },
];

export const categoryColor = (value) =>
  BOARD_CATEGORIES.find((c) => c.value === value)?.color || '#64748b';

// 반응 이모지 (좋아요 👍 포함)
export const REACTION_EMOJIS = ['👍', '👎', '❤️', '😂', '🔥', '👏', '😮'];
export const LIKE_EMOJI = '👍';

// 역할 뱃지 라벨 (member는 뱃지 없음)
export const roleBadge = (role) => {
  if (role === 'leader') return { label: '리더', cls: 'leader' };
  if (role === 'manager') return { label: '매니저', cls: 'manager' };
  return null;
};
