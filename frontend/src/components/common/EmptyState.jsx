import { Link } from 'react-router-dom';
import useLanguageStore from '../../store/useLanguageStore';
import './EmptyState.scss';

const EmptyState = ({ icon = '🏀', title, message, showActions = false, actionLabel, actionPath }) => {
  const language = useLanguageStore((state) => state.language);

  const defaultTitle = language === 'KR' ? '팀 정보가 없습니다' : 'No Team Information';
  const defaultMessage = language === 'KR' ? '팀을 만들거나 팀에 가입해주세요.' : 'Please create or join a team.';
  const defaultActionLabel = language === 'KR' ? '팀 만들기' : 'Create Team';

  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title || defaultTitle}</h2>
      <p>{message || defaultMessage}</p>
      {showActions && (
        <div className="empty-state-actions">
          <Link to="/create-team" className="btn btn-primary">
            {defaultActionLabel}
          </Link>
          {actionPath && (
            <Link to={actionPath} className="btn btn-secondary">
              {actionLabel || (language === 'KR' ? '팀 찾기' : 'Find Team')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
