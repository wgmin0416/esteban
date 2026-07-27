// 환경 변수 설정
const path = require('path');
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
// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Esteban API',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'User',
        description: '회원 API',
      },
      {
        name: 'Team',
        description: '팀 API',
      },
    ],
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Local server',
      },
    ],
  },
  apis: [path.join(__dirname, 'src/controllers/*.js')],
};
const specs = swaggerJsdoc(options);

app.use(httpLogger);

// CORS 허용 (웹: FRONT_URL / 앱: Capacitor 웹뷰 origin)
const allowedOrigins = [
  process.env.FRONT_URL,
  'capacitor://localhost', // iOS 네이티브 웹뷰
  'http://localhost', // Android 네이티브 웹뷰
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // origin 없음(네이티브 앱/서버간 호출) 또는 허용 목록이면 통과
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    exposedHeaders: ['x-access-token'], // 앱이 갱신된 토큰을 읽을 수 있도록 노출
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// cookie-parser
app.use(cookieParser());

// 데이터베이스 연결
// 주의: sync()는 개발 편의용. 컬럼 변경은 반영되지 않아(스키마 드리프트) 위험하므로
// 프로덕션에서는 실행하지 않고 마이그레이션(npx sequelize-cli db:migrate)으로 관리한다.
if (process.env.NODE_ENV !== 'production') {
  sequelize
    .sync()
    .then(() => {
      console.log('Database synced (dev)');
    })
    .catch((error) => {
      console.error('Error syncing database:', error);
    });
} else {
  // 프로덕션: 연결만 확인
  sequelize
    .authenticate()
    .then(() => console.log('Database connected'))
    .catch((error) => console.error('Error connecting database:', error));
}

// api 라우트 설정
app.use('/api/v1', routes);

// swagger
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
    },
  })
);

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
    process.exit(1);
  });
});
