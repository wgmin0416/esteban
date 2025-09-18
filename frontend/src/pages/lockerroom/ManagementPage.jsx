import { useEffect } from 'react';
import PaginatedTable from '../../components/table/PaginatedTable';
import useMemberStore from '../../store/useMemberStore';

const ManagementPage = () => {
  const teamColumns = [
    { key: 'image', title: '프로필 이미지' },
    { key: 'name', title: '이름' },
    { key: 'gender', title: '성별' },
    { key: 'intro', title: '소개' },
    { key: 'phone', title: '전화번호' },
    { key: 'role', title: '역할' },
    { key: 'position', title: '포지션' },
    { key: 'uniform_number', title: '등번호' },
    { key: 'activity_score', title: '활동 점수' },
    { key: 'last_attended_at', title: '최근 참석 일시' },
    { key: 'is_active', title: '활동 여부' },
  ];

  const members = useMemberStore((state) => state.members);
  const getMembers = useMemberStore((state) => state.getMembers);
  useEffect(() => {
    getMembers();
  }, []);

  return (
    <>
      <PaginatedTable
        columns={teamColumns}
        data={members}
        defaultRowCount={10}
        caution={'팀원이 존재하지 않습니다.'}
      />
    </>
  );
};

export default ManagementPage;
