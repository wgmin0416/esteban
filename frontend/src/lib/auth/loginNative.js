import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import axiosInstance from '../axiosInstance';
import { buildAuthorizeUrl, buildState } from './oauth';
import { setAccessToken } from './tokenStore';
import { APP_SCHEME } from '../../config/brand';

// 네이티브 앱 소셜 로그인
// 1) 시스템 브라우저로 provider authorize 오픈
// 2) provider → 백엔드 콜백 → 딥링크(com.esteban.app://auth?otc=... | ?message=join) 로 복귀
// 3) appUrlOpen 으로 딥링크를 받아 otc → access token 교환
// 반환: { type: 'login' } | { type: 'join' }
export const loginNative = (provider) => {
  const state = buildState(true);
  const url = buildAuthorizeUrl(provider, state);

  return new Promise((resolve, reject) => {
    let handlePromise;
    let settled = false;

    const cleanup = async () => {
      try {
        const handle = await handlePromise;
        await handle?.remove();
      } catch {
        /* noop */
      }
    };

    handlePromise = App.addListener('appUrlOpen', async ({ url: openedUrl }) => {
      // 우리 스킴의 콜백만 처리
      if (!openedUrl || !openedUrl.startsWith(`${APP_SCHEME}://`)) return;
      if (settled) return;
      settled = true;

      let params;
      try {
        params = new URL(openedUrl).searchParams;
      } catch {
        params = new URLSearchParams(openedUrl.split('?')[1] || '');
      }

      await Browser.close().catch(() => {});
      await cleanup();

      const message = params.get('message');
      if (message === 'join') {
        resolve({ type: 'join' });
        return;
      }

      const otc = params.get('otc');
      if (!otc) {
        reject(new Error('로그인 콜백에 otc가 없습니다.'));
        return;
      }

      try {
        const res = await axiosInstance.post('/user/app/token', { otc });
        await setAccessToken(res.data.access_token);
        resolve({ type: 'login' });
      } catch (err) {
        reject(err);
      }
    });

    Browser.open({ url }).catch(async (err) => {
      if (settled) return;
      settled = true;
      await cleanup();
      reject(err);
    });
  });
};
