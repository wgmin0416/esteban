'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 이 쿼터에 실제 코트 출전 여부(+/- · Net 산출용). 미지정 기록은 전원 출전(1)로 간주
    await queryInterface.addColumn('basketball_member_quarter_records', 'on_court', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 1,
      comment: '이 쿼터 코트 출전 여부(+/- 산출용)',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('basketball_member_quarter_records', 'on_court');
  },
};
