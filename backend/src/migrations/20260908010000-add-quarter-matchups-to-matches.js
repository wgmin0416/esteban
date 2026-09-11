'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 3파전 이상: 쿼터별 대진(붙는 두 스쿼드). { "1": [squadIdA, squadIdB], ... }
    await queryInterface.addColumn('basketball_matches', 'quarter_matchups', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: '쿼터별 대진 { quarter: [squadIdA, squadIdB] } (2파전은 미사용)',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('basketball_matches', 'quarter_matchups');
  },
};
