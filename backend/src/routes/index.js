const express = require('express');
const router = express.Router();
const userRoutes = require('./user');
const teamRoutes = require('./team');
const matchBoardRoutes = require('./matchBoard');
const memberRecruitmentRoutes = require('./memberRecruitment');
const courtBoardRoutes = require('./courtBoard');

// 회원, 인증 관련 API
router.use('/user', userRoutes);

// 팀 관련 API
router.use('/team', teamRoutes);

// 경기 모집 게시판 API
router.use('/match-boards', matchBoardRoutes);

// 팀원 모집 게시판 API
router.use('/member-recruitments', memberRecruitmentRoutes);

// 코트 대관/양도 게시판 API
router.use('/court-boards', courtBoardRoutes);

module.exports = router;
