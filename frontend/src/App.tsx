import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { 
  ref, 
  set, 
  push, 
  get, 
  update, 
  child, 
  serverTimestamp, 
  remove
} from 'firebase/database';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, rdb, storage } from './firebase';
import './index.css';

// --- Components ---
const Toast = ({ message, show }: { message: string, show: boolean }) => (
  <div id="toast" className={show ? 'show' : ''}>{message}</div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isLoginView, setIsLoginView] = useState(true);

  // Auth Inputs
  const [authEmail, setAuthEmail] = useState('');
  const [authPw, setAuthPw] = useState('');
  const [authName, setAuthName] = useState('');
  const [authErr, setAuthErr] = useState('');

  // App Data
  const [feeds, setFeeds] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const MASTER_ADMIN_EMAIL = 'jjy060503jjy@gmail.com'; 

        try {
          const userSnap = await get(child(ref(rdb), `users/${currentUser.uid}`));
          let role = 'member';
          
          if (userSnap.exists()) {
            role = userSnap.val().role || 'member';
          } else {
            role = (currentUser.email === MASTER_ADMIN_EMAIL) ? 'admin' : 'member'; 
            await set(ref(rdb, `users/${currentUser.uid}`), {
              name: currentUser.displayName || '이름없음',
              email: currentUser.email,
              role: role,
              createdAt: serverTimestamp()
            });
          }

          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: role
          });
        } catch (error) {
          console.error("사용자 정보 로드 중 에러:", error);
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: 'member'
          });
        }
      } else {
        setUser(null);
      }
    });

    getRedirectResult(auth).catch((err) => {
      console.error("리디렉션 에러:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setAuthErr('허용되지 않은 도메인입니다.');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadAll();
      if (user.role === 'admin') fetchAllUsers();
    }
  }, [user, activeTab]);

  const loadAll = () => {
    if (activeTab === 'feed') fetchFeeds();
    if (activeTab === 'memory') fetchMemories();
    if (activeTab === 'goals') fetchGoals();
    if (activeTab === 'books') fetchBooks();
  };

  const showToast = (msg: string) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2200);
  };

  const handleLogin = async () => {
    try {
      setAuthErr('');
      await signInWithEmailAndPassword(auth, authEmail, authPw);
    } catch (err: any) {
      setAuthErr('로그인 실패: 이메일이나 비밀번호를 확인하세요.');
    }
  };

  const handleSignup = async () => {
    try {
      setAuthErr('');
      if (!authName) return setAuthErr('닉네임을 입력해주세요.');
      const cred = await createUserWithEmailAndPassword(auth, authEmail, authPw);
      await updateProfile(cred.user, { displayName: authName });
      
      await set(ref(rdb, `users/${cred.user.uid}`), {
        name: authName,
        email: authEmail,
        role: 'member',
        createdAt: serverTimestamp()
      });
      
    } catch (err: any) {
      setAuthErr('회원가입 실패: ' + err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleGoogleLogin = async () => {
    try {
      setAuthErr('');
      const provider = new GoogleAuthProvider();
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        const cred = await signInWithPopup(auth, provider);
        const userSnap = await get(child(ref(rdb), `users/${cred.user.uid}`));
        if (!userSnap.exists()) {
          await set(ref(rdb, `users/${cred.user.uid}`), {
            name: cred.user.displayName,
            email: cred.user.email,
            role: 'member',
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err: any) {
      setAuthErr('구글 로그인 실패: ' + err.message);
    }
  };

  const fetchFeeds = async () => {
    try {
      console.log("피드 가져오는 중...");
      const snap = await get(ref(rdb, 'feeds'));
      if (snap.exists()) {
        const data = snap.val();
        console.log("데이터 확인:", data);
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setFeeds(list.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)));
      } else {
        console.log("데이터가 없습니다.");
        setFeeds([]);
      }
    } catch (error) {
      console.error("피드 로드 실패:", error);
    }
  };

  const fetchMemories = async () => {
    try {
      const snap = await get(ref(rdb, 'memories'));
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setMemories(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      } else {
        setMemories([]);
      }
    } catch (error) {
      console.error("메시지 로드 실패:", error);
    }
  };

  const fetchGoals = async () => {
    try {
      const snap = await get(ref(rdb, 'goals'));
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setGoals(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      } else {
        setGoals([]);
      }
    } catch (error) {
      console.error("목표 로드 실패:", error);
    }
  };

  const fetchBooks = async () => {
    try {
      const snap = await get(ref(rdb, 'books'));
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setBooks(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      } else {
        setBooks([]);
      }
    } catch (error) {
      console.error("독서기록 로드 실패:", error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const snap = await get(ref(rdb, 'users'));
      if (snap.exists()) {
        const data = snap.val();
        setAllUsers(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      }
    } catch (error) {
      console.error("사용자 목록 로드 실패:", error);
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      await update(ref(rdb, `users/${userId}`), { role: newRole });
      showToast('역할이 변경되었습니다.');
      fetchAllUsers();
    } catch (e) {
      showToast('권한 변경 실패');
    }
  };

  // --- Panels ---

  const AdminPanel = () => (
    <div className={`tab-panel ${activeTab === 'admin' ? 'active' : ''}`}>
      <div className="section-label">사용자 권한 관리</div>
      {allUsers.map(u => (
        <div key={u.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{u.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--ink3)' }}>{u.email}</div>
          </div>
          <select 
            value={u.role} 
            onChange={(e) => changeUserRole(u.id, e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}
          >
            <option value="member">멤버</option>
            <option value="admin">관리자</option>
            <option value="guest">게스트</option>
          </select>
        </div>
      ))}
    </div>
  );

  const FeedPanel = () => {
    const [text, setText] = useState('');
    const [tag, setTag] = useState('daily');
    const [photos, setPhotos] = useState<File[]>([]);
    const [isPosting, setIsPosting] = useState(false);

    const postFeed = async () => {
      if (!text && photos.length === 0) return showToast('내용을 입력해주세요');
      setIsPosting(true);
      try {
        const photoUrls = [];
        for (const f of photos) {
          const storageRef = sRef(storage, `feeds/${user.uid}/${Date.now()}_${f.name}`);
          const snap = await uploadBytes(storageRef, f);
          const url = await getDownloadURL(snap.ref);
          photoUrls.push(url);
        }
        const newFeedRef = push(ref(rdb, 'feeds'));
        await set(newFeedRef, {
          text, tag, photos: photoUrls,
          authorId: user.uid, authorName: user.displayName || user.email || '익명',
          createdAt: serverTimestamp(), likes: {}, comments: {}
        });
        setText(''); setPhotos([]);
        showToast('✅ 피드에 올렸어!');
        fetchFeeds();
      } catch (e) { 
        console.error("피드 저장 에러:", e);
        showToast('저장 실패. 보안 규칙을 확인하세요.'); 
      }
      setIsPosting(false);
    };

    return (
      <div className={`tab-panel ${activeTab === 'feed' ? 'active' : ''}`}>
        <div className="kw-banner">
          <div><div className="kw-label">이달의 키워드</div><div className="kw-words"><span className="kw-word">성장</span><span className="kw-vs">×</span><span className="kw-word">여유</span></div></div>
        </div>
        <div className="write-box">
          <textarea placeholder="오늘 어떤 하루였어? ✍️" value={text} onChange={e => setText(e.target.value)} />
          <div className="photo-row">
            {photos.map((p, i) => <img key={i} className="photo-preview" src={URL.createObjectURL(p)} alt="p" />)}
            <label htmlFor="photo-input" className="photo-add">+</label>
          </div>
          <input type="file" id="photo-input" multiple onChange={e => setPhotos(Array.from(e.target.files || []).slice(0, 3))} />
          <div className="write-footer">
            {['daily', 'thought', 'photo'].map(t => <button key={t} className={`tag-chip ${tag === t ? 'sel' : ''}`} onClick={() => setTag(t)}>{t==='daily'?'일상':t==='thought'?'생각':'사진'}</button>)}
            <button className="post-btn" onClick={postFeed} disabled={isPosting}>{isPosting ? '올리는 중...' : '올리기'}</button>
          </div>
        </div>
        <div className="section-label">최근 기록</div>
        <div id="feed-list">
          {feeds.length === 0 ? <div className="empty">기록이 없어요.</div> : feeds.map(f => <FeedCard key={f.id} feed={f} currentUser={user} refresh={fetchFeeds} />)}
        </div>
      </div>
    );
  };

  const MemoryPanel = () => {
    const [text, setText] = useState('');
    const [toName, setToName] = useState('');
    const [type, setType] = useState('msg');
    const [photo, setPhoto] = useState<File | null>(null);
    const [isPosting, setIsPosting] = useState(false);

    const postMemory = async () => {
      if (!text && !photo) return showToast('내용을 입력해주세요');
      setIsPosting(true);
      try {
        let photoUrl = null;
        if (photo) {
          const storageRef = sRef(storage, `memory/${user.uid}/${Date.now()}_${photo.name}`);
          const snap = await uploadBytes(storageRef, photo);
          photoUrl = await getDownloadURL(snap.ref);
        }
        const newMemoryRef = push(ref(rdb, 'memories'));
        await set(newMemoryRef, {
          text, toName: toName || '친구', type, photoUrl,
          authorId: user.uid, authorName: user.displayName || user.email || '익명',
          createdAt: serverTimestamp()
        });
        setText(''); setToName(''); setPhoto(null);
        showToast('💌 메시지 남겼어!');
        fetchMemories();
      } catch (e) { 
        console.error("메시지 저장 에러:", e);
        showToast('저장 실패'); 
      }
      setIsPosting(false);
    };

    return (
      <div className={`tab-panel ${activeTab === 'memory' ? 'active' : ''}`}>
        <div className="write-box">
          <div className="type-select">
            {['msg', 'memory', 'advice', 'cheer'].map(t => <button key={t} className={`type-btn ${type === t ? 'sel' : ''}`} onClick={() => setType(t)}>{t==='msg'?'💬 말':'📸 추억'}</button>)}
          </div>
          <textarea placeholder="남기고 싶은 말..." style={{ minHeight: '90px' }} value={text} onChange={e => setText(e.target.value)} />
          <div className="photo-row">
            {photo && <img className="photo-preview" src={URL.createObjectURL(photo)} alt="p" />}
            <label htmlFor="mem-photo-input" className="photo-add">+</label>
          </div>
          <input type="file" id="mem-photo-input" onChange={e => setPhoto(e.target.files?.[0] || null)} />
          <div className="write-footer">
            <input className="tag-chip" placeholder="To. 닉네임" value={toName} onChange={e => setToName(e.target.value)} />
            <button className="post-btn" onClick={postMemory} disabled={isPosting}>남기기</button>
          </div>
        </div>
        <div id="memory-list">{memories.map(m => <MemoryCard key={m.id} memory={m} currentUser={user} />)}</div>
      </div>
    );
  };

  const GoalPanel = () => {
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [subGoal, setSubGoal] = useState('');

    const addGoal = async () => {
      if (!title) return showToast('목표를 입력하세요');
      try {
        const newGoalRef = push(ref(rdb, 'goals'));
        await set(newGoalRef, {
          title, authorId: user.uid, authorName: user.displayName || user.email || '익명',
          subGoals: subGoal ? [{ text: subGoal, done: false }] : [],
          createdAt: serverTimestamp()
        });
        setTitle(''); setSubGoal(''); setShowForm(false); fetchGoals();
        showToast('🎯 목표 추가!');
      } catch (e) {
        console.error("목표 저장 에러:", e);
        showToast('저장 실패');
      }
    };

    return (
      <div className={`tab-panel ${activeTab === 'goals' ? 'active' : ''}`}>
        <button className="post-btn" style={{ width: '100%', marginBottom: '16px' }} onClick={() => setShowForm(!showForm)}>+ 목표 추가</button>
        {showForm && (
          <div className="add-goal-form">
            <input className="add-goal-inp" placeholder="목표 이름" value={title} onChange={e => setTitle(e.target.value)} />
            <input className="add-goal-inp" placeholder="첫 세부 목표" value={subGoal} onChange={e => setSubGoal(e.target.value)} />
            <button className="btn-save" onClick={addGoal}>저장</button>
          </div>
        )}
        {goals.map(g => <GoalCard key={g.id} goal={g} isMe={g.authorId === user.uid} refresh={fetchGoals} rdb={rdb} />)}
      </div>
    );
  };

  const BookPanel = () => {
    const [text, setText] = useState('');
    const [status, setStatus] = useState('done');

    const postBook = async () => {
      if (!text) return showToast('내용 입력');
      try {
        const newBookRef = push(ref(rdb, 'books'));
        await set(newBookRef, {
          text, status, authorId: user.uid, authorName: user.displayName || user.email || '익명',
          createdAt: serverTimestamp()
        });
        setText(''); fetchBooks();
        showToast('📚 책장에 추가!');
      } catch (e) {
        console.error("독서기록 저장 에러:", e);
        showToast('저장 실패');
      }
    };

    return (
      <div className={`tab-panel ${activeTab === 'books' ? 'active' : ''}`}>
        <div className="write-box">
          <textarea placeholder="독서 기록..." value={text} onChange={e => setText(e.target.value)} />
          <div className="write-footer">
            {['done', 'reading', 'want'].map(s => <button key={s} className={`tag-chip ${status === s ? 'sel' : ''}`} onClick={() => setStatus(s)}>{s==='done'?'완독':'중'}</button>)}
            <button className="post-btn" onClick={postBook}>기록</button>
          </div>
        </div>
        <div id="book-list">
          {books.map(b => (
            <div key={b.id} className="card">
              <b>{b.authorName}</b>: {b.text} ({b.status})
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div id="auth-screen">
        <div className="auth-logo">우리의 공간 ✦</div>
        <div className="auth-sub">친구와 함께하는 소중한 기록</div>
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab ${isLoginView ? 'active' : ''}`} onClick={() => setIsLoginView(true)}>로그인</button>
            <button className={`auth-tab ${!isLoginView ? 'active' : ''}`} onClick={() => setIsLoginView(false)}>회원가입</button>
          </div>
          <input className="inp" placeholder="이메일" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
          {!isLoginView && <input className="inp" placeholder="닉네임" value={authName} onChange={e => setAuthName(e.target.value)} />}
          <input className="inp" type="password" placeholder="비밀번호" value={authPw} onChange={e => setAuthPw(e.target.value)} />
          <button className="btn-primary" onClick={isLoginView ? handleLogin : handleSignup}>{isLoginView ? '로그인' : '가입하기'}</button>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--ink3)', fontSize: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            <span style={{ margin: '0 10px' }}>또는</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          </div>
          
          <button 
            className="btn-primary" 
            style={{ 
              background: 'white', 
              color: 'var(--ink)', 
              border: '0.5px solid var(--border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px' 
            }}
            onClick={handleGoogleLogin}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '18px' }} />
            구글로 계속하기
          </button>
          <div className="auth-err">{authErr}</div>
        </div>
      </div>
    );
  }

  return (
    <div id="app">
      <div className="app-header">
        <div className="app-title">우리의 공간 ✦</div>
        <div className="header-user">
          <div className="user-av">{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
          <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
        </div>
      </div>
      <div className="tab-bar">
        {['feed', 'memory', 'goals', 'books'].map(t => (
          <button key={t} className={`tb ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'feed' ? '🌿피드' : t === 'memory' ? '💌메시지' : t === 'goals' ? '🎯목표' : '📚독서'}
          </button>
        ))}
        {user.role === 'admin' && (
          <button className={`tb ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            ⚙️관리
          </button>
        )}
      </div>
      <div className="content-area">
        {activeTab === 'feed' && <FeedPanel />}
        {activeTab === 'memory' && <MemoryPanel />}
        {activeTab === 'goals' && <GoalPanel />}
        {activeTab === 'books' && <BookPanel />}
        {activeTab === 'admin' && user.role === 'admin' && <AdminPanel />}
      </div>
      <Toast message={toast.message} show={toast.show} />
    </div>
  );
};

// --- Helper Components ---

const FeedCard = ({ feed, currentUser, refresh }: any) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const likesObj = feed.likes || {};
  const likesCount = Object.keys(likesObj).length;
  const liked = !!likesObj[currentUser.uid];

  const toggleLike = async () => {
    try {
      const feedRef = ref(rdb, `feeds/${feed.id}/likes/${currentUser.uid}`);
      if (liked) {
        await remove(feedRef);
      } else {
        await set(feedRef, true);
      }
      refresh();
    } catch (e) {
      console.error("좋아요 에러:", e);
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    try {
      const commentRef = push(ref(rdb, `feeds/${feed.id}/comments`));
      await set(commentRef, { 
        text: commentText, authorId: currentUser.uid, 
        authorName: currentUser.displayName || currentUser.email, 
        createdAt: serverTimestamp()
      });
      setCommentText(''); refresh();
    } catch (e) {
      console.error("댓글 에러:", e);
    }
  };

  const commentsObj = feed.comments || {};
  const commentsList = Object.keys(commentsObj).map(k => ({ id: k, ...commentsObj[k] }));

  return (
    <div className="feed-card">
      <div className="fc-header">
        <div className={`av ${feed.authorId === currentUser.uid ? 'av-me' : 'av-other'}`}>{feed.authorName?.[0]}</div>
        <span className="fc-name">{feed.authorName}</span>
      </div>
      {feed.photos?.length > 0 && (
        <div className="fc-photos one">
          {feed.photos.map((u: string, i: number) => <img key={i} src={u} alt="f" />)}
        </div>
      )}
      <div className="fc-text">{feed.text}</div>
      <div className="fc-actions">
        <button className={`fc-action-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}>{liked ? '❤️' : '🤍'} {likesCount}</button>
        <button className="fc-action-btn" onClick={() => setShowComments(!showComments)}>💬 댓글 {commentsList.length}</button>
      </div>
      {showComments && (
        <div className="fc-comments">
          {commentsList.map((c: any) => <div key={c.id} className="comment"><div className="comment-body"><b>{c.authorName}</b>: {c.text}</div></div>)}
          <div className="comment-input-row">
            <input className="comment-input" value={commentText} onChange={e => setCommentText(e.target.value)} />
            <button className="comment-send" onClick={addComment}>↑</button>
          </div>
        </div>
      )}
    </div>
  );
};

const MemoryCard = ({ memory }: any) => (
  <div className="memory-card">
    <div className="mc-header"><b>{memory.authorName}</b> → {memory.toName}</div>
    {memory.photoUrl && <img className="mc-photo" src={memory.photoUrl} alt="m" />}
    <div className="mc-body">{memory.text}</div>
    <div className="mc-footer"><span className="mc-type type-msg">{memory.type}</span></div>
  </div>
);

const GoalCard = ({ goal, isMe, refresh, rdb }: any) => {
  const [newSub, setNewSub] = useState('');
  const subs = goal.subGoals || [];
  const pct = subs.length > 0 ? Math.round(subs.filter((s: any) => s.done).length / subs.length * 100) : 0;

  const toggleSub = async (idx: number) => {
    try {
      const newSubs = [...subs];
      newSubs[idx].done = !newSubs[idx].done;
      await update(ref(rdb, `goals/${goal.id}`), { subGoals: newSubs });
      refresh();
    } catch (e) {
      console.error("목표토글 에러:", e);
    }
  };

  const addSub = async () => {
    if (!newSub) return;
    try {
      const newSubs = [...subs, { text: newSub, done: false }];
      await update(ref(rdb, `goals/${goal.id}`), { subGoals: newSubs });
      setNewSub(''); refresh();
    } catch (e) {
      console.error("세부목표추가 에러:", e);
    }
  };

  return (
    <div className="goal-main-card">
      <div className="gmc-header">
        <div className="gmc-info"><b>{goal.authorName}</b>: {goal.title} <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }}></div></div></div>
        <div className="gmc-pct">{pct}%</div>
      </div>
      <div className="sub-goals">
        {subs.map((s: any, i: number) => <div key={i} className="sub-goal"><div className={`sub-check ${s.done ? 'done' : ''}`} onClick={() => toggleSub(i)}>{s.done ? '✓' : ''}</div>{s.text}</div>)}
        {isMe && <div className="add-sub-row"><input className="add-sub-inp" value={newSub} onChange={e => setNewSub(e.target.value)} /><button className="add-sub-btn" onClick={addSub}>+</button></div>}
      </div>
    </div>
  );
};

export default App;
