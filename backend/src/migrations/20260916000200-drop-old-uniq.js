'use strict';

// 이전 유니크 인덱스(게임 미포함)가 남아 있어 다중 게임 저장을 막음 → 강제 제거
module.exports = {
  async up(queryInterface) {
    const drop = async (sql) => {
      try {
        await queryInterface.sequelize.query(sql);
      } catch (e) {
        // 이미 없으면 무시
        console.log('skip:', e.message);
      }
    };
    await drop('ALTER TABLE basketball_member_quarter_records DROP INDEX uq_quarter_record_match_user_quarter');
    await drop('ALTER TABLE basketball_member_match_records DROP INDEX uq_match_record_match_user');
  },

  async down(queryInterface) {
    await queryInterface.addIndex('basketball_member_quarter_records', ['match_id', 'user_id', 'quarter'], {
      unique: true,
      name: 'uq_quarter_record_match_user_quarter',
    });
    await queryInterface.addIndex('basketball_member_match_records', ['match_id', 'user_id'], {
      unique: true,
      name: 'uq_match_record_match_user',
    });
  },
};
