'use strict';

// 정기 경기 자동 생성 스케줄 (팀당 여러 개, 요일별)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('team_match_schedules', {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      team_id: { type: Sequelize.INTEGER, allowNull: false, comment: '팀 ID' },
      weekday: { type: Sequelize.TINYINT, allowNull: false, comment: '요일 0(일)~6(토)' },
      time: { type: Sequelize.STRING(5), allowNull: false, comment: 'HH:MM' },
      title: { type: Sequelize.STRING(128), allowNull: false, defaultValue: '정기 경기' },
      location: { type: Sequelize.STRING(255), allowNull: true },
      quarter_count: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 4 },
      lead_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 7, comment: '며칠 전에 생성' },
      is_active: { type: Sequelize.TINYINT(1), allowNull: false, defaultValue: 1 },
      last_created_date: { type: Sequelize.STRING(10), allowNull: true, comment: '마지막 생성한 회차 날짜(YYYY-MM-DD)' },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('team_match_schedules', ['team_id', 'is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('team_match_schedules');
  },
};
