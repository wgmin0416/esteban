'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TeamDue extends Model {
    static associate(models) {
      // Team
      TeamDue.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });
      
      // User (회원)
      TeamDue.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      
      // User (납부 처리자)
      TeamDue.belongsTo(models.User, { foreignKey: 'paid_by', as: 'paidByUser' });
    }
  }

  TeamDue.init(
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
        comment: '회원 ID',
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '연도',
      },
      month: {
        type: DataTypes.TINYINT,
        allowNull: false,
        comment: '월 (1-12)',
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '회비 금액',
      },
      is_paid: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '납부 여부 (0: 미납, 1: 납부)',
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '납부 일시',
      },
      paid_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '납부 처리한 관리자 ID',
      },
      memo: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '메모',
      },
      reason: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: '정기회비',
        comment: '회비 사유 (정기회비, 지각 벌금, 회식비 등)',
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
      modelName: 'TeamDue',
      tableName: 'team_dues',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return TeamDue;
};
