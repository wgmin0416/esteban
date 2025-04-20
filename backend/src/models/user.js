"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // 여기에 모델 간 관계 설정 (예: User.belongsTo(models.Team); 등)
    }
  }

  User.init(
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
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
        comment: "생성 일시",
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
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
      paranoid: true, // deleted_at 컬럼을 soft delete 용으로 사용
      deletedAt: "deleted_at",
    }
  );

  return User;
};