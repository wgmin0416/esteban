'use strict';
const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BasketballMatchSquadMember extends Model {
    static associate(models) {
      // User
      // BasketballMatchSquadMember(N) : User(1) - 한 유저가 여러 개의 스쿼드를 가질 수 있음
      BasketballMatchSquadMember.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });

      // BasketballMatchSquad
      // BasketballMatchSquadMember(N) : BasketballMatchSquad(1) - 한 스쿼드가 여러 선수를 가질 수 있음
      BasketballMatchSquadMember.belongsTo(models.BasketballMatchSquad, {
        foreignKey: 'squad_id',
        as: 'squad',
      });
    }
  }

  BasketballMatchSquadMember.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      squad_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '스쿼드 ID',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '유저 ID',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '생성 일시',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        comment: '수정 일시',
      },
    },
    {
      sequelize,
      modelName: 'BasketballMatchSquadMember',
      tableName: 'basketball_match_squad_members',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return BasketballMatchSquadMember;
};
