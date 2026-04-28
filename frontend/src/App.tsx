import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import './index.css';

// --- Components ---
const Toast = ({ message, show }: { message: string, show: boolean }) => (
  <div id="toast" className={show ? 'show' : ''}>{message}</div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [toast, setToast] = useState({ show: false, message: '' });

  // Auth States
  const [authErr, setAuthErr] = useState('');

  // App Data
  const [feeds, setFeeds] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        });
      } else {
        setUser(null);
      }
    });

    // 리디렉션 로그인 결과 확인
    getRedirectResult(auth).catch((err) => {
      if (err.code === 'auth/unauthorized-domain') {
        setAuthErr('허용되지 않은 도메인입니다.');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) loadAll();
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

  const handleLogout = () => signOut(auth);

  const handleGoogleLogin = async () => {
    try {
      setAuthErr('');
      const provider = new GoogleAuthProvider();
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (err: any) {
      setAuthErr('구글 로그인 실패: ' + err.message);
    }
  };

  const fetchFeeds = async () => {
    const q = query(collection(db, 'feeds'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setFeeds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchMemories = async () => {
    const q = query(collection(db, 'memories'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setMemories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchGoals = async () => {
    const q = query(collection(db, 'goals'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchBooks = async () => {
    const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // --- Panels ---

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
          const sRef = ref(storage, `feeds/${user.uid}/${Date.now()}_${f.name}`);
          const snap = await uploadBytes(sRef, f);
          const url = await getDownloadURL(snap.ref);
          photoUrls.push(url);
        }
        await addDoc(collection(db, 'feeds'), {
          text, tag, photos: photoUrls,
          authorId: user.uid, authorName: user.displayName || user.email,
          createdAt: serverTimestamp(), likes: [], comments: []
        });
        setText(''); setPhotos([]);
        showToast('✅ 피드에 올렸어!');
        fetchFeeds();
      } catch (e) { showToast('오류 발생'); }
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
          const sRef = ref(storage, `memory/${user.uid}/${Date.now()}_${photo.name}`);
          const snap = await uploadBytes(sRef, photo);
          photoUrl = await getDownloadURL(snap.ref);
        }
        await addDoc(collection(db, 'memories'), {
          text, toName: toName || '친구', type, photoUrl,
          authorId: user.uid, authorName: user.displayName || user.email,
          createdAt: serverTimestamp()
        });
        setText(''); setToName(''); setPhoto(null);
        showToast('💌 메시지 남겼어!');
        fetchMemories();
      } catch (e) { showToast('오류 발생'); }
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
      await addDoc(collection(db, 'goals'), {
        title, authorId: user.uid, authorName: user.displayName || user.email,
        subGoals: subGoal ? [{ text: subGoal, done: false }] : [],
        createdAt: serverTimestamp()
      });
      setTitle(''); setSubGoal(''); setShowForm(false); fetchGoals();
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
        {goals.map(g => <GoalCard key={g.id} goal={g} isMe={g.authorId === user.uid} refresh={fetchGoals} />)}
      </div>
    );
  };

  const BookPanel = () => {
    const [text, setText] = useState('');
    const [status, setStatus] = useState('done');

    const postBook = async () => {
      if (!text) return showToast('내용 입력');
      await addDoc(collection(db, 'books'), {
        text, status, authorId: user.uid, authorName: user.displayName || user.email,
        createdAt: serverTimestamp()
      });
      setText(''); fetchBooks();
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
        <div className="auth-sub" style={{ marginBottom: '30px' }}>친구와 함께하는 소중한 기록</div>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <button 
            className="btn-primary" 
            style={{ 
              background: 'white', 
              color: 'var(--ink)', 
              border: '0.5px solid var(--border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              padding: '16px'
            }}
            onClick={handleGoogleLogin}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '20px' }} />
            구글 계정으로 시작하기
          </button>
          <div className="auth-err" style={{ marginTop: '15px' }}>{authErr}</div>
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
        {['feed', 'memory', 'goals', 'books'].map(t => <button key={t} className={`tb ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t === 'feed' ? '🌿피드' : t === 'memory' ? '💌메시지' : t === 'goals' ? '🎯목표' : '📚독서'}</button>)}
      </div>
      <div className="content-area">
        {activeTab === 'feed' && <FeedPanel />}
        {activeTab === 'memory' && <MemoryPanel />}
        {activeTab === 'goals' && <GoalPanel />}
        {activeTab === 'books' && <BookPanel />}
      </div>
      <Toast message={toast.message} show={toast.show} />
    </div>
  );
};

// --- Helper Components ---

const FeedCard = ({ feed, currentUser, refresh }: any) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const likes = feed.likes || [];
  const liked = likes.includes(currentUser.uid);

  const toggleLike = async () => {
    const ref = doc(db, 'feeds', feed.id);
    await updateDoc(ref, { likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
    refresh();
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    const ref = doc(db, 'feeds', feed.id);
    await updateDoc(ref, { 
      comments: arrayUnion({ 
        text: commentText, authorId: currentUser.uid, 
        authorName: currentUser.displayName || currentUser.email, 
        createdAt: new Date().toISOString() 
      }) 
    });
    setCommentText(''); refresh();
  };

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
        <button className={`fc-action-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}>{liked ? '❤️' : '🤍'} {likes.length}</button>
        <button className="fc-action-btn" onClick={() => setShowComments(!showComments)}>💬 댓글 {feed.comments?.length}</button>
      </div>
      {showComments && (
        <div className="fc-comments">
          {feed.comments?.map((c: any, i: number) => <div key={i} className="comment"><div className="comment-body"><b>{c.authorName}</b>: {c.text}</div></div>)}
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

const GoalCard = ({ goal, isMe, refresh }: any) => {
  const [newSub, setNewSub] = useState('');
  const subs = goal.subGoals || [];
  const pct = subs.length > 0 ? Math.round(subs.filter((s: any) => s.done).length / subs.length * 100) : 0;

  const toggleSub = async (idx: number) => {
    const newSubs = [...subs];
    newSubs[idx].done = !newSubs[idx].done;
    await updateDoc(doc(db, 'goals', goal.id), { subGoals: newSubs });
    refresh();
  };

  const addSub = async () => {
    if (!newSub) return;
    await updateDoc(doc(db, 'goals', goal.id), { subGoals: arrayUnion({ text: newSub, done: false }) });
    setNewSub(''); refresh();
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
