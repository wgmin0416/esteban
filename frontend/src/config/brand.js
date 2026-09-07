// ────────────────────────────────────────────────
// 앱 브랜드 설정 (이름 변경 시 여기 한 곳만 바꾸면 UI 전체 반영)
// ────────────────────────────────────────────────

// 화면에 표시되는 앱 이름 (로고/헤더/푸터/탭 타이틀 등)
export const APP_NAME = 'Esteban';

// 딥링크/번들 스킴.
// ⚠️ 이 값은 네이티브 파일과 "반드시" 일치해야 함 (JS만 바꿔선 안 됨):
//   - frontend/capacitor.config.json (appId)
//   - frontend/ios/App/App/Info.plist (CFBundleURLName/Schemes)
//   - frontend/ios/App/App.xcodeproj/project.pbxproj (PRODUCT_BUNDLE_IDENTIFIER)
//   - frontend/android/app/build.gradle (namespace, applicationId)
//   - frontend/android/app/src/main/AndroidManifest.xml (data scheme)
//   - backend/.env (APP_REDIRECT_SCHEME)
// 자세한 리네임 절차는 docs/RENAME.md 참고.
export const APP_SCHEME = 'com.esteban.app';
