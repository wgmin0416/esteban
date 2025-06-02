import { Link } from 'react-router-dom';

const LockerRoomHomePage = () => {
  return (
    <>
      <div>
        <h1>Locker Room Home</h1>
        <p>This is the Locker Room Home page.</p>
        <Link to="/">Home</Link>
      </div>
    </>
  );
};

export default LockerRoomHomePage;
