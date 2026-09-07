'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('basketball_match_attendances', 'status', {
      type: Sequelize.ENUM('attend', 'absent', 'pending'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '참석 상태(참석/불참/미정)',
    });
    await queryInterface.addColumn('basketball_matches', 'status', {
      type: Sequelize.ENUM('scheduled', 'live', 'completed'),
      allowNull: false,
      defaultValue: 'scheduled',
      comment: '경기 상태(예정/진행중/종료)',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('basketball_matches', 'status');
    await queryInterface.removeColumn('basketball_match_attendances', 'status');
    // ENUM 타입 정리 (MySQL은 컬럼 제거 시 함께 사라지므로 별도 불필요)
  },
};
