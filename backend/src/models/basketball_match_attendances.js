'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BasketballMatchAttendance extends Model {
    static associate(models) {
      // 피벗 테이블이므로 별도 associate 설정은 필요 없음
    }
  }

  BasketballMatchAttendance.init(
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
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '유저 ID',
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
    },
    {
      sequelize,
      modelName: 'BasketballMatchAttendance',
      tableName: 'basketball_match_attendances',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    }
  );

  return BasketballMatchAttendance;
};
