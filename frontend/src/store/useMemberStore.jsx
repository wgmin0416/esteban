import { create } from 'zustand';
import apiRequest from './apiRequest';

const useMemberStore = create((set) => ({
  // 회원 목록
  members: null,
  setMembers: (value) =>
    set({
      members: value,
    }),
  getMembers: async () => {
    try {
      const response = await apiRequest('get', '/team/members', null, {
        withCredentials: true,
      });
      if (response?.data) {
        console.log('response.data: ', response.data);
        set({ members: response.data });
      }
    } catch (e) {
      console.error(e);
    }
  },
  // 회원 상세
  member: null,
  setMember: (value) => set({ member: value }),
  getMember: async (memberId) => {
    try {
      const response = await apiRequest(
        'get',
        '/team/member',
        { memberId },
        {
          withCredentials: true,
        }
      );
      if (response?.data) {
        set({ member: response.data });
      }
    } catch (e) {
      console.error(e);
    }
  },
}));

export default useMemberStore;
