// 환경 변수 설정
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const cors = require('cors');
const routes = require('./src/routes');
const { sequelize } = require('./src/models');
const cookieParser = require('cookie-parser');
const errorHandler = require('./src/middleware/errorHandler');
const httpLogger = require('./src/utils/httpLogger');
const logger = require('./src/utils/logger');

app.use(httpLogger); // HTTP 요청 로그

// CORS 허용
app.use(
  cors({
    origin: process.env.FRONT_URL,
    credentials: true,
  })
);
app.use(express.json()); // JSON 요청 본문 파싱
// cookie-parser
app.use(cookieParser());

// 데이터베이스 연결
sequelize
  .sync()
  .then(() => {
    console.log('Database synced');
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
  });

// api 라우트 설정
app.use('/api/v1', routes);

// 에러 핸들러
app.use(errorHandler);

// 서버 실행
app.set('port', process.env.PORT || 3000);
const PORT = app.get('port');
const server = app.listen(PORT, () => {
  logger.info(`서버 실행 중: http://localhost:${PORT}`);
});

// error
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException error: ', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('unhandledRejection error:', reason);
  server.close(() => {
    process.exit(1); // 서버 종료 후 프로세스 종료
  });
});
