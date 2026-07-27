'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('team_dues', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      team_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '팀 ID',
        references: {
          model: 'teams',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '회원 ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '연도',
      },
      month: {
        type: Sequelize.TINYINT,
        allowNull: false,
        comment: '월 (1-12)',
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '회비 금액',
      },
      is_paid: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '납부 여부 (0: 미납, 1: 납부)',
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '납부 일시',
      },
      paid_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '납부 처리한 관리자 ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      memo: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '메모',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '생성 일시',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '수정 일시',
      },
    });

    // 인덱스 추가
    await queryInterface.addIndex('team_dues', ['team_id']);
    await queryInterface.addIndex('team_dues', ['user_id']);
    await queryInterface.addIndex('team_dues', ['year', 'month']);
    
    // 중복 방지를 위한 유니크 인덱스
    await queryInterface.addIndex('team_dues', ['team_id', 'user_id', 'year', 'month'], {
      unique: true,
      name: 'unique_team_user_year_month',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('team_dues');
  },
};
