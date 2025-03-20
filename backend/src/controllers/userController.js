const { User } = require("../models/index.js");

// 회원가입
const joinUser = async (req, res) => {
  try {
    console.log("회원가입 API 진입");
    const { email, username, password, phone } = req.body;
    console.log(username, password);

    // 1. 기존 회원 체크
    const dbEmail = await User.findOne({ where: { email } });
    if (dbEmail) {
      return res.status(400).json({ message: "이미 사용 중인 아이디입니다." });
    }

    // 2. email 인증
    // 3. 회원가입
    const createdUser = await User.create({ username, password, email, phone });
    console.log("createdUser: ", createdUser);

    res.json({ message: `User ${username} registered successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 중복 가입 체크
const checkDuplicateUserId = async (req, res) => {
  try {
    console.log("중복 가입 체크");
    const { email } = req.query;

    const dbEmail = await User.findOne({ where: { email } });
    console.log(dbEmail);
    if (!dbEmail) {
      return res.json({ message: "사용할 수 있는 아이디입니다." });
    }
    res.json({ message: "이미 사용 중인 아이디입니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 이메일 인증
const confirmEmail = async (req, res) => {
  try {
    console.log("이메일 인증");
    const { email } = req.query;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;

  // 예제 비즈니스 로직 (실제 로직은 DB 조회 추가)
  if (username === "admin" && password === "1234") {
    return res.json({ message: "Login successful", token: "fake-jwt-token" });
  }
  return res.status(401).json({ message: "Invalid credentials" });
};

module.exports = { joinUser, checkDuplicateUserId, loginUser };

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
