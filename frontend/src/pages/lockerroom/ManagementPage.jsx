import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import useTeamStore from '../../store/useTeamStore';
import apiRequest from '../../lib/apiRequest';
import { toastError, toastSuccess, confirm } from '../../utils/alert';
import './ManagementPage.scss';

const ManagementPage = () => {
  const language = useLanguageStore((state) => state.language);
  const navigate = useNavigate();
  const myInfo = useAuthStore((state) => state.myInfo);
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'join-requests'
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDuesModal, setShowDuesModal] = useState(false);
  const [showCreateDuesModal, setShowCreateDuesModal] = useState(false);
  const [duesForm, setDuesForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: 10000,
    isIndividual: false,
    targetUserId: null,
    reason: '정기회비',
    customReason: '',
  });

  // 회원 명부 로드
  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('get', '/team/management');
      if (response?.data) {
        setMembers(response.data);
        return response.data; // 새로운 데이터 반환
      }
      return null;
    } catch (error) {
      console.error('회원 명부 로드 실패:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 가입 신청 목록 로드
  const loadJoinRequests = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('get', '/team/join-requests');
      if (response?.data) {
        setJoinRequests(response.data);
      }
    } catch (error) {
      console.error('가입 신청 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 권한 체크
  useEffect(() => {
    const checkPermission = async () => {
      setCheckingPermission(true);
      try {
        await getTeamInfo();
        // admin 또는 developer인 경우
        if (myInfo?.role === 'admin' || myInfo?.role === 'developer') {
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }

        // team의 leader 또는 manager인 경우
        if (teamInfo?.role && ['leader', 'manager'].includes(teamInfo.role)) {
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }

        // 권한이 없으면 에러 페이지로 리다이렉트
        setHasPermission(false);
        setCheckingPermission(false);
        toastError(language === 'KR' ? '회원 관리 권한이 없습니다.' : 'You do not have permission to manage members.');
        navigate('/locker-room');
      } catch (error) {
        console.error('권한 체크 실패:', error);
        setHasPermission(false);
        setCheckingPermission(false);
        toastError(language === 'KR' ? '권한 확인 중 오류가 발생했습니다.' : 'Error checking permissions.');
        navigate('/locker-room');
      }
    };

    checkPermission();
  }, [myInfo, teamInfo, getTeamInfo, navigate, language]);

  useEffect(() => {
    if (!hasPermission || checkingPermission) return;

    if (activeTab === 'members') {
      loadMembers();
    } else if (activeTab === 'join-requests') {
      loadJoinRequests();
    }
  }, [activeTab, hasPermission, checkingPermission]);

  const handleDuesClick = (member) => {
    setSelectedMember(member);
    setShowDuesModal(true);
  };

  const handleViewAllDues = (member) => {
    setSelectedMember(member);
    setShowDuesModal(true);
  };

  const handleDuePayment = async (dueId, isPaid) => {
    try {
      const response = await apiRequest('put', '/team/dues/payment', {
        dueId,
        isPaid,
      });

      if (response?.success) {
        // 데이터 새로고침
        const updatedMembers = await loadMembers();
        
        // 모달이 열려있으면 selectedMember도 업데이트
        if (selectedMember && updatedMembers) {
          const updatedMember = updatedMembers.find(m => m.userId === selectedMember.userId);
          if (updatedMember) {
            setSelectedMember(updatedMember);
          }
        }
      }
    } catch (error) {
      console.error('회비 처리 실패:', error);
    }
  };

  const handleCreateMonthlyDues = async (e) => {
    e.preventDefault();

    if (!duesForm.year || !duesForm.month || !duesForm.amount) {
      toastError(language === 'KR' ? '모든 항목을 입력해주세요.' : 'Please fill all fields');
      return;
    }

    if (duesForm.isIndividual && !duesForm.targetUserId) {
      toastError(language === 'KR' ? '회원을 선택해주세요.' : 'Please select a member');
      return;
    }

    if (duesForm.reason === '기타' && !duesForm.customReason.trim()) {
      toastError(language === 'KR' ? '기타 사유를 입력해주세요.' : 'Please enter custom reason');
      return;
    }

    try {
      const payload = {
        year: duesForm.year,
        month: duesForm.month,
        amount: duesForm.amount,
        reason: duesForm.reason === '기타' ? duesForm.customReason : duesForm.reason || '정기회비',
      };

      if (duesForm.isIndividual) {
        payload.targetUserId = duesForm.targetUserId;
      }

      const response = await apiRequest('post', '/team/dues/create-monthly', payload);

      if (response?.success) {
        toastSuccess(response.message || (language === 'KR' ? '회비가 생성되었습니다.' : 'Dues created'));
        setShowCreateDuesModal(false);
        setDuesForm({
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          amount: 10000,
          isIndividual: false,
          targetUserId: null,
          reason: '정기회비',
          customReason: '',
        });
        loadMembers();
      }
    } catch (error) {
      console.error('회비 생성 실패:', error);
    }
  };

  const getRoleLabel = (role) => {
    const roleMap = {
      KR: { leader: '팀장', manager: '매니저', member: '멤버' },
      EN: { leader: 'Leader', manager: 'Manager', member: 'Member' },
    };
    return roleMap[language][role] || role;
  };

  const getPositionLabel = (position) => {
    if (position === '-') return '-';
    const positionMap = {
      KR: { guard: '가드', forward: '포워드', center: '센터' },
      EN: { guard: 'Guard', forward: 'Forward', center: 'Center' },
    };
    return positionMap[language][position] || position;
  };

  // 가입 신청 승인
  const handleApproveJoinRequest = async (requestId) => {
    const result = await confirm(language === 'KR' ? '가입 신청을 승인하시겠습니까?' : 'Approve this join request?');
    if (!result) {
      return;
    }

    try {
      const response = await apiRequest('put', `/team/join-requests/${requestId}/approve`);
      if (response?.success) {
        toastSuccess(response.message || (language === 'KR' ? '가입 신청이 승인되었습니다.' : 'Join request approved'));
        loadJoinRequests();
        loadMembers(); // 회원 목록도 새로고침
      }
    } catch (error) {
      console.error('가입 신청 승인 실패:', error);
      toastError(error.response?.data?.message || (language === 'KR' ? '승인 처리 중 오류가 발생했습니다.' : 'Error approving request'));
    }
  };

  // 가입 신청 거절
  const handleRejectJoinRequest = async (requestId) => {
    const result = await confirm(language === 'KR' ? '가입 신청을 거절하시겠습니까?' : 'Reject this join request?');
    if (!result) {
      return;
    }

    try {
      const response = await apiRequest('put', `/team/join-requests/${requestId}/reject`);
      if (response?.success) {
        toastSuccess(response.message || (language === 'KR' ? '가입 신청이 거절되었습니다.' : 'Join request rejected'));
        loadJoinRequests();
      }
    } catch (error) {
      console.error('가입 신청 거절 실패:', error);
      toastError(error.response?.data?.message || (language === 'KR' ? '거절 처리 중 오류가 발생했습니다.' : 'Error rejecting request'));
    }
  };

  if (checkingPermission) {
    return (
      <div className="management-page">
        <div className="container">
          <div className="loading-spinner">{language === 'KR' ? '권한 확인 중...' : 'Checking permissions...'}</div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return null;
  }

  return (
    <div className="management-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{language === 'KR' ? '회원 관리' : 'Members'}</h1>
          {activeTab === 'members' && (
            <button onClick={() => setShowCreateDuesModal(true)} className="btn btn-primary">
              {language === 'KR' ? '회비 생성' : 'Create Dues'}
            </button>
          )}
        </div>

        {/* 탭 메뉴 */}
        <div className="management-tabs">
          <button
            className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            {language === 'KR' ? '회원 관리' : 'Members'}
          </button>
          <button
            className={`tab-button ${activeTab === 'join-requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('join-requests')}
          >
            {language === 'KR' ? '가입 신청' : 'Join Requests'}
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
        ) : activeTab === 'members' ? (
          members.length > 0 ? (
          <div className="management-table-container">
            <table className="management-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>{language === 'KR' ? '이름' : 'Name'}</th>
                  <th>{language === 'KR' ? '성별' : 'Gender'}</th>
                  <th>{language === 'KR' ? '전화번호' : 'Phone'}</th>
                  <th>{language === 'KR' ? '역할' : 'Role'}</th>
                  <th>{language === 'KR' ? '포지션' : 'Position'}</th>
                  <th>{language === 'KR' ? '활동점수' : 'Activity Score'}</th>
                  <th>{language === 'KR' ? '최근 참석일' : 'Last Attendance'}</th>
                  <th>{language === 'KR' ? '활동 상태' : 'Status'}</th>
                  <th>{language === 'KR' ? '회비 미납월' : 'Unpaid Dues'}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId}>
                    <td>{member.no}</td>
                    <td className="member-name">{member.name}</td>
                    <td>{member.gender}</td>
                    <td>{member.phone}</td>
                    <td>
                      <span className={`role-badge role-${member.role}`}>
                        {getRoleLabel(member.role)}
                      </span>
                    </td>
                    <td>{getPositionLabel(member.position)}</td>
                    <td className="activity-score">{member.activityScore}</td>
                    <td>{member.lastAttendedAt}</td>
                    <td>
                      <span className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                        {member.isActive
                          ? language === 'KR'
                            ? '활동 중'
                            : 'Active'
                          : language === 'KR'
                          ? '비활동'
                          : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {member.unpaidMonths > 0 ? (
                        <button
                          onClick={() => handleDuesClick(member)}
                          className="btn btn-dues"
                        >
                          {member.unpaidMonths}
                          {language === 'KR' ? '개월 미납' : ' unpaid'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleViewAllDues(member)}
                          className="btn btn-view-dues"
                        >
                          {language === 'KR' ? '회비 보기' : 'View Dues'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-message">
                {language === 'KR' ? '회원 정보가 없습니다.' : 'No members found.'}
              </div>
            </div>
          )
        ) : (
          // 가입 신청 탭
          joinRequests.length > 0 ? (
            <div className="join-requests-container">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>{language === 'KR' ? '이름' : 'Name'}</th>
                    <th>{language === 'KR' ? '이메일' : 'Email'}</th>
                    <th>{language === 'KR' ? '전화번호' : 'Phone'}</th>
                    <th>{language === 'KR' ? '성별' : 'Gender'}</th>
                    <th>{language === 'KR' ? '신청일' : 'Applied At'}</th>
                    <th>{language === 'KR' ? '작업' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {joinRequests.map((request, index) => (
                    <tr key={request.id}>
                      <td>{index + 1}</td>
                      <td className="member-name">{request.userName}</td>
                      <td>{request.userEmail}</td>
                      <td>{request.userPhone}</td>
                      <td>{request.userGender}</td>
                      <td>
                        {new Date(request.appliedAt).toLocaleDateString(
                          language === 'KR' ? 'ko-KR' : 'en-US'
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleApproveJoinRequest(request.id)}
                            className="btn btn-primary btn-sm"
                          >
                            {language === 'KR' ? '승인' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleRejectJoinRequest(request.id)}
                            className="btn btn-danger btn-sm"
                          >
                            {language === 'KR' ? '거절' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-message">
                {language === 'KR' ? '가입 신청이 없습니다.' : 'No join requests found.'}
              </div>
            </div>
          )
        )}
      </div>

      {/* 회비 상세 모달 */}
      {showDuesModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowDuesModal(false)}>
          <div className="modal-content dues-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowDuesModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2>
              {selectedMember.name} {language === 'KR' ? '회비 정보' : 'Dues Information'}
            </h2>

            {/* 미납 회비 */}
            {selectedMember.unpaidDetails && selectedMember.unpaidDetails.length > 0 && (
              <div className="dues-section">
                <h3 className="dues-section-title unpaid">
                  {language === 'KR' ? '미납 회비' : 'Unpaid Dues'} ({selectedMember.unpaidDetails.length})
                </h3>
                <div className="dues-list">
                  {selectedMember.unpaidDetails.map((due) => {
                    const isCustomReason =
                      !['정기회비', '게스트', '지각 벌금', '결석 벌금', '회식비', '유니폼비'].includes(
                        due.reason
                      );
                    return (
                      <div key={due.id} className="due-item unpaid">
                        <div className="due-info">
                          <div className="due-header">
                            <span className="due-date">
                              {due.year}
                              {language === 'KR' ? '년' : '/'} {due.month}
                              {language === 'KR' ? '월' : ''}
                            </span>
                            <span className="due-reason">
                              {isCustomReason
                                ? language === 'KR'
                                  ? '기타'
                                  : 'Other'
                                : due.reason}
                            </span>
                            {isCustomReason && (
                              <span className="due-custom-reason">{due.reason}</span>
                            )}
                          </div>
                          <span className="due-amount">
                            {due.amount.toLocaleString()}
                            {language === 'KR' ? '원' : ' KRW'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDuePayment(due.id, true)}
                          className="btn btn-primary btn-sm"
                        >
                          {language === 'KR' ? '납부 처리' : 'Mark as Paid'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 납부 완료 회비 */}
            {selectedMember.paidDetails && selectedMember.paidDetails.length > 0 && (
              <div className="dues-section">
                <h3 className="dues-section-title paid">
                  {language === 'KR' ? '납부 완료 (최근 1년)' : 'Paid Dues (Last Year)'} (
                  {selectedMember.paidDetails.length})
                </h3>
                <div className="dues-grid">
                  {selectedMember.paidDetails.map((due) => {
                    const isCustomReason =
                      !['정기회비', '게스트', '지각 벌금', '결석 벌금', '회식비', '유니폼비'].includes(
                        due.reason
                      );
                    return (
                      <div key={due.id} className="due-card paid">
                        <div className="due-card-header">
                          <span className="due-date">
                            {due.year}.{due.month}
                          </span>
                          <button
                            onClick={() => handleDuePayment(due.id, false)}
                            className="btn-unpaid"
                          >
                            {language === 'KR' ? '미납 처리' : 'Unpaid'}
                          </button>
                        </div>
                        <div className="due-card-body">
                          <div className="due-reason-wrapper">
                            <span className="due-reason">
                              {isCustomReason
                                ? language === 'KR'
                                  ? '기타'
                                  : 'Other'
                                : due.reason}
                            </span>
                            {isCustomReason && (
                              <span className="due-custom-reason">{due.reason}</span>
                            )}
                          </div>
                          <span className="due-amount">
                            {due.amount.toLocaleString()}
                            {language === 'KR' ? '원' : ' KRW'}
                          </span>
                          <span className="due-paid-date">
                            {(() => {
                              const date = new Date(due.paidAt);
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const hours = String(date.getHours()).padStart(2, '0');
                              const minutes = String(date.getMinutes()).padStart(2, '0');
                              return `${year}.${month}.${day}. ${hours}:${minutes}`;
                            })()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 회비 내역이 없을 때 */}
            {(!selectedMember.unpaidDetails || selectedMember.unpaidDetails.length === 0) &&
              (!selectedMember.paidDetails || selectedMember.paidDetails.length === 0) && (
                <p className="no-dues-message">
                  {language === 'KR' ? '회비 내역이 없습니다.' : 'No dues records found.'}
                </p>
              )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-link"
                onClick={() => {
                  setShowDuesModal(false);
                  navigate(
                    `/locker-room/management/dues?userId=${selectedMember.userId}&name=${encodeURIComponent(
                      selectedMember.name
                    )}`
                  );
                }}
              >
                {language === 'KR' ? '전체 내역 보기' : 'View All History'}
              </button>
              <button onClick={() => setShowDuesModal(false)} className="btn btn-secondary">
                {language === 'KR' ? '닫기' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 회비 생성 모달 */}
      {showCreateDuesModal && (
        <div className="modal-overlay" onClick={() => setShowCreateDuesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowCreateDuesModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2>{language === 'KR' ? '회비 생성' : 'Create Dues'}</h2>

            <form onSubmit={handleCreateMonthlyDues}>
              {/* 생성 타입 선택 */}
              <div className="form-group">
                <label>{language === 'KR' ? '생성 방식' : 'Creation Type'}</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={!duesForm.isIndividual}
                      onChange={() =>
                        setDuesForm({ ...duesForm, isIndividual: false, targetUserId: null })
                      }
                    />
                    <span>{language === 'KR' ? '전체 회원' : 'All Members'}</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      checked={duesForm.isIndividual}
                      onChange={() => setDuesForm({ ...duesForm, isIndividual: true })}
                    />
                    <span>{language === 'KR' ? '개별 회원' : 'Individual Member'}</span>
                  </label>
                </div>
              </div>

              {/* 개별 선택 시 회원 선택 */}
              {duesForm.isIndividual && (
                <div className="form-group">
                  <label>{language === 'KR' ? '회원 선택' : 'Select Member'}</label>
                  <select
                    value={duesForm.targetUserId || ''}
                    onChange={(e) =>
                      setDuesForm({ ...duesForm, targetUserId: parseInt(e.target.value) })
                    }
                    className="form-input"
                  >
                    <option value="">
                      {language === 'KR' ? '회원을 선택하세요' : 'Select a member'}
                    </option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name} ({getRoleLabel(member.role)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!duesForm.isIndividual && (
                <p className="modal-description">
                  {language === 'KR'
                    ? '모든 활동 중인 팀원에게 해당 월의 회비가 자동으로 생성됩니다.'
                    : 'Monthly dues will be created for all active team members.'}
                </p>
              )}

              <div className="form-group">
                <label>{language === 'KR' ? '연도' : 'Year'}</label>
                <input
                  type="number"
                  value={duesForm.year}
                  onChange={(e) => setDuesForm({ ...duesForm, year: e.target.value })}
                  min="2020"
                  max="2030"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>{language === 'KR' ? '월' : 'Month'}</label>
                <select
                  value={duesForm.month}
                  onChange={(e) => setDuesForm({ ...duesForm, month: e.target.value })}
                  className="form-input"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {m}{language === 'KR' ? '월' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{language === 'KR' ? '회비 금액 (원)' : 'Amount (KRW)'}</label>
                <input
                  type="number"
                  value={duesForm.amount}
                  onChange={(e) => setDuesForm({ ...duesForm, amount: e.target.value })}
                  min="0"
                  step="1000"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>{language === 'KR' ? '회비 사유' : 'Reason'}</label>
                <select
                  value={duesForm.reason}
                  onChange={(e) =>
                    setDuesForm({ ...duesForm, reason: e.target.value, customReason: '' })
                  }
                  className="form-input"
                >
                  <option value="정기회비">{language === 'KR' ? '정기회비' : 'Regular Dues'}</option>
                  <option value="게스트">{language === 'KR' ? '게스트' : 'Guest Fee'}</option>
                  <option value="지각 벌금">{language === 'KR' ? '지각 벌금' : 'Late Fine'}</option>
                  <option value="결석 벌금">{language === 'KR' ? '결석 벌금' : 'Absence Fine'}</option>
                  <option value="회식비">{language === 'KR' ? '회식비' : 'Dinner Fee'}</option>
                  <option value="유니폼비">{language === 'KR' ? '유니폼비' : 'Uniform Fee'}</option>
                  <option value="기타">{language === 'KR' ? '기타' : 'Other'}</option>
                </select>
              </div>

              {duesForm.reason === '기타' && (
                <div className="form-group">
                  <label>{language === 'KR' ? '기타 사유 (최대 20자)' : 'Custom Reason (max 20)'}</label>
                  <input
                    type="text"
                    value={duesForm.customReason}
                    onChange={(e) =>
                      setDuesForm({ ...duesForm, customReason: e.target.value.slice(0, 20) })
                    }
                    maxLength={20}
                    placeholder={
                      language === 'KR' ? '사유를 입력하세요' : 'Enter custom reason'
                    }
                    className="form-input"
                  />
                  <small className="input-hint">
                    {duesForm.customReason.length}/20
                  </small>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDuesModal(false);
                    setDuesForm({
                      year: new Date().getFullYear(),
                      month: new Date().getMonth() + 1,
                      amount: 10000,
                      isIndividual: false,
                      targetUserId: null,
                      reason: '정기회비',
                      customReason: '',
                    });
                  }}
                  className="btn btn-secondary"
                >
                  {language === 'KR' ? '취소' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {language === 'KR' ? '생성' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementPage;
