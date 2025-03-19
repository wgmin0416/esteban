import { Link } from "react-router-dom";
import joinStore from "../../store/useUserStore";

const JoinPage = () => {
  const store = joinStore();

  const handleChange = (e) => {
    store.setJoinInfo(e);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    store.join(store.joinInfo);
  };

  const handleDuplicateCheck = () => {
    store.duplicateCheck(store.joinInfo);
  };

  return (
    <>
      <div>
        <Link to="/">Home</Link>
        <h1>JoinPage</h1>
        <div>
          <h1>회원가입</h1>
          <form onSubmit={handleSubmit}>
            <label>
              아이디:
              <input
                type="text"
                name="id"
                value={store.joinInfo.id}
                onChange={handleChange}
                required
              />
              <button onClick={handleDuplicateCheck}>중복확인</button>
            </label>
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
              이메일:
              <input
                type="email"
                name="email"
                value={store.joinInfo.email}
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
