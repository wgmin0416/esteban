# 앱 이름/리브랜딩 체크리스트

앱 이름이 아직 미확정이라, 나중에 한 번에 바꿀 수 있도록 정리한 문서.
크게 **①표시 이름**과 **②앱ID·딥링크 스킴**과 **③레포/DB**로 나뉜다.

---

## ① 표시 이름 (화면에 보이는 브랜드명)
**대부분 한 곳만 바꾸면 됨:**
- `frontend/src/config/brand.js` → `APP_NAME` 변경 ← **이거 하나로 헤더 로고·푸터·탭 타이틀 전부 반영**

수동으로 같이 바꿔야 하는 곳(JS import 불가):
- `frontend/index.html` `<title>` (초기 로딩 시 잠깐 노출. main.jsx가 APP_NAME으로 덮어씀 — 선택)
- `frontend/capacitor.config.json` `"appName"`
- `frontend/ios/App/App/Info.plist` `CFBundleDisplayName`
- `backend/server.js` Swagger `title: 'Esteban API'`

## ② 앱 ID / 딥링크 스킴 (`com.esteban.app`)
JS 쪽은 `brand.js`의 `APP_SCHEME`로 중앙화했지만, **네이티브·설정은 반드시 아래를 같은 값으로 함께 수정**해야 함(안 그러면 소셜 로그인 딥링크가 깨짐):
- `frontend/src/config/brand.js` → `APP_SCHEME`
- `frontend/capacitor.config.json` → `appId`
- `frontend/ios/App/App/Info.plist` → `CFBundleURLName`, `CFBundleURLSchemes`
- `frontend/ios/App/App.xcodeproj/project.pbxproj` → `PRODUCT_BUNDLE_IDENTIFIER` (2곳)
- `frontend/android/app/build.gradle` → `namespace`, `applicationId`
- `frontend/android/app/src/main/AndroidManifest.xml` → `<data android:scheme=...>`
- `backend/.env` → `APP_REDIRECT_SCHEME`
- (OAuth provider 콘솔) redirect URI가 스킴/도메인 기반이면 함께 갱신

수정 후: `cd frontend && npx cap sync` 로 네이티브에 반영.

> 앱ID(번들 ID)는 앱스토어/플레이스토어에 **한 번 등록하면 변경 불가**이므로, 스토어 출시 전에 최종 확정할 것.

## ③ 레포 / DB / 기타
- **GitHub 레포명 변경**: GitHub에서 Rename → 로컬은 `git remote set-url origin <새 URL>`
- **로컬 폴더명**: `esteban` → 새 이름 (경로 하드코딩 없음, 그냥 폴더 rename 후 재오픈)
- **DB 이름**: `backend/.env` `DB_NAME=esteban` (선택 — 바꾸려면 DB 생성/마이그레이션 별도)
- 테스트 계정 이메일 `test@esteban.dev` (`backend/src/controllers/userController.js`, 무해)

---

## 최소 절차 (이름만 빨리 바꿀 때)
1. `frontend/src/config/brand.js`의 `APP_NAME` 수정 → UI 끝
2. 스토어/네이티브까지 갈 거면 위 ②까지 일괄 수정 후 `npx cap sync`
