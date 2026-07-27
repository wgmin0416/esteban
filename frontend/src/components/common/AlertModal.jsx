import useAlertStore from '../../store/useAlertStore';
import useLanguageStore from '../../store/useLanguageStore';
import './AlertModal.scss';

const AlertModal = () => {
  const alert = useAlertStore((state) => state.alert);
  const closeAlert = useAlertStore((state) => state.closeAlert);
  const language = useLanguageStore((state) => state.language);

  if (!alert) return null;

  const handleConfirm = () => {
    if (alert.onConfirm) {
      alert.onConfirm();
    } else {
      closeAlert();
    }
  };

  return (
    <div className="alert-modal-overlay" onClick={closeAlert}>
      <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
        {alert.title && (
          <div className="alert-modal-title">{alert.title}</div>
        )}
        <div className="alert-modal-message">{alert.message}</div>
        <div className="alert-modal-actions">
          <button className="btn btn-primary" onClick={handleConfirm}>
            {language === 'KR' ? '확인' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
