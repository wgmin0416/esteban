'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('match_boards', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
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
      type: {
        type: Sequelize.ENUM('team', 'guest', 'pickup'),
        allowNull: false,
        comment: '모집 유형 (team: 팀 초청, guest: 게스트 초청, pickup: 픽업)',
      },
      team_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '팀명 (픽업 제외)',
      },
      match_start_time: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '경기 시작 시간',
      },
      match_end_time: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '경기 종료 시간',
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '장소 주소',
      },
      cost: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '비용 (원)',
      },
      skill_level: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '실력 수준 (픽업 제외)',
      },
      game_format: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '경기 방식 (예: 10분 4쿼터 3게임)',
      },
      uniform: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '유니폼 색상 (예: 빨강/검정)',
      },
      has_parking: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '주차 가능 여부',
      },
      has_air_conditioning: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '냉/난방 여부',
      },
      has_shower: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '샤워 시설 여부',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '상세 설명',
      },
      view_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '조회수',
      },
      status: {
        type: Sequelize.ENUM('open', 'closed', 'cancelled'),
        allowNull: false,
        defaultValue: 'open',
        comment: '모집 상태',
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
    await queryInterface.addIndex('match_boards', ['user_id'], {
      name: 'idx_match_boards_user_id',
    });
    await queryInterface.addIndex('match_boards', ['type'], {
      name: 'idx_match_boards_type',
    });
    await queryInterface.addIndex('match_boards', ['match_start_time'], {
      name: 'idx_match_boards_match_start_time',
    });
    await queryInterface.addIndex('match_boards', ['status'], {
      name: 'idx_match_boards_status',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('match_boards');
  },
};
