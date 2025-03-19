import { create } from "zustand";
import apiRequest from "./apiRequest";

const joinStore = create((set) => ({
  // 회원가입 정보
  joinInfo: {
    id: "",
    password: "",
    username: "",
    email: "",
    phone: "",
  },
  // 회원가입 정보 변경 함수
  setJoinInfo: (e) => {
    const { name, value } = e.target;
    set((state) => ({
      joinInfo: { ...state.joinInfo, [name]: value },
    }));
  },
  // 회원가입
  join: async (data) => {
    console.log("join", data);
    try {
      const response = await apiRequest("post", "/user/join", data);
      return response;
    } catch (error) {
      console.error(error);
    }
  },
  // 중복 ID 체크
  duplicateCheck: async (data) => {
    const { id } = data;
    if (!id) {
      alert("아이디를 입력해주세요.");
      return;
    }
    try {
      const response = await apiRequest(
        "get",
        `/user/id-duplicate-check?id=${id}`,
        null
      );
      return response;
    } catch (error) {
      console.error(error);
    }
  },
}));

export default joinStore;
