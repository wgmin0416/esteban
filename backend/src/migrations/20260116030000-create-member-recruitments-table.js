'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('member_recruitments', {
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
        comment: '작성자 ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      time: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '시간',
      },
      location: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: '장소',
      },
      fee: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '회비 (원)',
      },
      position: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '포지션',
      },
      is_competition: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '대회 참가 여부',
      },
      team_intro: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: '팀 소개',
      },
      join_process: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: '가입 절차 및 참고 사항',
      },
      view_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '조회수',
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
    await queryInterface.addIndex('member_recruitments', ['team_id'], {
      name: 'idx_member_recruitments_team_id',
    });
    await queryInterface.addIndex('member_recruitments', ['user_id'], {
      name: 'idx_member_recruitments_user_id',
    });
    await queryInterface.addIndex('member_recruitments', ['created_at'], {
      name: 'idx_member_recruitments_created_at',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('member_recruitments');
  },
};
