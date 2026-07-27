'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('match_applications', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      match_board_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '경기 모집 게시글 ID',
        references: {
          model: 'match_boards',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '신청자 ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: '신청 상태',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '신청 메시지',
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
    await queryInterface.addIndex('match_applications', ['match_board_id'], {
      name: 'idx_match_applications_match_board_id',
    });
    await queryInterface.addIndex('match_applications', ['user_id'], {
      name: 'idx_match_applications_user_id',
    });
    await queryInterface.addIndex('match_applications', ['status'], {
      name: 'idx_match_applications_status',
    });

    // 유니크 제약 조건: 한 사용자가 같은 게시글에 중복 신청 불가
    await queryInterface.addIndex('match_applications', ['match_board_id', 'user_id'], {
      unique: true,
      name: 'idx_match_applications_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('match_applications');
  },
};
