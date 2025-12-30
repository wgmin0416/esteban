'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('basketball_team_members', 'position', {
      type: Sequelize.ENUM('guard', 'forward', 'center'),
      allowNull: true,
      comment: '포지션',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('basketball_team_members', 'position', {
      type: Sequelize.ENUM('guard', 'forward', 'center'),
      allowNull: false,
      comment: '포지션',
    });
  },
};
