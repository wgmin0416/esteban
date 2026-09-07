'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('basketball_matches', 'quarter_count', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 4,
      comment: '쿼터 수',
    });
    await queryInterface.addColumn('basketball_matches', 'quarter_minutes', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 10,
      comment: '쿼터당 경기 시간(분)',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('basketball_matches', 'quarter_minutes');
    await queryInterface.removeColumn('basketball_matches', 'quarter_count');
  },
};
