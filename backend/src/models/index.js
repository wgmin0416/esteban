"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process = require("process");

const env = process.env.NODE_ENV || "development";
console.log("env: ", env);
const config = require(path.join(__dirname, "..", "config", "config"))[env];
console.log("path: ", path.join(__dirname, "..", "config", "config.js"));
const db = {};

const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable], config)
  : new Sequelize(config.database, config.username, config.password, config);

fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.endsWith(".js") &&
      file !== path.basename(__filename) &&
      !file.includes(".test.js")
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// 모델 간의 관계 설정
Object.values(db).forEach((model) => {
  if (model.associate) model.associate(db);
});

// `db` 객체에 sequelize 관련 정보 추가
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
