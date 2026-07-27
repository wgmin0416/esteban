'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('court_boards', {
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
        type: Sequelize.ENUM('대관', '양도'),
        allowNull: false,
        comment: '유형 (대관: 코트 대관, 양도: 코트 양도)',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '제목',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: '내용',
      },
      court_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '코트 사용 날짜 및 시간',
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '장소',
      },
      region: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '지역 (서울, 경기, 부산 등)',
      },
      cost: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: '비용 (원)',
      },
      contact: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '연락처',
      },
      view_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '조회수',
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

    // 인덱스 추가
    await queryInterface.addIndex('court_boards', ['user_id'], { name: 'idx_court_boards_user_id' });
    await queryInterface.addIndex('court_boards', ['type'], { name: 'idx_court_boards_type' });
    await queryInterface.addIndex('court_boards', ['region'], { name: 'idx_court_boards_region' });
    await queryInterface.addIndex('court_boards', ['court_date'], { name: 'idx_court_boards_court_date' });
    await queryInterface.addIndex('court_boards', ['deleted_at'], { name: 'idx_court_boards_deleted_at' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('court_boards');
  },
};
