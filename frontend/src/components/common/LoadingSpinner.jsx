import useLanguageStore from '../../store/useLanguageStore';
import './LoadingSpinner.scss';

const LoadingSpinner = ({ message }) => {
  const language = useLanguageStore((state) => state.language);
  const defaultMessage = language === 'KR' ? '로딩 중...' : 'Loading...';

  return (
    <div className="loading-spinner">
      {message || defaultMessage}
    </div>
  );
};

export default LoadingSpinner;
