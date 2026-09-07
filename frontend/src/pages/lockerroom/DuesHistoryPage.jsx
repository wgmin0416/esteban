import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { toastError } from '../../utils/alert';
import './DuesHistoryPage.scss';

const DuesHistoryPage = () => {
  const navigate = useNavigate();
  const language = useLanguageStore((state) => state.language);
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const name = searchParams.get('name');

  const [loading, setLoading] = useState(false);
  const [dues, setDues] = useState([]);

  const title = useMemo(() => {
    if (language !== 'KR') return 'Dues History';
    if (!name) return '회비 전체 내역';
    return `${name} 회비 전체 내역`;
  }, [language, name]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiRequest('get', '/team/dues/history', userId ? { userId } : {});
        setDues(response?.data ?? []);
      } catch (e) {
        console.error(e);
        toastError(language === 'KR' ? '회비 내역을 불러오지 못했습니다.' : 'Failed to load dues.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, language]);

  const unpaid = useMemo(() => dues.filter((d) => !d.isPaid), [dues]);
  const paid = useMemo(() => dues.filter((d) => d.isPaid), [dues]);

  return (
    <div className="dues-history-page">
      <div className="container">
        <div className="page-header">
          <div className="header-left">
            <button type="button" className="btn btn-back" onClick={() => navigate('/locker-room/management')}>
              {language === 'KR' ? '← 회원 관리' : '← Members'}
            </button>
            <h1 className="page-title">{title}</h1>
          </div>
        </div>

        {loading ? (
          <div className="loading">{language === 'KR' ? '로딩 중...' : 'Loading...'}</div>
        ) : dues.length === 0 ? (
          <div className="empty">{language === 'KR' ? '회비 내역이 없습니다.' : 'No dues history.'}</div>
        ) : (
          <div className="dues-history-content">
            {unpaid.length > 0 && (
              <section className="dues-section unpaid">
                <h2 className="section-title">
                  {language === 'KR' ? '미납 내역' : 'Unpaid'} ({unpaid.length})
                </h2>
                <div className="dues-list">
                  {unpaid.map((due) => (
                    <div key={due.id} className="due-row unpaid">
                      <div className="due-left">
                        <div className="due-date">
                          {language === 'KR' ? `${due.year}년 ${due.month}월` : `${due.year}/${due.month}`}
                        </div>
                        <div className="due-reason">{due.reason}</div>
                      </div>
                      <div className="due-amount">
                        {due.amount.toLocaleString()}
                        {language === 'KR' ? '원' : ' KRW'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {paid.length > 0 && (
              <section className="dues-section paid">
                <h2 className="section-title">
                  {language === 'KR' ? '납부 내역' : 'Paid'} ({paid.length})
                </h2>
                <div className="dues-grid">
                  {paid.map((due) => (
                    <div key={due.id} className="due-card paid">
                      <div className="due-card-top">
                        <div className="due-date">{due.year}.{String(due.month).padStart(2, '0')}</div>
                        <div className="due-amount">
                          {due.amount.toLocaleString()}
                          {language === 'KR' ? '원' : ' KRW'}
                        </div>
                      </div>
                      <div className="due-reason">{due.reason}</div>
                      {due.paidAt && (
                        <div className="due-paid-at">
                          {language === 'KR' ? '납부일 ' : 'Paid at '}
                          {new Date(due.paidAt).toLocaleString(language === 'KR' ? 'ko-KR' : 'en-US')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DuesHistoryPage;

