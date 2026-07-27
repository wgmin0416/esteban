'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TeamBoard extends Model {
    static associate(models) {
      // Team
      TeamBoard.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });
      
      // User (작성자)
      TeamBoard.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
    }
  }

  TeamBoard.init(
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
        comment: '작성자 ID',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '제목',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '내용',
      },
      view_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '조회수',
      },
      is_notice: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '공지사항 여부',
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
      modelName: 'TeamBoard',
      tableName: 'team_boards',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return TeamBoard;
};
