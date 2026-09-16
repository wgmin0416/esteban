'use strict';

// 하루 내 여러 게임 지원: 유니크 제약에 game_no 포함
module.exports = {
  async up(queryInterface, Sequelize) {
    // 쿼터 기록: (match, user, quarter) → (match, user, quarter, game_no)
    await queryInterface.removeIndex(
      'basketball_member_quarter_records',
      'uq_quarter_record_match_user_quarter'
    );
    await queryInterface.addIndex(
      'basketball_member_quarter_records',
      ['match_id', 'user_id', 'quarter', 'game_no'],
      { unique: true, name: 'uq_quarter_record_match_user_quarter_game' }
    );

    // 매치(합산) 기록: (match, user) → (match, user, game_no)
    await queryInterface.removeIndex('basketball_member_match_records', 'uq_match_record_match_user');
    await queryInterface.addIndex(
      'basketball_member_match_records',
      ['match_id', 'user_id', 'game_no'],
      { unique: true, name: 'uq_match_record_match_user_game' }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'basketball_member_quarter_records',
      'uq_quarter_record_match_user_quarter_game'
    );
    await queryInterface.addIndex(
      'basketball_member_quarter_records',
      ['match_id', 'user_id', 'quarter'],
      { unique: true, name: 'uq_quarter_record_match_user_quarter' }
    );
    await queryInterface.removeIndex('basketball_member_match_records', 'uq_match_record_match_user_game');
    await queryInterface.addIndex('basketball_member_match_records', ['match_id', 'user_id'], {
      unique: true,
      name: 'uq_match_record_match_user',
    });
  },
};
