// backend/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const routes = require("./routes");
const app = express();

// 환경 변수 설정
dotenv.config();

// 미들웨어 설정
app.use(cors()); // CORS 허용
app.use(express.json()); // JSON 요청 본문 파싱

// 라우트 설정
app.use("/api", routes);

// 서버 실행
app.set('port', process.env.PORT || 3000);
const PORT = app.get('port');
app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${app.get('port')}`);
});