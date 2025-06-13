require('dotenv').config();

const sequelizeConfig = {
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
// npx sequelize-cli db:migrate --config src/config/sequelize.js

module.exports = sequelizeConfig;
