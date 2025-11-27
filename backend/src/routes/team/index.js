const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/teamController.js');
const authMiddleware = require('../../middleware/authMiddleware.js');

// == 팀 관련 ==
// 팀 생성
/**
 * @swagger
 * /api/v1/team/create-team:
 *   post:
 *     summary: 팀 생성
 *     tags:
 *       - Team
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - leader_id
 *               - sports
 *               - region
 *             properties:
 *               name:
 *                 type: string
 *                 description: 팀명
 *                 example: Dream Team
 *               leader_id:
 *                 type: integer
 *                 description: 팀 리더 회원 ID
 *                 example: 1,
 *               sports:
 *                 type: string
 *                 description: 종목
 *                 example: basketball
 *               intro:
 *                 type: string
 *                 description: 팀 소개
 *                 example: 안녕하세요. Dream Team입니다.
 *               logo_url:
 *                 type: string
 *                 description: 로고 이미지 url
 *                 example:
 *               region:
 *                 type: string
 *                 description: 주 활동 지역
 *                 example: 서울
 *               established_at:
 *                 type: string
 *                 format: date-time
 *                 description: 창단 일시
 *                 example: "2025-11-27T17:00:00Z"
 *               is_public:
 *                 type: integer
 *                 description: 공개 여부
 *                 example: 1
 *     responses:
 *       201:
 *         description: 팀 생성 성공 여부
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *
 */
router.post('/create-team', authMiddleware, teamController.createTeam);
// 전체 회원 조회
router.get('/members', authMiddleware, teamController.getMembers);
// 회원 조회
router.get('/member', authMiddleware, teamController.getMember);

module.exports = router;
