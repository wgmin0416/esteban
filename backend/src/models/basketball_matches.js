'use strict';
const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BasketballMatch extends Model {
    static associate(models) {
      // Team
      // BasketballMatch(N) : Team(1) - 한 팀이 여러 개의 경기를 가질 수 있음
      BasketballMatch.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });

      // BasketballMemberMatchRecord
      // BasketballMatch(1) : BasketballMemberMatchRecord(N) - 한 경기가 여러 개의 선수 기록을 가질 수 있음
      BasketballMatch.hasMany(models.BasketballMemberMatchRecord, {
        foreignKey: 'match_id',
        as: 'match_records',
      });

      // BasketballMemberPeriodRecord
      // BasketballMatch(1) : BasketballMemberPeriodRecord(N) - 한 경기가 여러 개의 기간 별 선수 기록을 가질 수 있음
      BasketballMatch.hasMany(models.BasketballMemberPeriodRecord, {
        foreignKey: 'match_id',
        as: 'period_records',
      });

      // BasketballMatchSquad
      // BasketballMatch(1) : BasketballMatchSquad(N) - 한 경기가 여러 스쿼드를 가질 수 있음
      BasketballMatch.hasMany(models.BasketballMatchSquad, {
        foreignKey: 'match_id',
        as: 'match_squads',
      });
    }
  }

  BasketballMatch.init(
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
      title: {
        type: DataTypes.STRING(128),
        allowNull: false,
        comment: '경기 제목',
      },
      match_date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '경기 일시',
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '경기 장소',
      },
      type: {
        type: DataTypes.ENUM('intra_squad', 'invitation', 'pickup', 'training', 'tournament'),
        allowNull: false,
        defaultValue: 'intra_squad',
        comment: '경기 형식',
      },
      total_players: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '총 참석 인원',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '생성 일시',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
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
      modelName: 'BasketballMatch',
      tableName: 'basketball_matches',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return BasketballMatch;
};
