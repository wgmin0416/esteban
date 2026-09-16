'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TeamBoardComment extends Model {
    static associate(models) {
      TeamBoardComment.belongsTo(models.TeamBoard, { foreignKey: 'board_id', as: 'board' });
      TeamBoardComment.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
    }
  }

  TeamBoardComment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      board_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '게시글 ID',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '작성자 ID',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '댓글 내용',
      },
    },
    {
      sequelize,
      modelName: 'TeamBoardComment',
      tableName: 'team_board_comments',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return TeamBoardComment;
};
