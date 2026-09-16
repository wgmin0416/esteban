'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 어시스트 대상 기록: 이 선수(패서)가 누구에게 어시스트했는지 { [scorerUserId]: count }
    await queryInterface.addColumn('basketball_member_quarter_records', 'assist_targets', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '어시스트 대상 JSON {scorerUserId: count}',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('basketball_member_quarter_records', 'assist_targets');
  },
};
