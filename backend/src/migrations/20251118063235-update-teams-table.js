'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('teams', 'team_url');
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('teams', 'team_url', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '팀 로고 이미지 url',
    });
  },
};
