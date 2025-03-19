const express = require("express");
const router = express.Router();
const User = require("../../../models/user");

// 회원가입
router.post("/join", async (req, res) => {
  console.log("회원가입 API 진입");
  const { username, password } = req.body;
  console.log(username, password);

  // 비즈니스 로직 (예: 유저 생성)
  res.json({ message: `User ${username} registered successfully` });
});

// 중복 ID 체크
router.get("/id-duplicate-check", async (req, res) => {
  console.log("중복 체크 API 진입");
  const { id } = req.query;
  console.log(id);

  const dbId = await User.findOne({ where: { id } });
  if (dbId) {
    return res.json({ message: `ID ${id} is already in use` });
  }

  // 비즈니스 로직 (예: 중복 체크)
  res.json({ message: `Username ${username} is already in use` });
});

module.exports = router;

// RESTful 스타일

// GET /users/check-username?username=someUser
// GET /users/check-email?email=test@example.com
// GET /users/check-phone?phone=01012345678
// GET /users/exists?username=someUser (일반적인 중복 체크)
// 명확한 의미 전달

// GET /auth/duplicate-check?type=email&value=test@example.com
// POST /users/check-duplicate (body에 {"type": "email", "value": "test@example.com"})
// Boolean 응답을 고려한 이름

// GET /users/is-available?username=someUser → { "available": false }
// GET /users/exists?email=test@example.com → { "exists": true }
// 🛠 네이밍 팁
// check, exists, is-available 같은 단어를 활용
// 한 가지 값만 확인할 거면 GET, 여러 값 동시 확인은 POST
// users보다는 auth 아래 둘 수도 있음 (/auth/check-email)
