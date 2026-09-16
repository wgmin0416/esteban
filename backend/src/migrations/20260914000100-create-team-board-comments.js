'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('team_board_comments', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      board_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '게시글 ID',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '작성자 ID',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: '댓글 내용',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('team_board_comments', ['board_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('team_board_comments');
  },
};
