'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('team_boards', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      team_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '팀 ID',
        references: {
          model: 'teams',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '작성자 ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '제목',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: '내용',
      },
      views: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '조회수',
      },
      is_notice: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '공지사항 여부',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '생성 일시',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '수정 일시',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '삭제 일시',
      },
    });

    // 인덱스 추가
    await queryInterface.addIndex('team_boards', ['team_id']);
    await queryInterface.addIndex('team_boards', ['user_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('team_boards');
  },
};
