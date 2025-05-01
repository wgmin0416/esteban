import { Link } from 'react-router-dom';
import userStore from '../store/userStore';
import { useEffect } from 'react';

const HomePage = () => {
  return (
    <>
      <div>
        <p>
          <Link to="/login">Login</Link>
        </p>
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
