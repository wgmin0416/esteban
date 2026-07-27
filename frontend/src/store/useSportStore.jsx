import { create } from 'zustand';

const useSportStore = create((set) => ({
  // 현재 선택된 종목
  selectedSport: 'basketball',
  setSelectedSport: (sport) => set({ selectedSport: sport }),

  // 사용 가능한 종목 목록 (현재는 농구만)
  availableSports: [
    { value: 'basketball', label: { KR: '농구', EN: 'Basketball' }, icon: '🏀' },
    // 나중에 추가될 종목들
    // { value: 'bowling', label: { KR: '볼링', EN: 'Bowling' }, icon: '🎳' },
    // { value: 'badminton', label: { KR: '배드민턴', EN: 'Badminton' }, icon: '🏸' },
  ],
}));

export default useSportStore;
