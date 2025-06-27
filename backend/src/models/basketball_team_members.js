'use strict';
const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BasketballTeamMember extends Model {
    static associate(models) {
      // User
      // BasketballTeamMember(N) : User(1) - 한 유저가 여러 개의 팀에 가입할 수 있음
      BasketballTeamMember.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

      // Team
      // BasketballTeamMember(N) : Team(1) - 한 팀이 여러 명의 선수를 가질 수 있음
      BasketballTeamMember.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });
    }
  }

  BasketballTeamMember.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '팀 ID',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '유저 ID',
      },
      intro: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '소개',
      },
      image_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '이미지 url',
      },
      role: {
        type: DataTypes.ENUM('member', 'manager', 'leader'),
        allowNull: false,
        defaultValue: 'member',
        comment: '역할',
      },
      position: {
        type: DataTypes.ENUM('guard', 'forward', 'center'),
        allowNull: false,
        comment: '포지션',
      },
      uniform_number: {
        type: DataTypes.STRING(3),
        allowNull: true,
        comment: '유니폼 번호',
      },
      activity_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '활동 점수',
      },
      last_attended_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '최근 참석 일시',
      },
      is_active: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: '활동 중 여부',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '생성 일시',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        comment: '수정 일시',
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '삭제 일시',
      },
    },
    {
      sequelize,
      modelName: 'BasketballTeamMember',
      tableName: 'basketball_team_members',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return BasketballTeamMember;
};
