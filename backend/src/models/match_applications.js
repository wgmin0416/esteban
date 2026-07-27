'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MatchApplication extends Model {
    static associate(models) {
      // 경기 모집 게시글
      MatchApplication.belongsTo(models.MatchBoard, { foreignKey: 'match_board_id', as: 'matchBoard' });
      
      // 신청자
      MatchApplication.belongsTo(models.User, { foreignKey: 'user_id', as: 'applicant' });
    }
  }

  MatchApplication.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      match_board_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '경기 모집 게시글 ID',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '신청자 ID',
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: '신청 상태',
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '신청 메시지',
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
      modelName: 'MatchApplication',
      tableName: 'match_applications',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return MatchApplication;
};
