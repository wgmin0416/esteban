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
        type: Sequelize.STRING(16),
        allowNull: true,
        comment: "이름",
      },
      email: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: "이메일",
      },
      phone: {
        type: Sequelize.STRING(16),
        allowNull: true,
        comment: "휴대폰 번호",
      },
      provider: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment: "소셜 로그인 제공자",
      },
      provider_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
        comment: "소셜 제공자의 유저 고유 ID",
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
        type: Sequelize.STRING(128),
        allowNull: true,
        comment: "가입한 팀",
      },
      last_login_at: {
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

    // provider + provider_id 조합 UNIQUE 제약 추가
    await queryInterface.addConstraint("users", {
      fields: ["provider", "provider_id"],
      type: "unique",
      name: "unique_provider_providerId",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};