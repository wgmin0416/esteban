'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // court_image를 MEDIUMTEXT로 변경하여 여러 base64 이미지 저장 가능하도록
    await queryInterface.changeColumn('court_boards', 'court_image', {
      type: Sequelize.TEXT('medium'),
      allowNull: true,
      comment: '코트 사진 URL 배열 (JSON)',
    });
  },

  async down(queryInterface, Sequelize) {
    // 원래대로 STRING으로 변경
    await queryInterface.changeColumn('court_boards', 'court_image', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: '코트 사진 URL',
    });
  },
};
