'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('basketball_match_squad_members', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      squad_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'basketball_match_squads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '스쿼드 ID',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    });
    await queryInterface.addConstraint('basketball_match_squad_members', {
      fields: ['squad_id', 'user_id'],
      type: 'unique',
      name: 'uq_squad_user',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('basketball_match_squad_members');
  },
};
