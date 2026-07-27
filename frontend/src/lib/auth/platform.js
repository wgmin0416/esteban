import { Capacitor } from '@capacitor/core';

// 네이티브(iOS/Android 앱) 실행 여부. 웹 브라우저에서는 false.
export const isNative = () => Capacitor.isNativePlatform();
