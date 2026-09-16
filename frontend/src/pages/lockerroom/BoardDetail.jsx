import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useLanguageStore from '../../store/useLanguageStore';
import useTeamStore from '../../store/useTeamStore';
import useAuthStore from '../../store/useAuthStore';
import apiRequest from '../../lib/apiRequest';
import { toastError, toastSuccess, confirm } from '../../utils/alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { REACTION_EMOJIS, categoryColor, roleBadge } from './boardConstants';
import './BoardDetail.scss';

const youtubeId = (url) => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
};

// 내용 안의 @선수 언급을 강조 표시 (names: 태그된 선수 이름 목록)
const renderContentWithMentions = (text, names) => {
  if (!text) return null;
  if (!names || !names.length) return text;
  const esc = names
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`@(${esc.join('|')})`, 'g');
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <span className="mention" key={`${m.index}-${m[1]}`}>
        @{m[1]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

const BoardDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const language = useLanguageStore((state) => state.language);
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const myInfo = useAuthStore((state) => state.myInfo);
  const t = (kr, en) => (language === 'KR' ? kr : en);

  const canManage =
    ['admin', 'developer'].includes(myInfo?.role) ||
    ['leader', 'manager'].includes(teamInfo?.role);

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState([]);
  const [pollSummary, setPollSummary] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pinnedHome, setPinnedHome] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('get', `/team/boards/${id}`);
        const d = res?.data;
        if (!d) throw new Error('not found');
        setBoard(d);
        setReactions(d.reactionSummary || []);
        setPollSummary(d.pollSummary || null);
        setComments(d.comments || []);
        setPinnedHome(!!d.pinned_home);
      } catch (error) {
        console.error('게시글 로드 실패:', error);
        toastError(t('게시글을 불러올 수 없습니다.', 'Failed to load post.'));
        navigate('/locker-room/team-board');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeletePost = async () => {
    if (!(await confirm(t('정말 삭제하시겠습니까?', 'Delete this post?')))) return;
    try {
      const res = await apiRequest('delete', `/team/boards/${id}`);
      if (res?.success) {
        toastSuccess(t('삭제되었습니다.', 'Deleted.'));
        navigate('/locker-room/team-board');
      }
    } catch {
      toastError(t('삭제 중 오류가 발생했습니다.', 'Failed to delete.'));
    }
  };

  const handleToggleHome = async () => {
    try {
      const res = await apiRequest('post', `/team/boards/${id}/pin-home`);
      if (res?.success) {
        setPinnedHome(!!res.data?.pinned_home);
        toastSuccess(res.message || (res.data?.pinned_home ? t('홈 공지로 설정했어요.', 'Pinned to home.') : t('홈 공지를 해제했어요.', 'Unpinned from home.')));
      }
    } catch {
      toastError(t('홈 공지 설정에 실패했어요.', 'Failed to update home notice.'));
    }
  };

  const handleReaction = async (emoji) => {
    try {
      const res = await apiRequest('post', `/team/boards/${id}/reactions`, { emoji });
      if (res?.data) setReactions(res.data);
    } catch {
      toastError(t('반응 처리에 실패했어요.', 'Failed to react.'));
    }
  };

  const handleVote = async (optionId) => {
    if (!pollSummary) return;
    let selected = [...pollSummary.myVotes];
    if (pollSummary.allowMulti) {
      selected = selected.includes(optionId)
        ? selected.filter((x) => x !== optionId)
        : [...selected, optionId];
    } else {
      selected = selected.includes(optionId) ? [] : [optionId];
    }
    try {
      const res = await apiRequest('post', `/team/boards/${id}/poll/vote`, { optionIds: selected });
      if (res?.data) setPollSummary(res.data);
    } catch {
      toastError(t('투표에 실패했어요.', 'Failed to vote.'));
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiRequest('post', `/team/boards/${id}/comments`, { content: commentText.trim() });
      if (res?.data) {
        setComments((prev) => [
          ...prev,
          {
            id: res.data.id,
            content: res.data.content,
            created_at: res.data.created_at,
            author: { id: myInfo?.id, name: myInfo?.name },
            authorRole: teamInfo?.role || 'member',
            authorImage: myInfo?.profile_image || null,
            isMine: true,
          },
        ]);
        setCommentText('');
      }
    } catch {
      toastError(t('댓글 작성에 실패했어요.', 'Failed to comment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!(await confirm(t('댓글을 삭제할까요?', 'Delete this comment?')))) return;
    try {
      const res = await apiRequest('delete', `/team/boards/${id}/comments/${commentId}`);
      if (res?.success) setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      toastError(t('댓글 삭제에 실패했어요.', 'Failed to delete comment.'));
    }
  };

  const fmtDateTime = (d) => {
    const dt = new Date(d);
    return dt.toLocaleString(language === 'KR' ? 'ko-KR' : 'en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };
  const fmtMatchDate = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()}`;
  };

  if (loading) {
    return (
      <div className="board-detail-page">
        <div className="container"><LoadingSpinner /></div>
      </div>
    );
  }
  if (!board) return null;

  const canEdit = board.isMine || canManage;
  const images = (board.attachments || []).filter((a) => a.type === 'image');
  const files = (board.attachments || []).filter((a) => a.type === 'file');
  const authorRoleBadge = roleBadge(board.authorRole);

  return (
    <div className="board-detail-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate('/locker-room/team-board')}>
          ‹ {t('목록', 'List')}
        </button>

        <article className="post">
          <div className="post-head">
            <span className="cat-badge" style={{ background: categoryColor(board.category) }}>
              {board.category}
            </span>
            <h1 className="post-title">{board.title}</h1>
          </div>

          <div className="post-meta">
            <div className="pm-author">
              {board.authorImage && <img className="pm-avatar" src={board.authorImage} alt="" />}
              <span className="pm-name">{board.author?.name}</span>
              {authorRoleBadge && (
                <span className={`role-badge ${authorRoleBadge.cls}`}>{authorRoleBadge.label}</span>
              )}
            </div>
            <div className="pm-sub">
              <span>{fmtDateTime(board.created_at)}</span>
              {!!board.is_edited && (
                <span className="edited">· {t('수정됨', 'edited')} {fmtDateTime(board.updated_at)}</span>
              )}
              <span>· 👁 {board.view_count}</span>
            </div>
          </div>

          {/* 연결된 경기 */}
          {board.match && (
            <button
              className="match-link"
              onClick={() =>
                navigate(`/locker-room/matches/${board.match.id}`, {
                  state: { from: `/locker-room/team-board/${board.id}`, fromLabel: t('후기로', 'Back to review') },
                })
              }
            >
              🏀 <b>{board.match.title}</b>
              <span>{fmtMatchDate(board.match.match_date)}</span>
              <span className="ml-go">{t('경기 보기', 'View')} ›</span>
            </button>
          )}

          <div className="post-content">
            {renderContentWithMentions(board.content, (board.player_notes || []).map((n) => n.name))}
          </div>

          {/* 이미지 */}
          {images.length > 0 && (
            <div className="post-images">
              {images.map((img, i) => (
                <img key={i} src={img.url} alt={img.name || ''} />
              ))}
            </div>
          )}

          {/* 파일 */}
          {files.length > 0 && (
            <div className="post-files">
              {files.map((f, i) => (
                <a key={i} href={f.url} download={f.name} className="file-chip">
                  📎 {f.name} <span>{Math.round((f.size || 0) / 1024)}KB</span>
                </a>
              ))}
            </div>
          )}

          {/* 링크 임베드 */}
          {(board.links || []).length > 0 && (
            <div className="post-links">
              {board.links.map((url, i) => {
                const yt = youtubeId(url);
                return yt ? (
                  <div key={i} className="embed-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${yt}`}
                      title={`yt-${i}`}
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="link-chip">
                    🔗 {url}
                  </a>
                );
              })}
            </div>
          )}

          {/* 언급된 선수 (후기) */}
          {(board.player_notes || []).length > 0 && (
            <div className="mentioned-players">
              <span className="mp-label">{t('언급된 선수', 'Mentioned')}</span>
              {board.player_notes.map((n, i) => (
                <span key={i} className="mp-chip">
                  @{n.name}
                  {n.squad_label && <em>{n.squad_label}</em>}
                </span>
              ))}
            </div>
          )}

          {/* 투표 */}
          {pollSummary && (
            <div className="post-poll">
              {pollSummary.question && <div className="poll-q">🗳 {pollSummary.question}</div>}
              {pollSummary.options.map((o) => {
                const pct =
                  pollSummary.canViewResults && pollSummary.totalVotes
                    ? Math.round((o.count / pollSummary.totalVotes) * 100)
                    : 0;
                const mine = pollSummary.myVotes.includes(o.id);
                return (
                  <div key={o.id} className="poll-option-wrap">
                    <button
                      className={`poll-option ${mine ? 'mine' : ''} ${pollSummary.canViewResults ? '' : 'hidden-result'}`}
                      onClick={() => handleVote(o.id)}
                    >
                      {pollSummary.canViewResults && <span className="po-fill" style={{ width: `${pct}%` }} />}
                      <span className="po-text">{mine ? '✓ ' : ''}{o.text}</span>
                      {pollSummary.canViewResults && <span className="po-count">{pct}% ({o.count})</span>}
                    </button>
                    {/* 익명이 아니고 결과 열람 가능할 때 투표자 표시 */}
                    {pollSummary.canViewResults && !pollSummary.anonymous && o.voters?.length > 0 && (
                      <div className="po-voters">
                        {o.voters.map((v) => (
                          <span key={v.id} className="po-voter">{v.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="poll-total">
                {pollSummary.anonymous && <span className="poll-flag">🕶 {t('익명', 'Anonymous')}</span>}
                {pollSummary.allowMulti && <span className="poll-flag">{t('복수 선택', 'Multiple')}</span>}
                {pollSummary.canViewResults ? (
                  <span>{t(`${pollSummary.voterCount}명 참여`, `${pollSummary.voterCount} voted`)}</span>
                ) : (
                  <span className="poll-locked">{t('투표하면 결과를 볼 수 있어요', 'Vote to see results')}</span>
                )}
              </div>
            </div>
          )}

          {/* 반응 (좋아요/이모지) */}
          <div className="reaction-bar">
            {REACTION_EMOJIS.map((emoji) => {
              const r = reactions.find((x) => x.emoji === emoji);
              return (
                <button
                  key={emoji}
                  className={`reaction ${r?.mine ? 'mine' : ''}`}
                  onClick={() => handleReaction(emoji)}
                >
                  <span className="re-emoji">{emoji}</span>
                  {r?.count ? <span className="re-count">{r.count}</span> : null}
                </button>
              );
            })}
          </div>

          {/* 관리자: 홈 공지 설정 (공지 말머리만) */}
          {canManage && board.category === '공지' && (
            <button className={`home-pin ${pinnedHome ? 'on' : ''}`} onClick={handleToggleHome}>
              {pinnedHome
                ? t('★ 홈 공지 해제', '★ Unpin from home')
                : t('☆ 홈 공지로 설정', '☆ Pin to home')}
            </button>
          )}

          {/* 작성자/관리자 액션 */}
          {canEdit && (
            <div className="post-actions">
              <button
                className="btn-edit"
                onClick={() => navigate(`/locker-room/team-board/edit/${board.id}`)}
              >
                {t('수정', 'Edit')}
              </button>
              <button className="btn-delete" onClick={handleDeletePost}>
                {t('삭제', 'Delete')}
              </button>
            </div>
          )}
        </article>

        {/* 댓글 */}
        <section className="comments">
          <h2 className="comments-title">{t('댓글', 'Comments')} {comments.length}</h2>

          <div className="comment-list">
            {comments.map((c) => {
              const badge = roleBadge(c.authorRole);
              return (
                <div key={c.id} className="comment">
                  {c.authorImage ? (
                    <img className="c-avatar" src={c.authorImage} alt="" />
                  ) : (
                    <div className="c-avatar placeholder">{c.author?.name?.[0] || '?'}</div>
                  )}
                  <div className="c-body">
                    <div className="c-head">
                      <span className="c-name">{c.author?.name}</span>
                      {badge && <span className={`role-badge ${badge.cls}`}>{badge.label}</span>}
                      <span className="c-date">{fmtDateTime(c.created_at)}</span>
                      {(c.isMine || canManage) && (
                        <button className="c-del" onClick={() => handleDeleteComment(c.id)}>
                          {t('삭제', 'Delete')}
                        </button>
                      )}
                    </div>
                    <div className="c-content">{c.content}</div>
                  </div>
                </div>
              );
            })}
            {comments.length === 0 && (
              <p className="c-empty">{t('첫 댓글을 남겨보세요.', 'Be the first to comment.')}</p>
            )}
          </div>

          <form className="comment-form" onSubmit={handleAddComment}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('댓글을 입력하세요', 'Write a comment')}
            />
            <button type="submit" disabled={submitting || !commentText.trim()}>
              {t('등록', 'Post')}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default BoardDetail;
