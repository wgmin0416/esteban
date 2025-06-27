'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('basketball_match_squads', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      match_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'basketball_matches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '매치 ID',
      },
      squad_label: {
        type: Sequelize.STRING(16),
        allowNull: false,
        comment: '팀',
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('basketball_match_squads');
  },
};
