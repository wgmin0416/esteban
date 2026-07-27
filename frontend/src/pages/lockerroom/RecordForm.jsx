import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import useTeamStore from '../../store/useTeamStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toastSuccess, toastError } from '../../utils/alert';
import './RecordForm.scss';

const RecordForm = () => {
  const navigate = useNavigate();
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const getMembers = useTeamStore((state) => state.getMembers);
  const members = useTeamStore((state) => state.members);
  const language = useLanguageStore((state) => state.language);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    match_date: '',
    is_internal: true, // 팀 내 경기 (default)
    location: '',
  });

  // 팀별 선수 기록 (여러 팀 지원)
  const [teamRecords, setTeamRecords] = useState([
    {
      teamId: null,
      players: Array(5).fill(null).map(() => ({
        user_id: '',
        fgm: '',
        fga: '',
        threepm: '',
        threepa: '',
        ftm: '',
        fta: '',
        oreb: '',
        dreb: '',
        ast: '',
        stl: '',
        blk: '',
        pf: '',
        turnover: '',
      })),
    },
  ]);

  useEffect(() => {
    if (!teamInfo) {
      getTeamInfo();
    }
    if (!members) {
      getMembers();
    }
  }, [teamInfo, members, getTeamInfo, getMembers]);

  // 기본 팀 ID 설정
  useEffect(() => {
    if (teamInfo?.id && teamRecords[0].teamId === null) {
      setTeamRecords([
        {
          ...teamRecords[0],
          teamId: teamInfo.id,
        },
      ]);
    }
  }, [teamInfo]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handlePlayerChange = (teamIndex, playerIndex, field, value) => {
    const newTeamRecords = [...teamRecords];
    newTeamRecords[teamIndex].players[playerIndex][field] = value;
    setTeamRecords(newTeamRecords);
  };

  const addPlayerRow = (teamIndex) => {
    const newTeamRecords = [...teamRecords];
    newTeamRecords[teamIndex].players.push({
      user_id: '',
      fgm: '',
      fga: '',
      threepm: '',
      threepa: '',
      ftm: '',
      fta: '',
      oreb: '',
      dreb: '',
      ast: '',
      stl: '',
      blk: '',
      pf: '',
      turnover: '',
    });
    setTeamRecords(newTeamRecords);
  };

  const removePlayerRow = (teamIndex, playerIndex) => {
    const newTeamRecords = [...teamRecords];
    if (newTeamRecords[teamIndex].players.length > 1) {
      newTeamRecords[teamIndex].players.splice(playerIndex, 1);
      setTeamRecords(newTeamRecords);
    }
  };

  const addTeam = () => {
    setTeamRecords([
      ...teamRecords,
      {
        teamId: teamInfo?.id || null,
        players: Array(5).fill(null).map(() => ({
          user_id: '',
          fgm: '',
          fga: '',
          threepm: '',
          threepa: '',
          ftm: '',
          fta: '',
          oreb: '',
          dreb: '',
          ast: '',
          stl: '',
          blk: '',
          pf: '',
          turnover: '',
        })),
      },
    ]);
  };

  const removeTeam = (teamIndex) => {
    if (teamRecords.length > 1) {
      const newTeamRecords = [...teamRecords];
      newTeamRecords.splice(teamIndex, 1);
      setTeamRecords(newTeamRecords);
    }
  };

  const calculateStats = (player) => {
    const fgm = parseInt(player.fgm) || 0;
    const fga = parseInt(player.fga) || 0;
    const threepm = parseInt(player.threepm) || 0;
    const threepa = parseInt(player.threepa) || 0;
    const ftm = parseInt(player.ftm) || 0;
    const fta = parseInt(player.fta) || 0;
    const oreb = parseInt(player.oreb) || 0;
    const dreb = parseInt(player.dreb) || 0;

    // 총 득점 = 2점슛 득점 + 3점슛 득점 + 자유투 득점
    // 2점슛 득점 = 필드골 득점 - 3점슛 득점
    const twopm = fgm - threepm;
    const pts = twopm * 2 + threepm * 3 + ftm;

    // 리바운드 = 공격 리바운드 + 수비 리바운드
    const reb = oreb + dreb;

    return {
      pts,
      reb,
      fgm,
      fga,
      twopm,
      twopa: fga - threepa,
      threepm,
      threepa,
      ftm,
      fta,
      oreb,
      dreb,
    };
  };

  // 툴팁 텍스트 (한글 모드일 때만)
  const getTooltipText = (field) => {
    if (language !== 'KR') return '';
    
    const tooltips = {
      pts: '총 득점 (2점슛×2 + 3점슛×3 + 자유투, 자동 계산)',
      fgm: '필드골 성공 횟수 (2점슛 + 3점슛 포함)',
      fga: '필드골 시도 횟수 (2점슛 + 3점슛 포함)',
      threepm: '3점슛 성공 횟수',
      threepa: '3점슛 시도 횟수',
      ftm: '자유투 성공 횟수',
      fta: '자유투 시도 횟수',
      oreb: '공격 리바운드 (공격 시도 후 미성공한 공을 잡은 횟수)',
      dreb: '수비 리바운드 (상대팀 공격 시도 후 미성공한 공을 잡은 횟수)',
      ast: '어시스트 (동료 선수의 득점을 도운 횟수)',
      stl: '스틸 (상대팀의 공을 빼앗은 횟수)',
      blk: '블록 (상대팀의 슛을 막은 횟수)',
      pf: '파울 (개인 파울 횟수)',
      turnover: '턴오버 (공을 잃은 횟수)',
    };
    
    return tooltips[field] || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 유효성 검사
      if (!formData.match_date) {
        toastError(language === 'KR' ? '경기 날짜를 입력해주세요.' : 'Please enter match date.');
        setLoading(false);
        return;
      }

      // 각 팀별로 경기 생성 및 기록 저장
      for (const teamRecord of teamRecords) {
        if (!teamRecord.teamId) {
          toastError(language === 'KR' ? '팀을 선택해주세요.' : 'Please select a team.');
          setLoading(false);
          return;
        }

        // 유효한 선수 기록이 있는지 확인
        const validPlayers = teamRecord.players.filter((p) => p.user_id);
        if (validPlayers.length === 0) {
          toastError(language === 'KR' ? '최소 한 명의 선수 기록을 입력해주세요.' : 'Please enter at least one player record.');
          setLoading(false);
          return;
        }

        // 경기 생성
        const matchData = {
          team_id: teamRecord.teamId,
          title: formData.is_internal
            ? language === 'KR' ? '팀 내 경기' : 'Internal Match'
            : language === 'KR' ? '외부팀 경기' : 'External Match',
          match_date: formData.match_date,
          location: formData.location || '',
          type: formData.is_internal ? 'intra_squad' : 'invitation',
          total_players: validPlayers.length,
        };

        const matchResponse = await apiRequest('post', '/team/match', matchData);
        const matchId = matchResponse.data.id;

        // 선수별 기록 저장
        for (const player of validPlayers) {
          const stats = calculateStats(player);
          const recordData = {
            team_id: teamRecord.teamId,
            match_id: matchId,
            user_id: parseInt(player.user_id),
            fgm: stats.fgm,
            fga: stats.fga,
            threepm: stats.threepm,
            threepa: stats.threepa,
            ftm: stats.ftm,
            fta: stats.fta,
            oreb: stats.oreb || 0,
            dreb: stats.dreb || 0,
            reb: stats.reb,
            ast: parseInt(player.ast) || 0,
            stl: parseInt(player.stl) || 0,
            blk: parseInt(player.blk) || 0,
            pf: parseInt(player.pf) || 0,
            turnover: parseInt(player.turnover) || 0,
            pts: stats.pts,
            is_win: false, // 승패는 경기 결과에 따라 자동 계산되거나 별도 입력 필요
          };

          await apiRequest('post', '/team/match-record', recordData);
        }
      }

      toastSuccess(language === 'KR' ? '기록이 저장되었습니다.' : 'Record saved successfully.');
      navigate('/locker-room/records');
    } catch (error) {
      console.error('기록 저장 실패:', error);
      toastError(language === 'KR' ? '기록 저장에 실패했습니다.' : 'Failed to save record.');
    } finally {
      setLoading(false);
    }
  };

  if (!teamInfo) {
    return (
      <div className="record-form-page">
        <div className="container">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // 팀 멤버 목록 가져오기 (members는 배열이고 각 항목은 team_members 배열을 포함)
  const teamMembers = members
    ? members
        .map((member) => {
          // team_members 배열에서 첫 번째 항목의 정보 사용
          const teamMember = member.team_members?.[0];
          return {
            id: member.id,
            name: member.name,
            ...teamMember,
          };
        })
        .filter((member) => member.id && member.name)
    : [];

  return (
    <div className="record-form-page">
      <div className="container">
        <div className="form-header">
          <h1 className="page-title">{language === 'KR' ? '기록 작성' : 'Create Record'}</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/locker-room/records')}>
            {language === 'KR' ? '취소' : 'Cancel'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="record-form">
          {/* 상단 입력 섹션 */}
          <div className="form-section">
            <h2 className="section-title">{language === 'KR' ? '경기 정보' : 'Match Information'}</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="match_date">
                  {language === 'KR' ? '경기 날짜' : 'Match Date'} <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="match_date"
                  name="match_date"
                  value={formData.match_date}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_internal"
                    checked={formData.is_internal}
                    onChange={handleInputChange}
                    className="form-checkbox"
                  />
                  <span>{language === 'KR' ? '팀 내 경기' : 'Internal Match'}</span>
                </label>
                {!formData.is_internal && (
                  <span className="form-hint">{language === 'KR' ? '외부팀과의 경기' : 'Match against external team'}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="location">{language === 'KR' ? '경기 장소' : 'Location'}</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder={language === 'KR' ? '경기 장소를 입력하세요 (선택사항)' : 'Enter match location (optional)'}
                />
              </div>
            </div>
          </div>

          {/* 팀별 기록 테이블 */}
          {teamRecords.map((teamRecord, teamIndex) => (
            <div key={teamIndex} className="form-section team-section">
              <div className="team-header">
                <h2 className="section-title">
                  {language === 'KR' ? `팀 ${teamIndex + 1}` : `Team ${teamIndex + 1}`}
                </h2>
                {teamRecords.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-remove-team"
                    onClick={() => removeTeam(teamIndex)}
                  >
                    {language === 'KR' ? '팀 제거' : 'Remove Team'}
                  </button>
                )}
              </div>

              <div className="table-container">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>{language === 'KR' ? '선수' : 'Player'}</th>
                      <th
                        {...(getTooltipText('pts') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('pts'),
                        })}
                      >
                        PTS
                      </th>
                      <th
                        {...(getTooltipText('fgm') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('fgm'),
                        })}
                      >
                        FG
                      </th>
                      <th
                        {...(getTooltipText('fga') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('fga'),
                        })}
                      >
                        FGA
                      </th>
                      <th
                        {...(getTooltipText('threepm') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('threepm'),
                        })}
                      >
                        3PM
                      </th>
                      <th
                        {...(getTooltipText('threepa') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('threepa'),
                        })}
                      >
                        3PA
                      </th>
                      <th
                        {...(getTooltipText('ftm') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('ftm'),
                        })}
                      >
                        FTM
                      </th>
                      <th
                        {...(getTooltipText('fta') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('fta'),
                        })}
                      >
                        FTA
                      </th>
                      <th
                        {...(getTooltipText('oreb') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('oreb'),
                        })}
                      >
                        OREB
                      </th>
                      <th
                        {...(getTooltipText('dreb') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('dreb'),
                        })}
                      >
                        DREB
                      </th>
                      <th
                        {...(getTooltipText('ast') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('ast'),
                        })}
                      >
                        AST
                      </th>
                      <th
                        {...(getTooltipText('stl') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('stl'),
                        })}
                      >
                        STL
                      </th>
                      <th
                        {...(getTooltipText('blk') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('blk'),
                        })}
                      >
                        BLK
                      </th>
                      <th
                        {...(getTooltipText('pf') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('pf'),
                        })}
                      >
                        PF
                      </th>
                      <th
                        {...(getTooltipText('turnover') && {
                          'data-tooltip-id': 'tooltip',
                          'data-tooltip-content': getTooltipText('turnover'),
                        })}
                      >
                        TO
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRecord.players.map((player, playerIndex) => {
                      const stats = calculateStats(player);
                      return (
                        <tr key={playerIndex}>
                          <td>
                            <select
                              value={player.user_id}
                              onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'user_id', e.target.value)}
                              className="form-select player-select"
                              required={playerIndex < 5}
                            >
                              <option value="">{language === 'KR' ? '선수 선택' : 'Select Player'}</option>
                              {teamMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={stats.pts}
                              readOnly
                              className="form-input number-input readonly"
                              {...(getTooltipText('pts') && {
                                'data-tooltip-id': 'tooltip',
                                'data-tooltip-content': getTooltipText('pts'),
                              })}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={player.fgm}
                              onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'fgm', e.target.value)}
                              className="form-input number-input"
                              {...(getTooltipText('fgm') && {
                                'data-tooltip-id': 'tooltip',
                                'data-tooltip-content': getTooltipText('fgm'),
                              })}
                            />
                          </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.fga}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'fga', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('fga') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('fga'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.threepm}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'threepm', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('threepm') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('threepm'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.threepa}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'threepa', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('threepa') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('threepa'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.ftm}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'ftm', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('ftm') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('ftm'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.fta}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'fta', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('fta') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('fta'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.oreb}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'oreb', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('oreb') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('oreb'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.dreb}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'dreb', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('dreb') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('dreb'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.ast}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'ast', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('ast') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('ast'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.stl}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'stl', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('stl') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('stl'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.blk}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'blk', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('blk') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('blk'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.pf}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'pf', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('pf') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('pf'),
                            })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={player.turnover}
                            onChange={(e) => handlePlayerChange(teamIndex, playerIndex, 'turnover', e.target.value)}
                            className="form-input number-input"
                            {...(getTooltipText('turnover') && {
                              'data-tooltip-id': 'tooltip',
                              'data-tooltip-content': getTooltipText('turnover'),
                            })}
                          />
                        </td>
                        <td>
                          {teamRecord.players.length > 1 && (
                            <button
                              type="button"
                              className="btn-remove-row"
                              onClick={() => removePlayerRow(teamIndex, playerIndex)}
                              title={language === 'KR' ? '행 제거' : 'Remove Row'}
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
                <button
                  type="button"
                  className="btn btn-secondary btn-add-row"
                  onClick={() => addPlayerRow(teamIndex)}
                >
                  + {language === 'KR' ? '선수 추가' : 'Add Player'}
                </button>
              </div>
            </div>
          ))}

          {/* 팀 추가 버튼 */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary btn-add-team"
              onClick={addTeam}
            >
              + {language === 'KR' ? '팀 추가' : 'Add Team'}
            </button>
          </div>

          {/* 제출 버튼 */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-submit" disabled={loading}>
              {loading
                ? language === 'KR'
                  ? '저장 중...'
                  : 'Saving...'
                : language === 'KR'
                  ? '저장하기'
                  : 'Save Record'}
            </button>
          </div>
        </form>

        {/* React Tooltip 컴포넌트 */}
        {language === 'KR' && <Tooltip id="tooltip" place="top" delayShow={0} />}
      </div>
    </div>
  );
};

export default RecordForm;
