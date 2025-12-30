require('dotenv').config();

const sequelizeConfig = {
  local: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    migrationStoragePath: 'src/migrations',
    seederStoragePath: 'src/seeders',
  },
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    migrationStoragePath: 'src/migrations',
    seederStoragePath: 'src/seeders',
  },
  stage: {},
  production: {},
};

// migration 파일 생성
// npx sequelize-cli migration:generate --name create-table-name --config src/config/sequelize.js

// migration 실행
// npx sequelize-cli db:migrate --config src/config/sequelize.js

// migration 실행 취소
// npx sequelize-cli db:migrate:undo --config src/config/sequelize.js

module.exports = sequelizeConfig;
