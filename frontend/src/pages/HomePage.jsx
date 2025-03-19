import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <>
      <div>
        <p>
          <Link to="/join">Join</Link>
        </p>
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
