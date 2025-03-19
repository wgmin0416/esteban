import React from "react";
import useStore from "../store/useStore";

// Counter 컴포넌트 정의
const Counter = () => {
  // Zustand store에서 상태와 함수 가져오기
  const { count, increment, decrement } = useStore();

  return (
    <div>
      <h1>카운트: {count}</h1>
      {/* 카운트를 증가시키는 버튼 */}
      <button onClick={increment}>증가</button>
      {/* 카운트를 감소시키는 버튼 */}
      <button onClick={decrement}>감소</button>
    </div>
  );
};

export default Counter;
