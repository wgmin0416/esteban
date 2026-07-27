import { Preferences } from '@capacitor/preferences';

// 앱 access token 저장소.
// refresh token은 서버(Redis)에만 보관하므로 여기서는 access token만 다룬다.
const KEY = 'access_token';
let memoryToken = null; // 요청 인터셉터에서 빠르게 참조하기 위한 캐시

export const setAccessToken = async (token) => {
  memoryToken = token || null;
  if (token) {
    await Preferences.set({ key: KEY, value: token });
  } else {
    await Preferences.remove({ key: KEY });
  }
};

export const getAccessToken = async () => {
  if (memoryToken) return memoryToken;
  const { value } = await Preferences.get({ key: KEY });
  memoryToken = value || null;
  return memoryToken;
};

export const clearAccessToken = async () => {
  memoryToken = null;
  await Preferences.remove({ key: KEY });
};
