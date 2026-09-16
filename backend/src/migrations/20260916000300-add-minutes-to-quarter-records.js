'use strict';

// 선수 교체/출전 시간: 쿼터별 선수 출전 분
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('basketball_member_quarter_records', 'minutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '해당 쿼터 출전 분(교체 반영)',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('basketball_member_quarter_records', 'minutes');
  },
};
