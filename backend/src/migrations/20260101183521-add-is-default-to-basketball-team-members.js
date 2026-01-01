'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // basketball_team_members 테이블에 is_default 컬럼 추가
    await queryInterface.addColumn('basketball_team_members', 'is_default', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      comment: '기본 노출 팀 여부',
    });

    // 같은 user_id에 대해 is_default=1인 row는 1개만 존재하도록 unique constraint 추가
    // MySQL에서는 partial unique index를 지원하지 않으므로, application level에서 체크
    // 필요시 트리거나 애플리케이션 로직으로 보장
  },

  down: async (queryInterface, Sequelize) => {
    // is_default 컬럼 제거
    await queryInterface.removeColumn('basketball_team_members', 'is_default');
  },
};
