'use strict';

/** @type {import('sequelize-cli').Migration} */
const TABLES = [
  'basketball_match_squad_members',
  'basketball_member_match_records',
  'basketball_member_quarter_records',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of TABLES) {
      // 게스트 이름 컬럼 추가
      await queryInterface.addColumn(table, 'guest_name', {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: '게스트 이름(실유저가 아닌 경우)',
      });
      // user_id 를 nullable 로 (FK 유지). 게스트는 user_id NULL + guest_name 사용
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`user_id\` INT NULL COMMENT '유저 ID(게스트면 NULL)';`
      );
    }
  },

  down: async (queryInterface) => {
    for (const table of TABLES) {
      // 게스트 행이 있으면 되돌릴 수 없음(수동 정리 필요)
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`user_id\` INT NOT NULL COMMENT '유저 ID';`
      );
      await queryInterface.removeColumn(table, 'guest_name');
    }
  },
};
