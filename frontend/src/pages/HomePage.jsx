import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { useEffect } from 'react';

const HomePage = () => {
  const isLogin = useAuthStore((state) => state.isLogin);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    console.log('HomePage isLogin ? ', isLogin);
  }, [isLogin]);

  return (
    <>
      <div>
        {!isLogin ? (
          <p>로그인 후 이용 바랍니다.</p>
        ) : (
          <p>
            {/* <button onClick={() => logout()}>로그아웃</button> */}
            {/* <br /> */}
            <Link to="/profile">프로필</Link>
            <br />
            <Link to="/create-team">팀 만들기</Link>
          </p>
        )}
      </div>
    </>
  );
};

export default HomePage;
