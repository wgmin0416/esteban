'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('teams', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      name: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment: '팀명',
      },
      leader_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '리더 ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      sports: {
        type: Sequelize.ENUM('basketball'),
        allowNull: false,
        defaultValue: 'basketball',
        comment: '종목',
      },
      intro: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '팀 소개',
      },
      logo_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '로고 이미지 url',
      },
      region: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
        comment: '활동 지역',
      },
      established_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '창단 일시',
      },
      is_public: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: '공개 여부',
      },
      team_url: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '팀 로고 이미지 url',
      },
      boost_promoted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '부스터 구독 권유 일시',
      },
      booster_expired_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '부스터 구독 만료일',
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
        comment: '해체 일시',
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('teams');
  },
};
