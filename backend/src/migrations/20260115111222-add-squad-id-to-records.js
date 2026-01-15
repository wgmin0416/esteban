'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // basketball_member_match_records 테이블에 squad_id 컬럼 추가
    await queryInterface.addColumn('basketball_member_match_records', 'squad_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '스쿼드 ID',
      references: {
        model: 'basketball_match_squads',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // basketball_member_period_records 테이블에 squad_id 컬럼 추가
    await queryInterface.addColumn('basketball_member_period_records', 'squad_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '스쿼드 ID',
      references: {
        model: 'basketball_match_squads',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // basketball_member_period_records 테이블에서 squad_id 컬럼 제거
    await queryInterface.removeColumn('basketball_member_period_records', 'squad_id');

    // basketball_member_match_records 테이블에서 squad_id 컬럼 제거
    await queryInterface.removeColumn('basketball_member_match_records', 'squad_id');
  },
};
