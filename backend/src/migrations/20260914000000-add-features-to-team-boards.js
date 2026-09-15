'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 말머리 (공지/자유/후기/질문/건의)
    await queryInterface.addColumn('team_boards', 'category', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: '자유',
      comment: '말머리 (공지/자유/후기/질문/건의)',
    });

    // 이미지/파일 첨부 (JSON 배열: [{type,url,name,size}])
    await queryInterface.addColumn('team_boards', 'attachments', {
      type: Sequelize.TEXT('medium'),
      allowNull: true,
      comment: '첨부(이미지/파일) JSON 배열',
    });

    // 링크 임베드 (JSON 배열: [url])
    await queryInterface.addColumn('team_boards', 'links', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '링크 임베드 JSON 배열',
    });

    // 게시글 투표 (JSON: {question, allowMulti, options:[{id,text}], votes:{userId:[optionId]}})
    await queryInterface.addColumn('team_boards', 'poll', {
      type: Sequelize.TEXT('medium'),
      allowNull: true,
      comment: '게시글 투표 JSON',
    });

    // 좋아요/이모지 반응 (JSON: {emoji: [userId,...]})
    await queryInterface.addColumn('team_boards', 'reactions', {
      type: Sequelize.TEXT('medium'),
      allowNull: true,
      comment: '반응(좋아요/이모지) JSON',
    });

    // 경기 연결
    await queryInterface.addColumn('team_boards', 'match_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '연결된 경기 ID',
    });

    // 공지 푸시 발송 여부
    await queryInterface.addColumn('team_boards', 'send_push', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      comment: '작성 시 푸시 발송 여부(공지)',
    });

    // 수정됨 표시
    await queryInterface.addColumn('team_boards', 'is_edited', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      comment: '수정됨 여부',
    });

    // 기존 공지글의 말머리를 '공지'로 정렬
    await queryInterface.sequelize.query(
      `UPDATE team_boards SET category = '공지' WHERE is_notice = 1`
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('team_boards', 'category');
    await queryInterface.removeColumn('team_boards', 'attachments');
    await queryInterface.removeColumn('team_boards', 'links');
    await queryInterface.removeColumn('team_boards', 'poll');
    await queryInterface.removeColumn('team_boards', 'reactions');
    await queryInterface.removeColumn('team_boards', 'match_id');
    await queryInterface.removeColumn('team_boards', 'send_push');
    await queryInterface.removeColumn('team_boards', 'is_edited');
  },
};
