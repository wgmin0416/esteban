'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('basketball_member_match_record', {
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
        references: { model: 'teams', key: 'id' },
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '유저 ID',
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
      },
      match_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '매치 ID',
        references: { model: 'basketball_match', key: 'id' },
        onUpdate: 'CASCADE',
      },
      minutes: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        comment: '플레이 타임',
      },
      is_win: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        comment: '승패 여부',
      },
      pts: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '총 득점',
      },
      fgm: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '필드골 성공 개수',
      },
      fga: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '필드골 시도 개수',
      },
      fg_pct: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '필드골 성공률',
      },
      twopm: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '2점슛 성공 개수',
      },
      twopa: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '2점슛 시도 개수',
      },
      twop_pct: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '2점슛 성공률',
      },
      threepm: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '3점슛 성공 개수',
      },
      threepa: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '3점슛 시도 개수',
      },
      threep_pct: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '3점슛 성공률',
      },
      ftm: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '자유투 성공 개수',
      },
      fta: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '자유투 시도 개수',
      },
      ft_pct: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '자유투 성공률',
      },
      oreb: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '공격 리바운드 개수',
      },
      dreb: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '수비 리바운드 개수',
      },
      reb: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '총 리바운드 개수',
      },
      ast: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '어시스트 개수',
      },
      stl: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '스틸 개수',
      },
      blk: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '블록 개수',
      },
      to_cnt: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '턴오버 개수',
      },
      pf: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '개인 파울 개수',
      },
      dd2: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '더블더블 여부',
      },
      td3: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '트리플더블 여부',
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
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('basketball_member_match_record');
  },
};
