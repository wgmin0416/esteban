import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';

const ProfilePage = () => {
  const myInfo = useAuthStore((state) => state.myInfo);
  const getMyInfo = useAuthStore((state) => state.getMyInfo);
  useEffect(() => {
    getMyInfo();
  }, []);
  return (
    <>
      <div>
        <Link to="/">Home</Link>
        <h1>ProfilePage</h1>
        <p>This is the Profile page.</p>
        <p>id: {myInfo.id}</p>
        <p>name: {myInfo.name}</p>
        <p>email: {myInfo.email}</p>
        <p>phone: {myInfo.phone}</p>
      </div>
    </>
  );
};

export default ProfilePage;
