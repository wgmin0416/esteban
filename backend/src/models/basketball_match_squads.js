'use strict';
const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BasketballMatchSquad extends Model {
    static associate(models) {
      // BasketballMatch
      // BasketballMatchSquad(N) : BasketballMatch(1) - 한 경기가 여러 개의 스쿼드를 가질 수 있음
      BasketballMatchSquad.belongsTo(models.BasketballMatch, {
        foreignKey: 'match_id',
        as: 'match',
      });

      // BasketballMatchSquadMember
      // BasketballMatchSquad(1) : BasketballMatchSquadMember(N) - 한 스쿼드가 여러 선수를 가질 수 있음
      BasketballMatchSquad.hasMany(models.BasketballMatchSquadMember, {
        foreignKey: 'squad_id',
        as: 'members',
      });
    }
  }

  BasketballMatchSquad.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      match_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '매치 ID',
      },
      squad_label: {
        type: DataTypes.STRING(16),
        allowNull: false,
        comment: '팀',
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
      modelName: 'BasketballMatchSquad',
      tableName: 'basketball_match_squads',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return BasketballMatchSquad;
};
