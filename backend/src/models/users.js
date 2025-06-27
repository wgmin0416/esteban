'use strict';
const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Team
      // User(1) : Team(N) - 한 유저가 여러 개의 팀을 생성할 수 있음
      User.hasMany(models.Team, { foreignKey: 'leader_id', as: 'teams' });

      // BasketballTeamMember
      // User(1) : BasketballTeamMember(N) - 한 유저가 여러 팀에 가입할 수 있음
      User.hasMany(models.BasketballTeamMember, { foreignKey: 'user_id', as: 'team_members' });

      // JoinRequest
      // User(1) : JoinRequest(N) - 한 유저가 여러 팀에 가입신청 할 수 있음
      User.hasMany(models.JoinRequest, { foreignKey: 'user_id', as: 'join_requests' });

      // BasketballMatchAttendance
      // User(N) : BasketBallMatch(M) - 피벗테이블(BasketballMatchAttendance)
      User.belongsToMany(models.BasketballMatch, {
        through: models.BasketballMatchAttendance,
        foreignKey: 'user_id',
        otherKey: 'match_id',
        as: 'attend_matches',
      });
      User.hasMany(models.BasketballMatchAttendance, {
        foreignKey: 'user_id',
        as: 'match_attendances',
      });

      // BasketballMemberMatchRecord
      // User(1) : BasketballMemberMatchRecord(N) - 한 유저가 여러 경기 기록을 가질 수 있음
      User.hasMany(models.BasketballMemberMatchRecord, {
        foreignKey: 'user_id',
        as: 'match_records',
      });

      // BasketballMemberPeriodRecord
      // User(1) : BasketballMemberPeriodRecord(N) - 한 유저가 여러 기간별 기록을 가질 수 있음
      User.hasMany(models.BasketballMemberPeriodRecord, {
        foreignKey: 'user_id',
        as: 'period_records',
      });

      // BasketballMatchSquadMember
      // User(M) : BasketballMatchSquad(N) - 피벗테이블(BasketballMatchSquadMember)
      User.belongsToMany(models.BasketballMatchSquad, {
        through: models.BasketballMatchSquadMember,
        foreignKey: 'user_id',
        otherKey: 'squad_id',
        as: 'squads',
      });
      User.hasMany(models.BasketballMatchSquadMember, {
        foreignKey: 'user_id',
        as: 'squad_members',
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      name: {
        type: DataTypes.STRING(16),
        allowNull: true,
        comment: '이름',
      },
      email: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: '이메일',
      },
      phone: {
        type: DataTypes.STRING(11),
        allowNull: true,
        comment: '휴대폰 번호',
      },
      gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: true,
        comment: '성별',
      },
      provider: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: '소셜 로그인 제공자',
      },
      provider_id: {
        type: DataTypes.STRING(128),
        allowNull: false,
        comment: '소셜 제공자의 유저 고유 ID',
      },
      role: {
        type: DataTypes.ENUM('user', 'developer', 'admin'),
        allowNull: false,
        defaultValue: 'user',
        comment: '역할',
      },
      is_marketing_agreed: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '마케팅 수신 동의 여부',
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '마지막 로그인 일시',
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
        comment: '탈퇴 일시',
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return User;
};
