import { useEffect, useRef, useState } from 'react';
import './PlayerStatHexagon.scss';

const MAX = 10;
const SHORT = { 리바운드: '리바', 어시스트: '어시' };
// 데이터 리드아웃: 빠르게 치솟다 정착 (오버슈트 없음 → 숫자가 값을 넘지 않음)
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// 유니폼 입은 선수 상체 실루엣 (사진 플레이스홀더)
const PlayerSilhouette = () => (
  <svg viewBox="0 0 100 108" className="ph-silhouette" aria-hidden="true">
    <circle cx="50" cy="30" r="17" className="sil-body" />
    <path
      className="sil-body"
      d="M16 108 Q18 66 38 57 L44 65 h12 l6 -8 Q82 66 84 108 Z"
    />
    <path className="sil-jersey" d="M40 60 L50 72 L60 58" fill="none" />
    <text x="50" y="92" className="sil-num" textAnchor="middle">
      07
    </text>
  </svg>
);

// props:
//  player: { name, image }
//  stats: [{ axis, score(0~10), raw }] 6개 (득점·3점·리바운드·어시스트·수비·효율)
//  compact: 절반 크기(홈용) — 표 생략, 라벨 축약
const PlayerStatHexagon = ({ player = {}, stats = [], compact = false }) => {
  const [p, setP] = useState(0); // 0 → 1
  const rafRef = useRef();

  useEffect(() => {
    const dur = 1200;
    let start;
    const tick = (ts) => {
      if (start === undefined) start = ts;
      const t = Math.min((ts - start) / dur, 1);
      setP(easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setP(1);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const size = 300;
  const c = size / 2;
  const R = 92;
  const LR = R + 26; // 라벨/수치 반경
  const n = stats.length || 6;
  const ang = (i) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (i, r) => [c + Math.cos(ang(i)) * r, c + Math.sin(ang(i)) * r];
  const polyPoints = (r) => stats.map((_, i) => pt(i, r).join(',')).join(' ');

  const dataPoints = stats
    .map((s, i) => {
      const v = Math.max(0, Math.min(s.score, MAX));
      return pt(i, (v / MAX) * R * p).join(',');
    })
    .join(' ');

  const done = p >= 1;

  return (
    <div className={`stat-hex${compact ? ' stat-hex--compact' : ''}${done ? ' is-done' : ''}`}>
      <span className="hud-scan" />
      <span className="hud-corner tl" />
      <span className="hud-corner tr" />
      <span className="hud-corner bl" />
      <span className="hud-corner br" />

      <div className="stat-hex__top">
        <div className="stat-hex__photo">
          <div className="ph-frame">
            {player.image ? <img src={player.image} alt="" /> : <PlayerSilhouette />}
            <span className="ph-scanline" />
          </div>
          <div className="ph-name">{player.name || 'PLAYER'}</div>
        </div>

        <div className="stat-hex__chart">
          <svg viewBox={`0 0 ${size} ${size}`} width="100%">
            <defs>
              <linearGradient id="hexFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ff5a1f" stopOpacity="0.55" />
                <stop offset="1" stopColor="#ff2e7e" stopOpacity="0.35" />
              </linearGradient>
            </defs>

            {/* 그리드 링 */}
            {[2, 4, 6, 8, 10].map((lvl) => (
              <polygon key={lvl} points={polyPoints((lvl / MAX) * R)} className="hex-ring" />
            ))}
            {/* 스포크 */}
            {stats.map((_, i) => {
              const [x, y] = pt(i, R);
              return <line key={i} x1={c} y1={c} x2={x} y2={y} className="hex-spoke" />;
            })}

            {/* 데이터 폴리곤 */}
            <polygon points={dataPoints} className="hex-data" style={{ opacity: Math.min(p, 1) }} />
            {stats.map((s, i) => {
              const v = Math.max(0, Math.min(s.score, MAX));
              const [x, y] = pt(i, (v / MAX) * R * p);
              return <circle key={i} cx={x} cy={y} r="3.6" className="hex-dot" style={{ opacity: Math.min(p, 1) }} />;
            })}

            {/* 축 라벨 + 카운트업 수치 */}
            {stats.map((s, i) => {
              const [x, y] = pt(i, LR);
              const val = (Math.min(p, 1) * s.score).toFixed(2);
              return (
                <g key={i} className="hex-node">
                  <text x={x} y={y - 7} className="hex-axis" textAnchor="middle">
                    {compact ? SHORT[s.axis] || s.axis : s.axis}
                  </text>
                  <text x={x} y={y + 9} className="hex-val" textAnchor="middle">
                    {val}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 수치 표 (컴팩트 모드에선 생략) */}
      {!compact && (
        <table className="stat-hex__table">
          <tbody>
            {stats.map((s) => (
              <tr key={s.axis}>
                <th>{s.axis}</th>
                <td className="raw">{s.raw}</td>
                <td className="score">
                  <span className="score-bar">
                    <span style={{ width: `${(s.score / MAX) * 100 * Math.min(p, 1)}%` }} />
                  </span>
                  <b>{(s.score * Math.min(p, 1)).toFixed(2)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PlayerStatHexagon;
