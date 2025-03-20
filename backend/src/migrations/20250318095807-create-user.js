"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: "sequence",
      },
      username: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: "이름",
      },
      password: {
        type: Sequelize.STRING(256),
        allowNull: false,
        comment: "비밀번호",
      },
      email: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: "이메일",
      },
      phone: {
        type: Sequelize.STRING(16),
        allowNull: false,
        comment: "휴대폰 번호",
      },
      role: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "user",
        comment: "역할",
      },
      marketing_consent_yn: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "마케팅 수신 동의 여부",
      },
      team_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: "가입한 팀",
      },
      last_login_dt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "마지막 로그인 일시",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        comment: "생성 일시",
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
        comment: "수정 일시",
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "삭제 일시",
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
