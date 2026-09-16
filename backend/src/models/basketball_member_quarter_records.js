'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BasketballMemberQuarterRecord extends Model {
    static associate(models) {
      // User
      BasketballMemberQuarterRecord.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

      // Team
      BasketballMemberQuarterRecord.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });

      // BasketballMatch
      BasketballMemberQuarterRecord.belongsTo(models.BasketballMatch, {
        foreignKey: 'match_id',
        as: 'match',
      });

      // BasketballMatchSquad
      BasketballMemberQuarterRecord.belongsTo(models.BasketballMatchSquad, {
        foreignKey: 'squad_id',
        as: 'squad',
      });

      // 기록 담당자(이 쿼터 저장을 누른 사람)
      BasketballMemberQuarterRecord.belongsTo(models.User, {
        foreignKey: 'recorded_by',
        as: 'recorder',
      });
    }
  }

  BasketballMemberQuarterRecord.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'sequence',
      },
      team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '팀 ID',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '유저 ID(게스트면 NULL)',
      },
      guest_name: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: '게스트 이름(실유저가 아닌 경우)',
      },
      match_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '매치 ID',
      },
      squad_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '스쿼드 ID',
      },
      recorded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '이 쿼터 기록을 저장한 담당자(user_id)',
      },
      on_court: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: '이 쿼터 코트 출전 여부(+/- 산출용)',
      },
      game_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: '게임 번호(하루 내 여러 게임)',
      },
      quarter: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        comment: '쿼터 번호(1부터)',
      },
      is_win: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '승패 여부(경기 기준)',
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
      assist_targets: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '어시스트 대상 JSON {scorerUserId: count}',
        get() {
          const v = this.getDataValue('assist_targets');
          if (!v) return null;
          try {
            return JSON.parse(v);
          } catch {
            return null;
          }
        },
        set(val) {
          this.setDataValue('assist_targets', val == null ? null : JSON.stringify(val));
        },
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
      turnover: {
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
      modelName: 'BasketballMemberQuarterRecord',
      tableName: 'basketball_member_quarter_records',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['match_id', 'user_id', 'quarter', 'game_no'],
          name: 'uq_quarter_record_match_user_quarter_game',
        },
      ],
    }
  );

  return BasketballMemberQuarterRecord;
};
