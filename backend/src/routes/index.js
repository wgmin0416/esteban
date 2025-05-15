const express = require('express');
const router = express.Router();
const userRoutes = require('./user');
const teamRoutes = require('./team');

// 회원, 인증 관련 API
router.use('/user', userRoutes);

// 팀 관련 API
router.use('/team', teamRoutes);

module.exports = router;
