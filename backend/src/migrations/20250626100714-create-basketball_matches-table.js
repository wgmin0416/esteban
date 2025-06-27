'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('basketball_matches', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'sequence',
      },
      team_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '팀 ID',
        references: { model: 'teams', key: 'id' },
        onUpdate: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(128),
        allowNull: false,
        comment: '경기 제목',
      },
      match_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '경기 일시',
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '경기 장소',
      },
      type: {
        type: Sequelize.ENUM('intra_squad', 'invitation', 'pickup', 'training', 'tournament'),
        allowNull: false,
        defaultValue: 'intra_squad',
        comment: '경기 형식',
      },
      total_players: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '총 참석 인원',
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
    await queryInterface.dropTable('basketball_matches');
  },
};
