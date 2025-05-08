import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { useEffect } from 'react';

const HomePage = () => {
  const isLogin = useAuthStore((state) => state.isLogin);
  const setIsLogin = useAuthStore((state) => state.setIsLogin);
  const logout = useAuthStore((state) => state.logout);
  // const userLogout = async () => {
  //   const res = await logout();
  //   if (res.success) {
  //     setIsLogin(false);
  //   }
  // };

  // useEffect(() => {});

  return (
    <>
      <div>
        {!isLogin ? (
          <p>
            <Link to="/login">Login</Link>
          </p>
        ) : (
          <p>
            <button onClick={() => logout()}>Logout</button>
          </p>
        )}
        <p>
          <Link to="/profile">Profile</Link>
        </p>
        <h1>HomePage</h1>
        <p>This is the Home page.</p>
      </div>
    </>
  );
};

export default HomePage;
