import { create } from "zustand";
import apiRequest from "./apiRequest";
import checkEmail from "../utils/validation";

const userStore = create((set) => ({
  // 회원 정보
  userInfo: {
    id: "",
    username: "",
    email: "",
    phone: "",
    token: "",
  },
  // 회원가입 정보
  joinInfo: {
    id: "",
    password: "",
    username: "",
    email: "",
    phone: "",
  },
  // 이메일 중복 체크 여부
  isEmailDuplicateChecked: false,
  setEmailDuplicateChecked: (result) => set({ isEmailDuplicateChecked: result}),
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
  // 중복 메일 체크
  duplicateCheck: async (data) => {
    const { email } = data;
    const checkEmailResult = checkEmail(email);
    if (!checkEmailResult.valid) {
      return checkEmailResult;
    }
    try {
      const response = await apiRequest(
        "get",
        "/user/id-duplicate-check",
        { email }
      );
      if(response.success) {
        setEmailDuplicateChecked(response.success);
      }
      return response;
    } catch (error) {
      console.error(error);
    }
  },
}));

export default userStore;
