const Sequelize = require("sequelize");

// Sequelize 인스턴스 생성
const sequelize = new Sequelize("esteban", "root", "Alsdndrl1!", {
  host: "localhost",
  dialect: "mysql",
  logging: true,
});

module.exports = sequelize;
