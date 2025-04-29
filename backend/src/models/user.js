"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // 추후 관계 설정 시 작성
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "sequence",
      },
      username: {
        type: DataTypes.STRING(16),
        allowNull: true,
        comment: "이름",
      },
      email: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: "이메일",
      },
      phone: {
        type: DataTypes.STRING(16),
        allowNull: true,
        comment: "휴대폰 번호",
      },
      provider: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: "소셜 로그인 제공자",
      },
      provider_id: {
        type: DataTypes.STRING(128),
        allowNull: false,
        comment: "소셜 제공자의 유저 고유 ID",
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
        type: DataTypes.STRING(128),
        allowNull: true,
        comment: "가입한 팀",
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "마지막 로그인 일시",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "생성 일시",
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "수정 일시",
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "삭제 일시",
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
      underscored: true,
    }
  );

  return User;
};