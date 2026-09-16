'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 홈 화면에 노출할 공지 (팀당 1개)
    await queryInterface.addColumn('team_boards', 'pinned_home', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      comment: '홈 화면 노출 공지 여부 (팀당 1개)',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('team_boards', 'pinned_home');
  },
};
