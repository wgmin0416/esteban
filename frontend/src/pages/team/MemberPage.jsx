import { Link } from 'react-router-dom';
import useTeamStore from '../../store/useTeamStore';
import { useEffect } from 'react';

const MemberPage = () => {
  const members = useTeamStore((state) => state.members);
  const getMembers = useTeamStore((state) => state.getMembers);
  useEffect(() => {
    getMembers();
  }, []);
  return (
    <>
      <div>
        <h1>MemberPage</h1>
        <p>This is the Member page.</p>
        <Link to="/">Home</Link>
        {members && members.length > 0 ? (
          <ul>
            {members.map((member) => (
              <li key={member.id}>
                {member.username} - {member.provider}
              </li>
            ))}
          </ul>
        ) : (
          <p>멤버가 없습니다.</p>
        )}
      </div>
    </>
  );
};

export default MemberPage;
