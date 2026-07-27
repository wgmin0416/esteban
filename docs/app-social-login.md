# 앱용 소셜 로그인 (Capacitor) — 구현 & 테스트 가이드

웹(팝업+쿠키)과 앱(딥링크+Bearer 토큰)을 한 코드베이스로 지원한다.
`Capacitor.isNativePlatform()`으로 분기하며, 백엔드 OAuth 콜백/토큰 발급 로직은 웹/앱이 공유한다.

## 흐름 (앱)

```
로그인 버튼 → @capacitor/browser 로 provider authorize 오픈
  (state = "app." + uuid,  redirect_uri = 백엔드 콜백[웹과 동일])
→ provider 동의 → 백엔드 /user/{provider}/callback
   · code→token→userinfo, 사용자 조회/생성
   · state가 "app." → 일회용 코드(otc, Redis 60초) 생성
   · 딥링크로 복귀:  com.esteban.app://auth?otc=<otc>   (신규가입은 ?message=join)
→ @capacitor/app appUrlOpen 이 딥링크 수신
→ POST /user/app/token { otc }  →  { access_token }
→ access_token 을 @capacitor/preferences 에 저장
→ 이후 모든 요청에 Authorization: Bearer <access_token>
   · 만료 시 서버(authMiddleware)가 자동 갱신하여 응답 헤더 x-access-token 으로 전달
   · refresh token 은 서버(Redis)에만 보관 (클라이언트로 나가지 않음)
```

웹은 기존 그대로: 팝업 → 백엔드 → `FRONT_URL/#/auth` 리다이렉트 → `postMessage` → 부모 창.

## 주요 파일

**Backend**
- `src/controllers/userController.js` — `finishSocialLogin`/`finishSocialJoin`(웹/앱 분기), `exchangeAppToken`(otc 교환)
- `src/middleware/authMiddleware.js` — Bearer 우선 + 만료 갱신 시 `x-access-token` 헤더
- `src/routes/user/index.js` — `POST /user/app/token`
- `server.js` — CORS에 앱 origin(`capacitor://localhost`, `http://localhost`) + `x-access-token` 노출
- `.env` — `APP_REDIRECT_SCHEME=com.esteban.app://auth`

**Frontend** (`src/lib/auth/`)
- `platform.js` `oauth.js` `tokenStore.js` `loginNative.js`
- `src/lib/axiosInstance.jsx` — 앱 Bearer 부착/토큰 갱신 저장/401 정리
- `src/store/useAuthStore.jsx` — `request*Login` 웹/앱 분기
- `src/pages/user/LoginPage.jsx` — 앱 결과 직접 처리 / 웹 postMessage 유지

**Native**
- `ios/App/App/Info.plist` — `CFBundleURLTypes` (스킴 `com.esteban.app`)
- `android/app/src/main/AndroidManifest.xml` — `<intent-filter>` (VIEW/BROWSABLE, 스킴 `com.esteban.app`)

## 실기기/시뮬레이터 테스트 (4단계)

> ⚠️ 사전 설치: iOS는 **Xcode**, Android는 **Android Studio + SDK**.

1. **백엔드를 기기에서 접근 가능하게**: 기기에서 `localhost:3000`은 기기 자신을 가리킴.
   - 맥 LAN IP 또는 ngrok 등으로 노출하고, 앱의 `VITE_API_URL`을 해당 주소로 설정.
   - backend `.env`의 provider redirect URI도 그 주소로 맞추고, **각 provider 콘솔의 redirect URI 화이트리스트에 등록**해야 함(Google/Naver/Kakao).
2. 빌드 반영: `cd frontend && npm run build && npx cap sync`
3. 실행:
   - iOS: `npx cap run ios`  (또는 `npx cap open ios` 후 Xcode에서 서명/실행)
   - Android: `npx cap run android`
4. 로그인 버튼 → 시스템 브라우저 → 동의 → 앱으로 자동 복귀(딥링크) → 홈 진입 확인.

### 빠른 딥링크 점검 (로그인 없이)
- Android: `adb shell am start -a android.intent.action.VIEW -d "com.esteban.app://auth?otc=test"`
- iOS 시뮬레이터: `xcrun simctl openurl booted "com.esteban.app://auth?otc=test"`
  → 앱이 열리고 `appUrlOpen`이 otc를 받아 `/user/app/token`을 호출하면(테스트 otc라 401) 배선이 정상.

## v2 로드맵 (하드닝/UX)
- 딥링크를 Universal/App Links(https)로 승격(스킴 하이재킹 방지).
- CSRF: state nonce를 서버에 저장 후 콜백에서 대조.
- 한국 UX: 카카오/네이버 **네이티브 SDK** 로그인(카카오톡 앱 연동)으로 전환.
- access token을 Preferences → Keychain/Keystore(보안 저장소)로 이전.
