import { create } from 'zustand';

const useLanguageStore = create((set) => {
  // localStorage에서 초기값 가져오기
  const savedLanguage = localStorage.getItem('language') || 'KR';
  
  return {
    language: savedLanguage,
    setLanguage: (lang) => {
      localStorage.setItem('language', lang);
      set({ language: lang });
    },
    toggleLanguage: () => {
      set((state) => {
        const newLang = state.language === 'KR' ? 'EN' : 'KR';
        localStorage.setItem('language', newLang);
        return { language: newLang };
      });
    },
  };
});

export default useLanguageStore;
