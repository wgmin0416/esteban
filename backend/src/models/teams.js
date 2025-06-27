'use strict';
const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Team extends Model {
    static associate(models) {
      // User
      // Team(N) : User(1) - 한 유저가 여러 개의 팀을 생성할 수 있음
      Team.belongsTo(models.User, { foreignKey: 'leader_id', as: 'leader' });

      // BasketballTeamMember
      // Team(1) : BasketballTeamMember(N) - 한 팀이 여러 명의 멤버를 가질 수 있음
      Team.hasMany(models.BasketballTeamMember, { foreignKey: 'team_id', as: 'members' });

      // JoinRequest
      // Team(1) : JoinRequest(N) - 한 팀이 여러 개의 가입신청을 받을 수 있음
      Team.hasMany(models.JoinRequest, { foreignKey: 'team_id', as: 'join_requests' });

      // BasketballMemberMatchRecord
      // Team(1) : BasketballMemberMatchRecord(N) - 한 팀이 여러 경기 기록을 가질 수 있음
      Team.hasMany(models.BasketballMemberMatchRecord, {
        foreignKey: 'team_id',
        as: 'match_records',
      });

      // BasketballMemberPeriodRecord
      // Team(1) : BasketballMemberPeriodRecord(N) - 한 팀이 여러 기간 별 경기 기록을 가질 수 있음
      Team.hasMany(models.BasketballMemberPeriodRecord, {
        foreignKey: 'team_id',
        as: 'period_records',
      });

      // BasketballMatch
      // Team(1) : BasketballMatch(N) - 한 팀이 여러 경기를 할 수 있음
      Team.hasMany(models.BasketballMatch, { foreignKey: 'team_id', as: 'matches' });

      // BasketballMatchSquad
      // Team(1) : BasketballMatchSquad(N) - 한 팀이 여러 개의 스쿼드를 가질 수 있음
      Team.hasMany(models.BasketballMatchSquad, { foreignKey: 'team_id', as: 'squads' });
    }
  }

  Team.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      name: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: '팀명',
      },
      leader_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '리더 ID',
      },
      sports: {
        type: DataTypes.ENUM('basketball'),
        allowNull: false,
        defaultValue: 'basketball',
        comment: '종목',
      },
      intro: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '팀 소개',
      },
      logo_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '로고 이미지 url',
      },
      region: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: '',
        comment: '활동 지역',
      },
      established_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '창단 일시',
      },
      is_public: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: '공개 여부',
      },
      team_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '팀 로고 이미지 url',
      },
      boost_promoted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '부스터 구독 권유 일시',
      },
      booster_expired_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '부스터 구독 만료일',
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
        comment: '해체 일시',
      },
    },
    {
      sequelize,
      modelName: 'Team',
      tableName: 'teams',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return Team;
};
