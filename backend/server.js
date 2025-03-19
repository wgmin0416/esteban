const express = require("express");
// 환경 변수 설정
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const routes = require("./src/routes");
const db = require("./src/db/db");
const app = express();
const sequelize = require("./src/db/sequelize");

// 미들웨어 설정
app.use(cors()); // CORS 허용
app.use(express.json()); // JSON 요청 본문 파싱

// 데이터베이스 연결
sequelize
  .sync()
  .then(() => {
    console.log("Database synced");
  })
  .catch((error) => {
    console.error("Error syncing database:", error);
  });

// api 라우트 설정
app.use("/api/v1", routes);

// 404 에러 처리 미들웨어
app.use((req, res, next) => {
  res.status(404).json({ message: "Not found" });
});

// 서버 실행
app.set("port", process.env.PORT || 3000);
const PORT = app.get("port");
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
