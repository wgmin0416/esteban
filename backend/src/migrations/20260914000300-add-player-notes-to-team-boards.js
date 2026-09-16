'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 후기 게시글: 참석 선수별 코멘트 (JSON 배열: [{user_id,name,squad_label,comment}])
    await queryInterface.addColumn('team_boards', 'player_notes', {
      type: Sequelize.TEXT('medium'),
      allowNull: true,
      comment: '후기 선수별 코멘트 JSON 배열',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('team_boards', 'player_notes');
  },
};
