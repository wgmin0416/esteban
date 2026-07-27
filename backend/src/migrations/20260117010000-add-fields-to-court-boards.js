'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('court_boards', 'court_size', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: '코트 사이즈',
    });

    await queryInterface.addColumn('court_boards', 'court_image', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: '코트 사진 URL',
    });

    await queryInterface.addColumn('court_boards', 'has_parking', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      comment: '주차 가능 여부',
    });

    await queryInterface.addColumn('court_boards', 'has_shower', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      comment: '샤워 시설 여부',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('court_boards', 'court_size');
    await queryInterface.removeColumn('court_boards', 'court_image');
    await queryInterface.removeColumn('court_boards', 'has_parking');
    await queryInterface.removeColumn('court_boards', 'has_shower');
  },
};
