'use strict';
const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BasketballMemberPeriodRecord extends Model {
    static associate(models) {
      // User
      // BasketballMemberPeriodRecord(N) : User(1) - 한 유저가 여러 개의 기간 별 경기 기록을 가질 수 있음
      BasketballMemberPeriodRecord.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

      // Team
      // BasketballMemberPeriodRecord(N) : Team(1) - 한 팀이 여러 개의 기간 별 경기 기록을 가질 수 있음
      BasketballMemberPeriodRecord.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });

      // BasketballMatchSquad
      // BasketballMemberPeriodRecord(N) : BasketballMatchSquad(1) - 한 스쿼드가 여러 개의 기간 기록을 가질 수 있음
      BasketballMemberPeriodRecord.belongsTo(models.BasketballMatchSquad, {
        foreignKey: 'squad_id',
        as: 'squad',
      });
    }
  }

  BasketballMemberPeriodRecord.init(
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
      squad_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '스쿼드 ID',
      },
      period: {
        type: DataTypes.ENUM('month'),
        allowNull: false,
        comment: '기록 기간',
      },
      minutes: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true,
        comment: '플레이 타임',
      },
      is_win: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '승패 여부',
      },
      pts: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '총 득점',
      },
      fgm: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '필드골 성공 개수',
      },
      fga: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '필드골 시도 개수',
      },
      fg_pct: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '필드골 성공률',
      },
      twopm: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '2점슛 성공 개수',
      },
      twopa: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '2점슛 시도 개수',
      },
      twop_pct: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '2점슛 성공률',
      },
      threepm: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '3점슛 성공 개수',
      },
      threepa: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '3점슛 시도 개수',
      },
      threep_pct: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '3점슛 성공률',
      },
      ftm: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '자유투 성공 개수',
      },
      fta: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '자유투 시도 개수',
      },
      ft_pct: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '자유투 성공률',
      },
      oreb: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true,
        defaultValue: 0,
        comment: '공격 리바운드 개수',
      },
      dreb: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true,
        defaultValue: 0,
        comment: '수비 리바운드 개수',
      },
      reb: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '총 리바운드 개수',
      },
      ast: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '어시스트 개수',
      },
      stl: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '스틸 개수',
      },
      blk: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '블록 개수',
      },
      to: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '턴오버 개수',
      },
      pf: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '개인 파울 개수',
      },
      dd2: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '더블더블 여부',
      },
      td3: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '트리플더블 여부',
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
    },
    {
      sequelize,
      modelName: 'BasketballMemberPeriodRecord',
      tableName: 'basketball_member_period_records',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    }
  );

  return BasketballMemberPeriodRecord;
};
