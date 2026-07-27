'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('team_dues', 'reason', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: '정기회비',
      comment: '회비 사유 (정기회비, 지각 벌금, 회식비 등)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('team_dues', 'reason');
  },
};
