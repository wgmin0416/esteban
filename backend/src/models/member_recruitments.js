'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MemberRecruitment extends Model {
    static associate(models) {
      // 팀
      MemberRecruitment.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });
      
      // 작성자
      MemberRecruitment.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
    }
  }

  MemberRecruitment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '팀 ID',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '작성자 ID',
      },
      time: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '시간',
      },
      location: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: '장소',
      },
      fee: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '회비 (원)',
      },
      position: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '포지션',
      },
      is_competition: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '대회 참가 여부',
      },
      team_intro: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '팀 소개',
      },
      join_process: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '가입 절차 및 참고 사항',
      },
      view_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '조회수',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '생성 일시',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '수정 일시',
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '삭제 일시',
      },
    },
    {
      sequelize,
      modelName: 'MemberRecruitment',
      tableName: 'member_recruitments',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      indexes: [{ fields: ['created_at'], name: 'idx_member_recruitments_created' }],
    }
  );

  return MemberRecruitment;
};
