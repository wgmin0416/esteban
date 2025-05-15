import { Link } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { useEffect } from 'react';

const ProfilePage = () => {
  const myInfo = useAuthStore((state) => state.myInfo);
  useEffect(() => {
    console.log('myInfo changed: ', myInfo);
  }, [myInfo]);
  return (
    <>
      <div>
        <Link to="/">Home</Link>
        <h1>ProfilePage</h1>
        <p>This is the Profile page.</p>
        <p>id: {myInfo.id}</p>
        <p>username: {myInfo.username}</p>
        <p>email: {myInfo.email}</p>
        <p>phone: {myInfo.phone}</p>
      </div>
    </>
  );
};

export default ProfilePage;
