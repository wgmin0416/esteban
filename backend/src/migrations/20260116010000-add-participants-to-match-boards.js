'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('match_boards', 'max_participants', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '최대 모집 인원',
    });

    await queryInterface.addColumn('match_boards', 'current_participants', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '현재 참가 인원',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('match_boards', 'max_participants');
    await queryInterface.removeColumn('match_boards', 'current_participants');
  },
};
