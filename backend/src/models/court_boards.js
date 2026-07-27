'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CourtBoard extends Model {
    static associate(models) {
      // 작성자
      CourtBoard.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
    }
  }

  CourtBoard.init(
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
        type: DataTypes.ENUM('대관', '양도'),
        allowNull: false,
        comment: '유형 (대관: 코트 대관, 양도: 코트 양도)',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '제목',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '내용',
      },
      court_date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '코트 사용 날짜 및 시간',
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '장소',
      },
      region: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '지역 (서울, 경기, 부산 등)',
      },
      cost: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: '비용 (원)',
      },
      contact: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '연락처',
      },
      court_size: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '코트 사이즈',
      },
      court_image: {
        type: DataTypes.TEXT('medium'),
        allowNull: true,
        comment: '코트 사진 URL 배열 (JSON)',
        get() {
          const value = this.getDataValue('court_image');
          if (!value) return null;
          try {
            return JSON.parse(value);
          } catch {
            // 기존 단일 URL 형식 호환성 유지
            return [value];
          }
        },
        set(value) {
          if (Array.isArray(value)) {
            this.setDataValue('court_image', JSON.stringify(value));
          } else if (value) {
            this.setDataValue('court_image', JSON.stringify([value]));
          } else {
            this.setDataValue('court_image', null);
          }
        },
      },
      has_parking: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '주차 가능 여부',
      },
      has_shower: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '샤워 시설 여부',
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
      modelName: 'CourtBoard',
      tableName: 'court_boards',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true,
      indexes: [
        { fields: ['region'], name: 'idx_court_boards_region' },
        { fields: ['court_date'], name: 'idx_court_boards_court_date' },
      ],
    }
  );

  return CourtBoard;
};
