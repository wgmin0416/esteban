import useAlertStore from '../../store/useAlertStore';
import useLanguageStore from '../../store/useLanguageStore';
import './ConfirmModal.scss';

const ConfirmModal = () => {
  const confirm = useAlertStore((state) => state.confirm);
  const language = useLanguageStore((state) => state.language);

  if (!confirm) return null;

  const handleConfirm = () => {
    confirm.onConfirm();
  };

  const handleCancel = () => {
    confirm.onCancel();
  };

  return (
    <div className="confirm-modal-overlay" onClick={handleCancel}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        {confirm.title && (
          <div className="confirm-modal-title">{confirm.title}</div>
        )}
        <div className="confirm-modal-message">{confirm.message}</div>
        <div className="confirm-modal-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            {language === 'KR' ? '취소' : 'Cancel'}
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            {language === 'KR' ? '확인' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
