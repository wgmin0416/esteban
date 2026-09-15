import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useLanguageStore from '../../store/useLanguageStore';
import useTeamStore from '../../store/useTeamStore';
import useAuthStore from '../../store/useAuthStore';
import apiRequest from '../../lib/apiRequest';
import { toastError, toastSuccess } from '../../utils/alert';
import { BOARD_CATEGORIES } from './boardConstants';
import './BoardForm.scss';

const DRAFT_PREFIX = 'teamBoardDraft:';
const MAX_FILE_MB = 5;
const genId = () => `opt_${Math.random().toString(36).slice(2, 9)}`;

// 내용 미리보기 레이어: @이름 언급을 음영 처리
const highlightNodes = (text, names) => {
  if (!names.length) return text;
  const esc = [...new Set(names)]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`@(${esc.join('|')})`, 'g');
  const out = [];
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <mark className="mention" key={i++}>
        @{m[1]}
      </mark>
    );
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
};

const BoardForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const language = useLanguageStore((state) => state.language);
  const teamInfo = useTeamStore((state) => state.teamInfo);
  const getTeamInfo = useTeamStore((state) => state.getTeamInfo);
  const myInfo = useAuthStore((state) => state.myInfo);
  const t = (kr, en) => (language === 'KR' ? kr : en);

  const canManage =
    ['admin', 'developer'].includes(myInfo?.role) ||
    ['leader', 'manager'].includes(teamInfo?.role);

  const draftKey = `${DRAFT_PREFIX}${id || 'new'}`;

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: '자유',
    send_push: false,
    match_id: '',
  });
  const [attachments, setAttachments] = useState([]); // {type,url,name,size}
  const [links, setLinks] = useState(['']);
  const [poll, setPoll] = useState({ enabled: false, question: '', allowMulti: false, anonymous: false, options: [{ id: genId(), text: '' }, { id: genId(), text: '' }] });

  const [matches, setMatches] = useState([]);
  const [participants, setParticipants] = useState([]); // 후기: 경기 참석자 (스쿼드별)
  const [mention, setMention] = useState({ open: false, query: '', start: -1 }); // @멘션 자동완성
  const [loading, setLoading] = useState(false);
  const [savedDraft, setSavedDraft] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const dirtyRef = useRef(false);
  const contentRef = useRef(null);
  const backdropRef = useRef(null);

  useEffect(() => {
    if (!teamInfo) getTeamInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 연결할 경기 목록
  useEffect(() => {
    if (!teamInfo?.id) return;
    apiRequest('get', '/team/matches', { team_id: teamInfo.id })
      .then((res) => setMatches(res?.data || []))
      .catch(() => setMatches([]));
  }, [teamInfo?.id]);

  // 후기 + 경기 선택 시 참석자(스쿼드별) 로드
  useEffect(() => {
    if (form.category !== '후기' || !form.match_id) {
      setParticipants([]);
      return;
    }
    apiRequest('get', `/team/match/${form.match_id}`)
      .then((res) => {
        const d = res?.data;
        if (!d) return setParticipants([]);
        let groups = [];
        if (d.squads?.length) {
          groups = d.squads.map((s) => ({
            squad: s.label,
            players: (s.members || []).map((m) => ({
              key: m.user_id != null ? `u${m.user_id}` : `g${m.name}`,
              user_id: m.user_id ?? null,
              name: m.name,
              squad: s.label,
            })),
          }));
        } else if (d.attendance?.list) {
          groups = [
            {
              squad: '',
              players: d.attendance.list
                .filter((a) => a.status === 'attend')
                .map((a) => ({ key: `u${a.user_id}`, user_id: a.user_id, name: a.name, squad: '' })),
            },
          ];
        }
        setParticipants(groups);
      })
      .catch(() => setParticipants([]));
  }, [form.category, form.match_id]);

  // 기존 글 로드(수정) + 임시저장 탐색
  useEffect(() => {
    const loadBoard = async () => {
      try {
        const res = await apiRequest('get', `/team/boards/${id}`);
        const d = res?.data;
        if (d) {
          setForm({
            title: d.title || '',
            content: d.content || '',
            category: d.category || '자유',
            send_push: !!d.send_push,
            match_id: d.match_id || '',
          });
          setAttachments(Array.isArray(d.attachments) ? d.attachments : []);
          setLinks(Array.isArray(d.links) && d.links.length ? d.links : ['']);
          if (d.poll && Array.isArray(d.poll.options)) {
            setPoll({
              enabled: true,
              question: d.poll.question || '',
              allowMulti: !!d.poll.allowMulti,
              anonymous: !!d.poll.anonymous,
              options: d.poll.options.map((o) => ({ id: o.id || genId(), text: o.text })),
            });
          }
        }
      } catch (error) {
        console.error('게시글 로드 실패:', error);
        toastError(t('게시글을 불러올 수 없습니다.', 'Failed to load post.'));
        navigate('/locker-room/team-board');
      }
    };
    if (id) loadBoard();

    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.title || parsed.content)) setSavedDraft(parsed);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 자동 임시저장 (첨부 제외 — localStorage 용량 보호)
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (!form.title && !form.content) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ ...form, links, poll, savedAt: Date.now() })
        );
        setSavedAt(Date.now());
      } catch {
        /* ignore quota */
      }
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, links, poll]);

  const markDirty = () => {
    dirtyRef.current = true;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    markDirty();
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // 후기: 내용 안에서 @선수 멘션 자동완성 + 음영 하이라이트
  const allPlayers = participants.flatMap((g) => g.players);
  const mentionActive = form.category === '후기' && allPlayers.length > 0;

  const handleContentChange = (e) => {
    const val = e.target.value;
    const caret = e.target.selectionStart;
    markDirty();
    setForm((prev) => ({ ...prev, content: val }));

    if (form.category === '후기' && allPlayers.length) {
      const m = val.slice(0, caret).match(/@([^\s@]{0,20})$/);
      if (m) {
        setMention({ open: true, query: m[1], start: caret - m[0].length });
        return;
      }
    }
    if (mention.open) setMention({ open: false, query: '', start: -1 });
  };

  const mentionList =
    mention.open && mention.query !== null
      ? allPlayers.filter((p) => p.name.includes(mention.query)).slice(0, 6)
      : [];

  const insertMention = (p) => {
    markDirty();
    const val = form.content;
    const before = val.slice(0, mention.start);
    const after = val.slice(mention.start + 1 + mention.query.length); // '@query' 제거
    const inserted = `@${p.name} `;
    const next = `${before}${inserted}${after}`;
    setForm((prev) => ({ ...prev, content: next }));
    setMention({ open: false, query: '', start: -1 });
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (el) {
        const pos = (before + inserted).length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  // 파일 → base64 (이미지/일반 파일 공통)
  const readAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAddFiles = async (e, kind) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    markDirty();
    for (const file of files) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toastError(t(`${file.name}: ${MAX_FILE_MB}MB 이하만 첨부할 수 있어요.`, `${file.name}: max ${MAX_FILE_MB}MB.`));
        continue;
      }
      try {
        const url = await readAsDataURL(file);
        setAttachments((prev) => [
          ...prev,
          { type: kind, url, name: file.name, size: file.size },
        ]);
      } catch {
        toastError(t('파일 처리 중 오류가 발생했어요.', 'Failed to process file.'));
      }
    }
  };

  const removeAttachment = (idx) => {
    markDirty();
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // 링크
  const updateLink = (idx, value) => {
    markDirty();
    setLinks((prev) => prev.map((l, i) => (i === idx ? value : l)));
  };
  const addLink = () => setLinks((prev) => [...prev, '']);
  const removeLink = (idx) => setLinks((prev) => prev.filter((_, i) => i !== idx));

  // 투표
  const togglePoll = () => {
    markDirty();
    setPoll((prev) => ({ ...prev, enabled: !prev.enabled }));
  };
  const updatePollOption = (optId, text) => {
    markDirty();
    setPoll((prev) => ({
      ...prev,
      options: prev.options.map((o) => (o.id === optId ? { ...o, text } : o)),
    }));
  };
  const addPollOption = () =>
    setPoll((prev) => ({ ...prev, options: [...prev.options, { id: genId(), text: '' }] }));
  const removePollOption = (optId) =>
    setPoll((prev) => ({ ...prev, options: prev.options.filter((o) => o.id !== optId) }));

  const restoreDraft = () => {
    setForm({
      title: savedDraft.title || '',
      content: savedDraft.content || '',
      category: savedDraft.category || '자유',
      send_push: !!savedDraft.send_push,
      match_id: savedDraft.match_id || '',
    });
    if (Array.isArray(savedDraft.links) && savedDraft.links.length) setLinks(savedDraft.links);
    if (savedDraft.poll) setPoll(savedDraft.poll);
    setSavedAt(savedDraft.savedAt || null);
    setSavedDraft(null);
  };

  const discardDraft = () => {
    localStorage.removeItem(draftKey);
    setSavedDraft(null);
    setSavedAt(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toastError(t('제목과 내용을 입력해주세요.', 'Please enter title and content.'));
      return;
    }
    if (form.title.trim().length > 100) {
      toastError(t('제목은 100자 이하로 입력해주세요.', 'Title must be 100 characters or fewer.'));
      return;
    }

    const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
    let pollPayload = null;
    if (poll.enabled) {
      const opts = poll.options.filter((o) => o.text.trim()).map((o) => ({ id: o.id, text: o.text.trim() }));
      if (opts.length < 2) {
        toastError(t('투표는 항목이 2개 이상이어야 해요.', 'A poll needs at least 2 options.'));
        return;
      }
      pollPayload = { question: poll.question.trim(), allowMulti: poll.allowMulti, anonymous: poll.anonymous, options: opts };
    }

    // 후기: 내용에서 @언급된 선수를 태그로 추출
    let playerNotesPayload = [];
    if (form.category === '후기') {
      const seen = new Set();
      playerNotesPayload = allPlayers
        .filter((p) => {
          if (seen.has(p.key)) return false;
          const hit = form.content.includes(`@${p.name}`);
          if (hit) seen.add(p.key);
          return hit;
        })
        .map((p) => ({ user_id: p.user_id, name: p.name, squad_label: p.squad, comment: '' }));
    }

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      send_push: form.category === '공지' ? form.send_push : false,
      match_id: form.category === '후기' ? form.match_id || null : null,
      attachments,
      links: cleanLinks,
      poll: pollPayload,
      player_notes: playerNotesPayload,
    };

    setLoading(true);
    try {
      const method = id ? 'put' : 'post';
      const url = id ? `/team/boards/${id}` : '/team/boards';
      const res = await apiRequest(method, url, payload);
      if (res?.success) {
        localStorage.removeItem(draftKey);
        toastSuccess(res.message || t('저장되었습니다.', 'Saved successfully.'));
        navigate('/locker-room/team-board');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      toastError(error?.response?.data?.message || t('저장 중 오류가 발생했습니다.', 'Failed to save.'));
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString(language === 'KR' ? 'ko-KR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const fmtMatch = (m) => {
    const d = new Date(m.match_date);
    return `${d.getMonth() + 1}/${d.getDate()} ${m.title}`;
  };

  // 최근 5개만 노출 (이미 연결된 경기가 5개 밖이면 유지)
  const recentMatches = matches.slice(0, 5);
  const matchOptions =
    form.match_id && !recentMatches.some((m) => String(m.id) === String(form.match_id))
      ? [...recentMatches, ...matches.filter((m) => String(m.id) === String(form.match_id))]
      : recentMatches;

  const categoryOptions = BOARD_CATEGORIES.filter((c) => !c.adminOnly || canManage);
  const images = attachments.filter((a) => a.type === 'image');
  const files = attachments.filter((a) => a.type === 'file');

  return (
    <div className="board-form-page">
      <div className="container">
        <h1 className="page-title">
          {id ? t('게시글 수정', 'Edit Post') : t('게시글 작성', 'Write Post')}
          <span className="page-subtitle">
            {savedAt
              ? t(`${fmtTime(savedAt)} 임시저장됨`, `Draft saved ${fmtTime(savedAt)}`)
              : t('작성 중 내용은 자동 임시저장돼요', 'Your draft is auto-saved')}
          </span>
        </h1>

        {savedDraft && (
          <div className="draft-banner">
            <span className="draft-msg">
              💾{' '}
              {t(
                `임시저장된 내용이 있어요${savedDraft.savedAt ? ` (${fmtTime(savedDraft.savedAt)})` : ''}`,
                `You have a saved draft${savedDraft.savedAt ? ` (${fmtTime(savedDraft.savedAt)})` : ''}`
              )}
            </span>
            <div className="draft-actions">
              <button type="button" className="btn-draft restore" onClick={restoreDraft}>
                {t('이어쓰기', 'Restore')}
              </button>
              <button type="button" className="btn-draft discard" onClick={discardDraft}>
                {t('삭제', 'Discard')}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="board-form">
          {/* 말머리 */}
          <div className="form-group">
            <label>{t('분류', 'Category')}</label>
            <div className="category-chips">
              {categoryOptions.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  className={`cat-chip ${form.category === c.value ? 'active' : ''}`}
                  style={form.category === c.value ? { background: c.color, borderColor: c.color } : undefined}
                  onClick={() => {
                    markDirty();
                    // 후기가 아니면 경기 연결 해제
                    setForm((prev) => ({
                      ...prev,
                      category: c.value,
                      match_id: c.value === '후기' ? prev.match_id : '',
                    }));
                  }}
                >
                  {c.value}
                </button>
              ))}
            </div>
          </div>

          {/* 공지 푸시 발송 */}
          {form.category === '공지' && (
            <div className="form-group notice-toggle">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="send_push"
                  checked={form.send_push}
                  onChange={handleChange}
                />
                <span>{t('작성 시 팀원에게 푸시 알림 발송', 'Send push notification to members')}</span>
              </label>
            </div>
          )}

          {/* 경기 연결 (후기 전용, 제목 위 · 최근 경기 순) */}
          {form.category === '후기' && (
            <div className="form-group">
              <label>{t('경기 연결', 'Link a match')}</label>
              <select name="match_id" value={form.match_id} onChange={handleChange} className="form-input">
                <option value="">{t('연결 안 함', 'None')}</option>
                {matchOptions.map((m) => (
                  <option key={m.id} value={m.id}>{fmtMatch(m)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="label-row">
              <span>{t('제목', 'Title')}</span>
              <span className={`char-count${form.title.length >= 100 ? ' max' : ''}`}>
                {form.title.length}/100
              </span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={100}
              placeholder={t('제목을 입력하세요', 'Enter title')}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>{t('내용', 'Content')}</label>
            <div className={`content-wrap${mentionActive ? ' highlighting' : ''}`}>
              {mentionActive && (
                <div className="ta-backdrop" ref={backdropRef} aria-hidden="true">
                  {highlightNodes(form.content, allPlayers.map((p) => p.name))}
                  {'\n'}
                </div>
              )}
              <textarea
                ref={contentRef}
                name="content"
                value={form.content}
                onChange={handleContentChange}
                onScroll={(e) => {
                  if (backdropRef.current) backdropRef.current.scrollTop = e.target.scrollTop;
                }}
                onBlur={() => setTimeout(() => setMention((m) => ({ ...m, open: false })), 150)}
                placeholder={
                  form.category === '후기' && form.match_id
                    ? t('내용을 입력하세요. @로 선수를 언급할 수 있어요', 'Write content. Type @ to mention a player')
                    : t('내용을 입력하세요', 'Enter content')
                }
                className="form-textarea"
                rows={10}
              />
              {mention.open && mentionList.length > 0 && (
                <ul className="mention-list">
                  {mentionList.map((p) => (
                    <li key={p.key}>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); insertMention(p); }}>
                        <span className="ml-name">@{p.name}</span>
                        {p.squad && <span className="ml-squad">{p.squad}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {form.category === '후기' && form.match_id && (
              <small className="field-hint">
                {t('내용에 @이름 으로 참석 선수를 언급하면 코멘트로 연결돼요.', 'Mention attendees with @name in the content.')}
              </small>
            )}
          </div>

          {/* 이미지 첨부 */}
          <div className="form-group">
            <label>{t('이미지 첨부', 'Images')}</label>
            <div className="attach-grid">
              {images.map((img) => (
                <div key={attachments.indexOf(img)} className="attach-thumb">
                  <img src={img.url} alt={img.name} />
                  <button type="button" onClick={() => removeAttachment(attachments.indexOf(img))}>×</button>
                </div>
              ))}
              <label className="attach-add">
                +
                <input type="file" accept="image/*" multiple hidden onChange={(e) => handleAddFiles(e, 'image')} />
              </label>
            </div>
          </div>

          {/* 파일 첨부 */}
          <div className="form-group">
            <label>{t('파일 첨부', 'Files')}</label>
            <div className="file-list">
              {files.map((f) => (
                <div key={attachments.indexOf(f)} className="file-row">
                  <span className="file-name">📎 {f.name}</span>
                  <span className="file-size">{Math.round(f.size / 1024)}KB</span>
                  <button type="button" onClick={() => removeAttachment(attachments.indexOf(f))}>×</button>
                </div>
              ))}
              <label className="file-add">
                {t('＋ 파일 선택', '＋ Add file')}
                <input type="file" multiple hidden onChange={(e) => handleAddFiles(e, 'file')} />
              </label>
            </div>
          </div>

          {/* 링크 임베드 */}
          <div className="form-group">
            <label>{t('링크', 'Links')}</label>
            {links.map((link, idx) => (
              <div key={idx} className="link-row">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => updateLink(idx, e.target.value)}
                  placeholder="https://..."
                  className="form-input"
                />
                {links.length > 1 && (
                  <button type="button" className="row-remove" onClick={() => removeLink(idx)}>×</button>
                )}
              </div>
            ))}
            <button type="button" className="row-add" onClick={addLink}>
              {t('＋ 링크 추가', '＋ Add link')}
            </button>
          </div>

          {/* 투표 */}
          <div className="form-group poll-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={poll.enabled} onChange={togglePoll} />
              <span>{t('투표 추가', 'Add a poll')}</span>
            </label>
            {poll.enabled && (
              <div className="poll-builder">
                <input
                  type="text"
                  value={poll.question}
                  onChange={(e) => {
                    markDirty();
                    setPoll((prev) => ({ ...prev, question: e.target.value }));
                  }}
                  placeholder={t('투표 질문', 'Poll question')}
                  className="form-input"
                />
                {poll.options.map((o) => (
                  <div key={o.id} className="link-row">
                    <input
                      type="text"
                      value={o.text}
                      onChange={(e) => updatePollOption(o.id, e.target.value)}
                      placeholder={t('항목', 'Option')}
                      className="form-input"
                    />
                    {poll.options.length > 2 && (
                      <button type="button" className="row-remove" onClick={() => removePollOption(o.id)}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" className="row-add" onClick={addPollOption}>
                  {t('＋ 항목 추가', '＋ Add option')}
                </button>
                <label className="checkbox-label small">
                  <input
                    type="checkbox"
                    checked={poll.allowMulti}
                    onChange={(e) => {
                      markDirty();
                      setPoll((prev) => ({ ...prev, allowMulti: e.target.checked }));
                    }}
                  />
                  <span>{t('복수 선택 허용', 'Allow multiple choices')}</span>
                </label>
                <label className="checkbox-label small">
                  <input
                    type="checkbox"
                    checked={poll.anonymous}
                    onChange={(e) => {
                      markDirty();
                      setPoll((prev) => ({ ...prev, anonymous: e.target.checked }));
                    }}
                  />
                  <span>{t('익명 투표 (투표자 공개 안 함)', 'Anonymous (hide voters)')}</span>
                </label>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/locker-room/team-board')}
              className="btn btn-secondary"
              disabled={loading}
            >
              {t('취소', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('저장 중...', 'Saving...') : t('저장', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BoardForm;
