'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MatchBoard extends Model {
    static associate(models) {
      // 작성자
      MatchBoard.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
    }
  }

  MatchBoard.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        comment: 'sequence',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '작성자 ID',
      },
      type: {
        type: DataTypes.ENUM('team', 'guest', 'pickup'),
        allowNull: false,
        comment: '모집 유형 (team: 팀 초청, guest: 게스트 초청, pickup: 픽업)',
      },
      team_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '팀명 (픽업 제외)',
      },
      match_start_time: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '경기 시작 시간',
      },
      match_end_time: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '경기 종료 시간',
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '장소 주소',
      },
      cost: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '비용 (원)',
      },
      skill_level: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '실력 수준 (픽업 제외)',
      },
      game_format: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '경기 방식',
      },
      uniform: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '유니폼 색상',
      },
      has_parking: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '주차 가능 여부',
      },
      has_air_conditioning: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '냉/난방 여부',
      },
      has_shower: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '샤워 시설 여부',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '상세 설명',
      },
      view_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '조회수',
      },
      max_participants: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '최대 모집 인원',
      },
      current_participants: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '현재 참가 인원',
      },
      status: {
        type: DataTypes.ENUM('open', 'closed', 'cancelled'),
        allowNull: false,
        defaultValue: 'open',
        comment: '모집 상태',
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
      modelName: 'MatchBoard',
      tableName: 'match_boards',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      indexes: [
        { fields: ['status'], name: 'idx_match_boards_status' },
        { fields: ['match_start_time'], name: 'idx_match_boards_start_time' },
      ],
    }
  );

  return MatchBoard;
};
