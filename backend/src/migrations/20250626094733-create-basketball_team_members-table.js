'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('basketball_team_members', {
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
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '유저 ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      intro: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '소개',
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '이미지 url',
      },
      role: {
        type: Sequelize.ENUM('member', 'manager', 'leader'),
        allowNull: false,
        defaultValue: 'member',
        comment: '역할',
      },
      position: {
        type: Sequelize.ENUM('guard', 'forward', 'center'),
        allowNull: false,
        comment: '포지션',
      },
      uniform_number: {
        type: Sequelize.STRING(3),
        allowNull: true,
        comment: '유니폼 번호',
      },
      activity_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '활동 점수',
      },
      last_attended_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '최근 참석 일시',
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: '활동 중 여부',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '생성 일시',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        comment: '수정 일시',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '삭제 일시',
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('basketball_team_members');
  },
};
