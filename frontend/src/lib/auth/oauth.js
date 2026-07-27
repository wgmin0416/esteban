// 소셜 로그인 authorize URL 빌더 (웹/앱 공통)
// redirect_uri는 웹/앱 동일하게 백엔드 콜백을 사용하고,
// state 접두사("app.")로 백엔드가 앱 요청을 판별해 딥링크로 응답한다.
const providers = {
  google: {
    rootUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    params: () => ({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email', // email 포함 (기존 누락 버그 수정)
      access_type: 'online',
      include_granted_scopes: 'false',
      prompt: 'select_account',
    }),
  },
  naver: {
    rootUrl: 'https://nid.naver.com/oauth2.0/authorize',
    params: () => ({
      response_type: 'code',
      client_id: import.meta.env.VITE_NAVER_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_NAVER_REDIRECT_URL,
    }),
  },
  kakao: {
    rootUrl: 'https://kauth.kakao.com/oauth/authorize',
    params: () => ({
      response_type: 'code',
      client_id: import.meta.env.VITE_KAKAO_REST_API_KEY,
      redirect_uri: import.meta.env.VITE_KAKAO_REDIRECT_URL,
    }),
  },
};

// 웹: state = 랜덤 / 앱: state = "app." + 랜덤 (백엔드 분기용)
export const buildState = (native) =>
  `${native ? 'app.' : ''}${crypto.randomUUID()}`;

export const buildAuthorizeUrl = (provider, state) => {
  const p = providers[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}`);
  const qs = new URLSearchParams({ ...p.params(), state });
  return `${p.rootUrl}?${qs.toString()}`;
};
