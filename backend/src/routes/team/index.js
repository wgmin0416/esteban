const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/teamController.js');
const authMiddleware = require('../../middleware/authMiddleware.js');

// == 회원 관련 ==
// 전체 회원 조회
router.get('/members', authMiddleware, teamController.getMembers);
// 회원 조회
router.get('/member', authMiddleware, teamController.getMember);

module.exports = router;
