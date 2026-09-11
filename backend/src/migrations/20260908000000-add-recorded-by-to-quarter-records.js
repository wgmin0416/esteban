'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 이 쿼터의 기록을 저장(확정)한 담당자
    await queryInterface.addColumn('basketball_member_quarter_records', 'recorded_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '이 쿼터 기록을 저장한 담당자(user_id)',
    });
    await queryInterface.addConstraint('basketball_member_quarter_records', {
      fields: ['recorded_by'],
      type: 'foreign key',
      name: 'fk_quarter_record_recorded_by',
      references: { table: 'users', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint(
      'basketball_member_quarter_records',
      'fk_quarter_record_recorded_by'
    );
    await queryInterface.removeColumn('basketball_member_quarter_records', 'recorded_by');
  },
};
