import { useEffect } from 'react';
import useSportStore from '../../../../store/useSportStore';
import useLanguageStore from '../../../../store/useLanguageStore';
import './SportTab.scss';

const SportTab = () => {
  const language = useLanguageStore((state) => state.language);
  const selectedSport = useSportStore((state) => state.selectedSport);
  const setSelectedSport = useSportStore((state) => state.setSelectedSport);
  const availableSports = useSportStore((state) => state.availableSports);

  // 현재는 농구만 있으므로 항상 basketball로 설정
  useEffect(() => {
    if (availableSports.length === 1) {
      setSelectedSport(availableSports[0].value);
    }
  }, [availableSports, setSelectedSport]);

  // 현재는 종목이 하나뿐이므로 비활성화
  const handleSportChange = (sportValue) => {
    if (availableSports.length > 1) {
      setSelectedSport(sportValue);
    }
  };

  return (
    <div className="sport-tab">
      <div className="sport-tab-container">
        {availableSports.map((sport) => (
          <button
            key={sport.value}
            className={`sport-button ${selectedSport === sport.value ? 'active' : ''} ${
              availableSports.length === 1 ? 'single' : ''
            }`}
            onClick={() => handleSportChange(sport.value)}
            disabled={availableSports.length === 1}
          >
            <span className="sport-icon">{sport.icon}</span>
            <span className="sport-label">
              {sport.label[language] || sport.label.KR}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SportTab;
