"use strict";
const sequelize = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        comment: "sequence",
      },
      username: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: "이름",
      },
      password: {
        type: DataTypes.STRING(256),
        allowNull: false,
        comment: "비밀번호",
      },
      email: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: "이메일",
      },
      phone: {
        type: DataTypes.STRING(16),
        allowNull: false,
        comment: "휴대폰 번호",
      },
      role: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "user",
        comment: "역할",
      },
      marketing_consent_yn: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "마케팅 수신 동의 여부",
      },
      team_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: "가입한 팀",
      },
      last_login_dt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "마지막 로그인 일시",
      },
    },
    {
      modelName: "User",
      tableName: "users",
      timestamps: true,
      paranoid: true,
      underscored: true,
    }
  );

  return User;
};
