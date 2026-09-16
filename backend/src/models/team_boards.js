'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TeamBoard extends Model {
    static associate(models) {
      // Team
      TeamBoard.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });

      // User (작성자)
      TeamBoard.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });

      // 연결된 경기
      TeamBoard.belongsTo(models.BasketballMatch, { foreignKey: 'match_id', as: 'match' });

      // 댓글
      TeamBoard.hasMany(models.TeamBoardComment, { foreignKey: 'board_id', as: 'comments' });
    }
  }

  // JSON 문자열 컬럼용 getter/setter 생성기
  const jsonColumn = (columnName, comment, fallback) => ({
    type: DataTypes.TEXT('medium'),
    allowNull: true,
    comment,
    get() {
      const value = this.getDataValue(columnName);
      if (value === null || value === undefined) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(value) {
      this.setDataValue(columnName, value == null ? null : JSON.stringify(value));
    },
  });

  TeamBoard.init(
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
      category: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '자유',
        comment: '말머리 (공지/자유/후기/질문/건의)',
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
      attachments: jsonColumn('attachments', '첨부(이미지/파일) JSON 배열', []),
      links: jsonColumn('links', '링크 임베드 JSON 배열', []),
      poll: jsonColumn('poll', '게시글 투표 JSON', null),
      reactions: jsonColumn('reactions', '반응(좋아요/이모지) JSON', {}),
      player_notes: jsonColumn('player_notes', '후기 선수별 코멘트 JSON 배열', []),
      match_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '연결된 경기 ID',
      },
      send_push: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '작성 시 푸시 발송 여부(공지)',
      },
      is_edited: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '수정됨 여부',
      },
      pinned_home: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '홈 화면 노출 공지 여부 (팀당 1개)',
      },
      view_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '조회수',
      },
      is_notice: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: '공지사항 여부',
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
      modelName: 'TeamBoard',
      tableName: 'team_boards',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return TeamBoard;
};
