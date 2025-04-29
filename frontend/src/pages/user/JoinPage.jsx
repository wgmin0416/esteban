import { Link } from "react-router-dom";
import userStore from "../../store/userStore";

const JoinPage = () => {
  const store = userStore();


  const handleChange = (e) => {
    store.setJoinInfo(e);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    store.join(store.joinInfo);
    // 가입 버튼 활성화 조건 만들기
    // 1. 모든 항목이 형식에 맞게 입력되어 있어야 함
    // 2. 이메일 중복 확인 시 가입 가능한 이메일이어야 함
  };

  const handleDuplicateCheck =  async () => {
    const duplicateCheckResult = await store.duplicateCheck(store.joinInfo);
    console.log("dup res: ", duplicateCheckResult)
    alert(duplicateCheckResult.message);
  };

  return (
    <>
      <div>
        <Link to="/">Home</Link>
        <h1>JoinPage</h1>
        <div>
          <h1>회원가입</h1>
          <form onSubmit={handleSubmit}>
            <br />
            <label>
              이메일:
              <input
                type="email"
                name="email"
                value={store.joinInfo.email}
                onChange={handleChange}
                required
              />
            </label>
            <button onClick={handleDuplicateCheck}>중복확인</button>
            <br />
            <label>
              비밀번호:
              <input
                type="password"
                name="password"
                value={store.joinInfo.password}
                onChange={handleChange}
                required
              />
            </label>
            <br />
            <label>
              이름:
              <input
                type="text"
                name="username"
                value={store.joinInfo.username}
                onChange={handleChange}
                required
              />
            </label>
            <br />
            <label>
              전화번호:
              <input
                type="tel"
                name="phone"
                value={store.joinInfo.phone}
                onChange={handleChange}
                required
              />
            </label>
            <br />
            <button type="submit">가입하기</button>
          </form>
        </div>
      </div>
    </>
  );
};

export default JoinPage;
