'use strict';

// 하루(경기) 안에 여러 게임: 각 게임이 자체 대진·쿼터·승패를 가짐
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('basketball_member_quarter_records', 'game_no', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '게임 번호(하루 내 여러 게임)',
    });
    await queryInterface.addColumn('basketball_member_match_records', 'game_no', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '게임 번호(하루 내 여러 게임)',
    });
    // 게임별 대진 { [gameNo]: [squadIdA, squadIdB] }
    await queryInterface.addColumn('basketball_matches', 'game_matchups', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: '게임별 대진 JSON { [gameNo]: [squadA, squadB] }',
    });
    await queryInterface.addIndex('basketball_member_quarter_records', ['match_id', 'game_no']);
    await queryInterface.addIndex('basketball_member_match_records', ['match_id', 'game_no']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('basketball_member_quarter_records', 'game_no');
    await queryInterface.removeColumn('basketball_member_match_records', 'game_no');
    await queryInterface.removeColumn('basketball_matches', 'game_matchups');
  },
};
