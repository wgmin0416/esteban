const { User } = require('../models/index.js');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient.js');
const { hashValue, compareHash } = require('../utils/bcrypt.js');

// 회원가입
const joinUser = async (req, res) => {
  try {
    console.log('회원가입 API 진입');
    const { email, username, password, phone } = req.body;
    console.log(username, password);

    // 1. 기존 회원 체크
    const dbEmail = await User.findOne({ where: { email } });
    if (dbEmail) {
      return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
    }

    // 2. email 인증
    // 3. 회원가입
    const createdUser = await User.create({ username, password, email, phone });
    console.log('createdUser: ', createdUser);

    res.json({ message: `User ${username} registered successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 중복 가입 체크
const checkDuplicateUserId = async (req, res) => {
  try {
    const { email } = req.query;
    const dbEmail = await User.findOne({ where: { email } });
    if (!dbEmail) {
      return res.status(200).json({ success: true, message: '사용할 수 있는 아이디입니다.' });
    }
    res.status(400).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 이메일 인증
const confirmEmail = async (req, res) => {
  try {
    console.log('이메일 인증');
    const { email } = req.query;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 구글 로그인 콜백 처리
const googleLoginCallback = async (req, res) => {
  // 1. Authorization Code로 Access Token 요청
  // 2. Access token으로 사용자 정보 요청
  // 3. 사용자 DB 조회
  // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
  // 4-2. 등록 된 사용자일 경우 token 발급

  const code = req.query.code; // Authorization Code

  try {
    // 1. Authorization Code로 Access Token 요청
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      },
    });

    // Access token
    const { access_token } = tokenRes.data;

    // 2. Access token으로 사용자 정보 요청
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // 사용자 정보
    const { id, email, name } = userRes.data;

    // 3. 사용자 DB 조회
    const user = await User.findOne({
      where: {
        provider: 'google',
        provider_id: id,
      },
    });

    if (!user) {
      // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
      await User.create({
        username: name,
        email: email,
        provider: 'google',
        provider_id: id,
      });
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage(
                { type: 'SOCIAL_LOGIN', status: 'join', message: '회원가입이 완료되었습니다. 로그인 후 이용해주세요.' },
                '${process.env.FRONT_URL}'
              );
              window.close();
            </script>
          </body>
        </html>
      `);
    } else {
      // 4-2. 등록 된 사용자일 경우 token 발급
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, provider: user.provider },
        process.env.JWT_ACCESS_SECRET_KEY,
        { expiresIn: '2m' }
      );
      const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET_KEY, {
        expiresIn: '7d',
      });
      // refresh token 해싱
      const hashedRefreshToken = await hashValue(refreshToken);

      // 5. redis에 refresh token 저장
      await redisClient.set(user.id.toString(), hashedRefreshToken, {
        EX: 60 * 60 * 24 * 7,
      });

      // 6. Access token 전달 (Cookie)
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 2 * 60 * 1000, // 2분 유효
      });

      // /oauth로 redirect 후 token을 storage에 저장하려고 하였으나 보안 및 redirection 문제로 저장하지 않기로 함
      // 부모창의 home으로 이동하도록 변경
      // res.redirect(`${process.env.FRONT_URL}/oauth`);

      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage(
                { type: 'SOCIAL_LOGIN', status: 'login', message: '로그인에 성공했습니다. 환영합니다!' },
                '${process.env.FRONT_URL}'
              );
              window.close();
            </script>
          </body>
        </html>
      `);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Google OAuth 처리 중 오류 발생' });
  }
};

const naverLoginCallback = async (req, res) => {
  // 1. Authorization Code로 Access Token 요청
  // 2. Access token으로 사용자 정보 요청
  // 3. 사용자 DB 조회
  // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
  // 4-2. 등록 된 사용자일 경우 token 발급

  // 취소 버튼 눌렀을 때 에러 처리 추가하기 !
  // Safari가 ‘localhost’ 서버에 연결할 수 없기 때문에 Safari에서 `localhost:3000/api/v1/user/naver/callback?error=access_denied&error_description=Canceled+By+User&state=fc7c5264-d4a4-4794-99b6-f72904247db1’ 페이지를 열 수 없습니다.

  const { code, state } = req.query;
  try {
    // 1. Authorization Code로 Access Token 요청
    const tokenRes = await axios.get('https://nid.naver.com/oauth2.0/token', {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID,
        client_secret: process.env.NAVER_CLIENT_SECRET,
        code,
        state,
      },
    });

    const accessToken = tokenRes.data.access_token;
    /// 2. Access token으로 사용자 정보 요청
    const userRes = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('userRes: ', userRes);

    const { id, email, name } = userRes.data.response;

    // 3. 사용자 DB 조회
    const user = await User.findOne({
      where: {
        provider: 'naver',
        provider_id: id,
      },
    });

    if (!user) {
      // 4-1. 등록되지 않은 사용자일 경우 사용자 등록
      await User.create({
        username: name,
        email: email,
        provider: 'naver',
        provider_id: id,
      });
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage(
                { type: 'SOCIAL_LOGIN', status: 'join', message: '회원가입이 완료되었습니다. 로그인 후 이용해주세요.' },
                '${process.env.FRONT_URL}'
              );
              window.close();
            </script>
          </body>
        </html>
      `);
    } else {
      // 4-2. 등록 된 사용자일 경우 token 발급
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, provider: user.provider },
        process.env.JWT_ACCESS_SECRET_KEY,
        { expiresIn: '2m' }
      );
      const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET_KEY, {
        expiresIn: '7d',
      });
      // refresh token 해싱
      const hashedRefreshToken = await hashValue(refreshToken);

      // 5. redis에 refresh token 저장
      await redisClient.set(user.id.toString(), hashedRefreshToken, {
        EX: 60 * 60 * 24 * 7,
      });

      // 6. Access token 전달 (Cookie)
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 2 * 60 * 1000, // 2분 유효
      });

      // /oauth로 redirect 후 token을 storage에 저장하려고 하였으나 보안 및 redirection 문제로 저장하지 않기로 함
      // 부모창의 home으로 이동하도록 변경
      // res.redirect(`${process.env.FRONT_URL}/oauth`);
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage(
                { type: 'SOCIAL_LOGIN', status: 'login', message: '로그인에 성공했습니다. 환영합니다!' },
                '${process.env.FRONT_URL}'
              );
              window.close();
            </script>
          </body>
        </html>
      `);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Naver OAuth 처리 중 오류 발생' });
  }
};
module.exports = { joinUser, checkDuplicateUserId, googleLoginCallback, naverLoginCallback };

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
