import { create } from 'zustand';
import apiRequest from '../lib/apiRequest';

const useTeamStore = create((set) => ({
  // 팀 정보
  teamInfo: null,
  setTeamInfo: (value) =>
    set({
      teamInfo: value,
    }),
  getTeamInfo: async () => {
    try {
      const response = await apiRequest('get', '/team/info', null, {
        withCredentials: true,
      });
      if (response?.data) {
        set({ teamInfo: response.data });
      } else {
        set({ teamInfo: null });
      }
    } catch (e) {
      console.error(e);
      set({ teamInfo: null });
    }
  },
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
  // 내가 속한 팀 목록
  myTeams: null,
  setMyTeams: (value) => set({ myTeams: value }),
  getMyTeams: async () => {
    try {
      const response = await apiRequest('get', '/user/my-teams', null, {
        withCredentials: true,
      });
      if (response?.data) {
        set({ myTeams: response.data });
      }
    } catch (e) {
      console.error(e);
      set({ myTeams: null });
    }
  },
  // 기본 팀 설정
  setDefaultTeam: async (teamId) => {
    try {
      const response = await apiRequest('post', '/team/set-default', { team_id: teamId }, {
        withCredentials: true,
      });
      if (response?.success) {
        // 팀 목록 다시 조회
        const teamsResponse = await apiRequest('get', '/user/my-teams', null, {
          withCredentials: true,
        });
        if (teamsResponse?.data) {
          set({ myTeams: teamsResponse.data });
        }
        // 팀 정보도 다시 조회
        const teamInfoResponse = await apiRequest('get', '/team/info', null, {
          withCredentials: true,
        });
        if (teamInfoResponse?.data) {
          set({ teamInfo: teamInfoResponse.data });
        }
      }
      return response;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
}));

export default useTeamStore;

