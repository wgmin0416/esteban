'use strict';
const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class JoinRequest extends Model {
    static associate(models) {
      // JoinRequest(N) : Team(1) - 한 팀이 여러 개의 가입 요청을 받을 수 있음
      JoinRequest.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });

      // JoinRequest(N) : User(1) - 한 유저가 여러 개의 가입 요청을 할 수 있음
      JoinRequest.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  JoinRequest.init(
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
        comment: '신청자',
      },
      applied_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '가입 신청일',
      },
    },
    {
      sequelize,
      modelName: 'JoinRequest',
      tableName: 'join_requests',
      timestamps: false,
      underscored: true,
    }
  );

  return JoinRequest;
};
