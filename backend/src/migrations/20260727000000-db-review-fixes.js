'use strict';

/**
 * DB 점검 조치 (2026-07-27)
 * - period_records: year/month 컬럼 + (team,user,year,month) 유니크
 * - 중복 방지 유니크: join_requests / match_attendances / match_records
 * - soft-delete 일관성: match_boards / member_recruitments 에 deleted_at
 * - 목록 필터 인덱스: match_boards(status, match_start_time), court_boards(region, court_date),
 *   member_recruitments(created_at)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ⑥ users: profile_image (matchBoardController가 참조하나 컬럼 없어 500나던 버그 수정)
    await queryInterface.addColumn('users', 'profile_image', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: '프로필 이미지 URL',
    });

    // ② period_records: year/month
    await queryInterface.addColumn('basketball_member_period_records', 'year', {
      type: Sequelize.SMALLINT.UNSIGNED,
      allowNull: false,
      comment: '기록 연도',
    });
    await queryInterface.addColumn('basketball_member_period_records', 'month', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      comment: '기록 월 (1-12)',
    });
    await queryInterface.addIndex('basketball_member_period_records', {
      unique: true,
      fields: ['team_id', 'user_id', 'year', 'month'],
      name: 'uq_period_team_user_year_month',
    });

    // ③ 중복 방지 유니크
    await queryInterface.addIndex('join_requests', {
      unique: true,
      fields: ['team_id', 'user_id'],
      name: 'uq_join_team_user',
    });
    await queryInterface.addIndex('basketball_match_attendances', {
      unique: true,
      fields: ['match_id', 'user_id'],
      name: 'uq_attendance_match_user',
    });
    await queryInterface.addIndex('basketball_member_match_records', {
      unique: true,
      fields: ['match_id', 'user_id'],
      name: 'uq_match_record_match_user',
    });

    // ④ soft-delete 컬럼
    await queryInterface.addColumn('match_boards', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: '삭제 일시',
    });
    await queryInterface.addColumn('member_recruitments', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: '삭제 일시',
    });

    // ④ 필터 인덱스
    await queryInterface.addIndex('match_boards', {
      fields: ['status'],
      name: 'idx_match_boards_status',
    });
    await queryInterface.addIndex('match_boards', {
      fields: ['match_start_time'],
      name: 'idx_match_boards_start_time',
    });
    await queryInterface.addIndex('court_boards', {
      fields: ['region'],
      name: 'idx_court_boards_region',
    });
    await queryInterface.addIndex('court_boards', {
      fields: ['court_date'],
      name: 'idx_court_boards_court_date',
    });
    await queryInterface.addIndex('member_recruitments', {
      fields: ['created_at'],
      name: 'idx_member_recruitments_created',
    });

    // ⑦ 예약어 컬럼명 to → turnover (가독성/안전성)
    await queryInterface.renameColumn('basketball_member_match_records', 'to', 'turnover');
    await queryInterface.renameColumn('basketball_member_period_records', 'to', 'turnover');

    // ⑧ 조회수 컬럼명 일관화: team_boards.views → view_count (나머지 도메인과 통일)
    await queryInterface.renameColumn('team_boards', 'views', 'view_count');
  },

  async down(queryInterface) {
    await queryInterface.renameColumn('team_boards', 'view_count', 'views');
    await queryInterface.renameColumn('basketball_member_period_records', 'turnover', 'to');
    await queryInterface.renameColumn('basketball_member_match_records', 'turnover', 'to');
    await queryInterface.removeIndex('member_recruitments', 'idx_member_recruitments_created');
    await queryInterface.removeIndex('court_boards', 'idx_court_boards_court_date');
    await queryInterface.removeIndex('court_boards', 'idx_court_boards_region');
    await queryInterface.removeIndex('match_boards', 'idx_match_boards_start_time');
    await queryInterface.removeIndex('match_boards', 'idx_match_boards_status');
    await queryInterface.removeColumn('member_recruitments', 'deleted_at');
    await queryInterface.removeColumn('match_boards', 'deleted_at');
    await queryInterface.removeIndex('basketball_member_match_records', 'uq_match_record_match_user');
    await queryInterface.removeIndex('basketball_match_attendances', 'uq_attendance_match_user');
    await queryInterface.removeIndex('join_requests', 'uq_join_team_user');
    await queryInterface.removeIndex('basketball_member_period_records', 'uq_period_team_user_year_month');
    await queryInterface.removeColumn('basketball_member_period_records', 'month');
    await queryInterface.removeColumn('basketball_member_period_records', 'year');
    await queryInterface.removeColumn('users', 'profile_image');
  },
};
