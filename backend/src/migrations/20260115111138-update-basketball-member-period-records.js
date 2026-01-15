'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // minutes, oreb, dreb 컬럼을 nullable로 변경
    await queryInterface.changeColumn('basketball_member_period_records', 'minutes', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: true,
      comment: '플레이 타임',
    });

    await queryInterface.changeColumn('basketball_member_period_records', 'oreb', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: true,
      defaultValue: 0,
      comment: '공격 리바운드 개수',
    });

    await queryInterface.changeColumn('basketball_member_period_records', 'dreb', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: true,
      defaultValue: 0,
      comment: '수비 리바운드 개수',
    });

    // to_cnt 컬럼명을 to로 변경
    await queryInterface.renameColumn('basketball_member_period_records', 'to_cnt', 'to');
  },

  down: async (queryInterface, Sequelize) => {
    // to 컬럼명을 to_cnt로 되돌리기
    await queryInterface.renameColumn('basketball_member_period_records', 'to', 'to_cnt');

    // minutes, oreb, dreb 컬럼을 다시 not null로 변경
    await queryInterface.changeColumn('basketball_member_period_records', 'minutes', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      comment: '플레이 타임',
    });

    await queryInterface.changeColumn('basketball_member_period_records', 'oreb', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '공격 리바운드 개수',
    });

    await queryInterface.changeColumn('basketball_member_period_records', 'dreb', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '수비 리바운드 개수',
    });
  },
};
