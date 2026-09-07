import UIKit
import Capacitor

// WKWebView의 좌측 엣지 스와이프(뒤로/앞으로) 제스처 활성화.
// HashRouter 히스토리를 따라 이전 화면으로 이동한다.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        self.webView?.allowsBackForwardNavigationGestures = true
    }
}
