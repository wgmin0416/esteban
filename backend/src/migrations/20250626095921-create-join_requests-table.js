'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('join_requests', {
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
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '신청자',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      applied_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '가입 신청일',
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('join_requests');
  },
};
