import { create } from "zustand";
// import { devtools } from "zustand/middleware";

// Zustand의 create 함수로 상태를 관리할 store를 생성
const useStore = create((set) => ({
  // 상태 초기화
  count: 0,
  // 상태를 변경하는 함수 정의
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

export default useStore;
