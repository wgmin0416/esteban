'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const sequelizeConfig = require(path.join(__dirname, '..', 'config', 'sequelize'))[env];
const db = {};

const sequelize = sequelizeConfig.use_env_variable
  ? new Sequelize(process.env[sequelizeConfig.use_env_variable], sequelizeConfig)
  : new Sequelize(
      sequelizeConfig.database,
      sequelizeConfig.username,
      sequelizeConfig.password,
      sequelizeConfig
    );

fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.endsWith('.js') && file !== path.basename(__filename) && !file.includes('.test.js')
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// 모델 간의 관계 설정
Object.values(db).forEach((model) => {
  if (model.associate) model.associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
