import { create } from "zustand";
import apiRequest from "./apiRequest";

const userStore = create((set) => ({
  // 회원 정보
  userInfo: {
    id: "",
    username: "",
    email: "",
    phone: "",
    token: "",
  },
  // 회원정보 변경
  setJoinInfo: (e) => {
    const { name, value } = e.target;
    set((state) => ({
      joinInfo: { ...state.joinInfo, [name]: value },
    }));
  },
  // 로그인
  login: async (data) => {
    console.log("login", data);
    try {
      const response = await apiRequest("post", "/user/login", data);
      return response;
    } catch (error) {
      console.error(error);
    }
  },
}));

export default userStore;
