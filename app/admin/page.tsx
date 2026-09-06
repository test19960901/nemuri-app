"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<"HOME" | "PROFILE" | "VIP" | "MISSION" | "COLLECTION">("HOME");

  // Config (全体・HOME・PROFILE・VIP・COLLECTION設定)
  const [config, setConfig] = useState<any>({
    name: "百合加護ねむり",
    catchphrase: "あなたの夜にそっと寄り添う、安眠系VTuber。",
    headerImage: "",
    avatarImage: "",
    snsLinks: [
      { name: "YouTube", url: "https://youtube.com" },
      { name: "X (Twitter)", url: "https://twitter.com" }
    ],
    profileTitle: "PROFILE",
    historyTitle: "HISTORY",
    profileInfo: [
      { label: "誕生日", value: "9月1日" },
      { label: "ファンネーム", value: "ねむりんちゅ" }
    ],
    vipTitle: "サポート返礼",
    vipRewards: ["限定お礼ボイス", "デジタル会員証", "限定イラストカード"],
    goodsImages: [],
    collectionBubbleText: "ネムリンのイラストカードをコンプしよう！",
    collectionGachaPlaceholder: "合言葉を入力 (例: nemuri)",
    collectionButtonText: "ガチャをひく"
  });

  // News (HOME用)
  const [newsList, setNewsList] = useState<any[]>([]);
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsDate, setNewNewsDate] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");

  // Timeline (PROFILE用)
  const [timelineList, setTimelineList] = useState<any[]>([]);
  const [newTlDate, setNewTlDate] = useState("");
  const [newTlTitle, setNewTlTitle] = useState("");
  const [newTlMediaType, setNewTlMediaType] = useState("none");
  const [newTlMediaUrl, setNewTlMediaUrl] = useState("");
  const [newTlOrder, setNewTlOrder] = useState(1);

  // Supporters (VIP用)
  const [supportersList, setSupportersList] = useState<any[]>([]);
  const [newSupName, setNewSupName] = useState("");
  const [newSupAvatarUrl, setNewSupAvatarUrl] = useState("");
  const [newSupOrder, setNewSupOrder] = useState(1);

  // Mission
  const [mission, setMission] = useState<any>({
    title: "1st Anniversary 記念イベント",
    subTitle: "応援よろしくお願いします！",
    currentPt: 0,
    targetPt: 100000,
    rewards: [
      { step: "Step 1", reward: "新衣装ラフ公開" },
      { step: "Step 2", reward: "記念ボイス実装" }
    ]
  });

  // Cards (COLLECTION用)
  const [cards, setCards] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u && !u.isAnonymous) {
        setUser(u);
        await loadAllData();
      } else {
        setUser(null);
      }
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const loadAllData = async () => {
    try {
      // 1. Config
      const confSnap = await getDoc(doc(db, "app_config", "global"));
      if (confSnap.exists()) {
        setConfig((prev: any) => ({ ...prev, ...confSnap.data() }));
      }

      // 2. Mission
      const misSnap = await getDoc(doc(db, "mission", "main"));
      if (misSnap.exists()) {
        setMission((prev: any) => ({ ...prev, ...misSnap.data() }));
      }

      // 3. News
      const newsSnap = await getDocs(query(collection(db, "news"), orderBy("createdAt", "desc")));
      setNewsList(newsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Timeline
      const tlSnap = await getDocs(query(collection(db, "timeline"), orderBy("order", "asc")));
      setTimelineList(tlSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 5. Supporters
      const supSnap = await getDocs(query(collection(db, "supporters"), orderBy("order", "asc")));
      setSupportersList(supSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 6. Cards
      const cardsSnap = await getDocs(collection(db, "cards"));
      setCards(
        cardsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (a.cardNumber || 0) - (b.cardNumber || 0))
      );
    } catch (e) {
      console.warn("データ取得エラー:", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      alert("ログイン失敗: " + err.message);
    }
  };

  const saveConfig = async () => {
    try {
      await setDoc(doc(db, "app_config", "global"), config, { merge: true });
      alert("設定を保存しました！");
    } catch (err: any) {
      alert("保存失敗: " + err.message);
    }
  };

  const saveMission = async () => {
    try {
      await setDoc(doc(db, "mission", "main"), mission, { merge: true });
      alert("MISSION設定を保存しました！");
    } catch (err: any) {
      alert("保存失敗: " + err.message);
    }
  };

  // --- News 操作 ---
  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle || !newNewsDate) return;
    try {
      const docRef = await addDoc(collection(db, "news"), {
        title: newNewsTitle,
        date: newNewsDate,
        content: newNewsContent,
        createdAt: serverTimestamp()
      });
      setNewsList([{ id: docRef.id, title: newNewsTitle, date: newNewsDate, content: newNewsContent }, ...newsList]);
      setNewNewsTitle("");
      setNewNewsDate("");
      setNewNewsContent("");
      alert("お知らせを追加しました！");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "news", id));
    setNewsList(newsList.filter(n => n.id !== id));
  };

  // --- Timeline 操作 ---
  const handleAddTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, "timeline"), {
        date: newTlDate,
        title: newTlTitle,
        mediaType: newTlMediaType,
        mediaUrl: newTlMediaUrl,
        order: Number(newTlOrder)
      });
      setTimelineList([...timelineList, { id: docRef.id, date: newTlDate, title: newTlTitle, mediaType: newTlMediaType, mediaUrl: newTlMediaUrl, order: Number(newTlOrder) }].sort((a, b) => a.order - b.order));
      setNewTlDate("");
      setNewTlTitle("");
      setNewTlMediaUrl("");
      setNewTlOrder(prev => prev + 1);
      alert("年表項目を追加しました！");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteTimeline = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "timeline", id));
    setTimelineList(timelineList.filter(t => t.id !== id));
  };

  // --- Supporter 操作 ---
  const handleAddSupporter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, "supporters"), {
        name: newSupName,
        avatarUrl: newSupAvatarUrl,
        order: Number(newSupOrder)
      });
      setSupportersList([...supportersList, { id: docRef.id, name: newSupName, avatarUrl: newSupAvatarUrl, order: Number(newSupOrder) }].sort((a, b) => a.order - b.order));
      setNewSupName("");
      setNewSupAvatarUrl("");
      setNewSupOrder(prev => prev + 1);
      alert("サポーターを追加しました！");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteSupporter = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "supporters", id));
    setSupportersList(supportersList.filter(s => s.id !== id));
  };

  // --- ガチャカード操作 ---
  const handleAddCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("image") as HTMLInputElement;
    const directUrlInput = (form.elements.namedItem("imageUrlDirect") as HTMLInputElement)?.value;
    const file = fileInput?.files?.[0];
    const cardNumber = Number((form.elements.namedItem("cardNumber") as HTMLInputElement).value);
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const keyword = (form.elements.namedItem("keyword") as HTMLInputElement).value;

    let finalImageUrl = directUrlInput || "";

    setIsUploading(true);
    try {
      if (file) {
        const storageRef = ref(storage, `cards/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        finalImageUrl = await getDownloadURL(storageRef);
      }

      if (!finalImageUrl) {
        alert("画像ファイルを選択するか、画像URLを入力してください");
        setIsUploading(false);
        return;
      }

      const docRef = await addDoc(collection(db, "cards"), {
        cardNumber,
        title,
        keyword,
        imageUrl: finalImageUrl,
        createdAt: serverTimestamp()
      });

      setCards(prev => [...prev, { id: docRef.id, cardNumber, title, keyword, imageUrl: finalImageUrl }].sort((a, b) => a.cardNumber - b.cardNumber));
      form.reset();
      alert("カードを追加しました！");
    } catch (err: any) {
      alert("追加失敗: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm("本当にこのカードを削除しますか？")) return;
    try {
      await deleteDoc(doc(db, "cards", id));
      setCards(cards.filter(c => c.id !== id));
    } catch (err: any) {
      alert("削除失敗: " + err.message);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">
        認証確認中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-4 border border-slate-100">
          <h1 className="font-bold text-xl text-center text-slate-800 mb-6">管理者ログイン</h1>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full p-3 border rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-pink-400"
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full p-3 border rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-pink-400"
          />
          <button type="submit" className="w-full py-3 bg-pink-500 text-white rounded-xl font-bold text-sm hover:bg-pink-600 transition shadow-md">
            ログイン
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ヘッダーバー */}
        <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="font-bold text-xl text-slate-800">百合加護ねむり アプリ管理ポータル</h1>
            <p className="text-xs text-slate-500 mt-1">{user.email} でログイン中</p>
          </div>
          <div className="flex gap-2">
            <a href="/" target="_blank" className="text-xs font-bold text-slate-600 border border-slate-300 px-4 py-2 rounded-xl hover:bg-slate-50">
              公開ページ確認 ↗
            </a>
            <button onClick={() => signOut(auth)} className="text-xs text-red-500 font-bold border border-red-300 px-4 py-2 rounded-xl hover:bg-red-50">
              ログアウト
            </button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          {(["HOME", "PROFILE", "VIP", "MISSION", "COLLECTION"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] py-2.5 rounded-xl font-bold text-xs transition ${
                activeTab === tab ? "bg-pink-500 text-white shadow" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab} 設定
            </button>
          ))}
        </div>

        {/* ---------------- 1. HOME 設定 ---------------- */}
        {activeTab === "HOME" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">HOME：基本プロフィール</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">名前</label>
                  <input type="text" value={config.name || ""} onChange={e => setConfig({ ...config, name: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">キャッチコピー</label>
                  <input type="text" value={config.catchphrase || ""} onChange={e => setConfig({ ...config, catchphrase: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">ヘッダー画像URL</label>
                  <input type="text" value={config.headerImage || ""} onChange={e => setConfig({ ...config, headerImage: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">アイコン画像URL</label>
                  <input type="text" value={config.avatarImage || ""} onChange={e => setConfig({ ...config, avatarImage: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
              </div>

              {/* SNSリンク */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-500 block mb-2">SNS / 外部リンク一覧</label>
                {config.snsLinks?.map((sns: any, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="名称 (例: YouTube)"
                      value={sns.name}
                      onChange={e => {
                        const updated = [...config.snsLinks];
                        updated[i].name = e.target.value;
                        setConfig({ ...config, snsLinks: updated });
                      }}
                      className="w-1/3 p-2 border rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={sns.url}
                      onChange={e => {
                        const updated = [...config.snsLinks];
                        updated[i].url = e.target.value;
                        setConfig({ ...config, snsLinks: updated });
                      }}
                      className="flex-1 p-2 border rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, snsLinks: config.snsLinks.filter((_: any, idx: number) => idx !== i) })}
                      className="text-red-500 text-xs px-2 border rounded-lg hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, snsLinks: [...(config.snsLinks || []), { name: "", url: "" }] })}
                  className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mt-1"
                >
                  + SNSリンクを追加
                </button>
              </div>

              <button onClick={saveConfig} className="bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-pink-600 transition">
                HOME基本設定を保存
              </button>
            </div>

            {/* お知らせ (News) 管理 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">HOME：お知らせ (News) 管理</h2>
              <form onSubmit={handleAddNews} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
                <h3 className="font-bold text-xs text-slate-700">新しいお知らせを追加</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input type="text" placeholder="日付 (例: 2026.09.01)" value={newNewsDate} onChange={e => setNewNewsDate(e.target.value)} required className="p-2 border rounded-lg text-xs" />
                  <input type="text" placeholder="タイトル" value={newNewsTitle} onChange={e => setNewNewsTitle(e.target.value)} required className="md:col-span-2 p-2 border rounded-lg text-xs" />
                </div>
                <textarea placeholder="詳細本文..." value={newNewsContent} onChange={e => setNewNewsContent(e.target.value)} className="w-full p-2 border rounded-lg text-xs h-20" />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700">
                  お知らせを追加
                </button>
              </form>

              <div className="space-y-2">
                {newsList.map(n => (
                  <div key={n.id} className="flex justify-between items-start border p-3 rounded-xl bg-slate-50 text-xs">
                    <div>
                      <span className="text-pink-500 font-bold mr-2">{n.date}</span>
                      <strong className="text-slate-800">{n.title}</strong>
                      <p className="text-slate-600 mt-1 whitespace-pre-wrap">{n.content}</p>
                    </div>
                    <button onClick={() => handleDeleteNews(n.id)} className="text-red-500 ml-4 hover:underline">
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 2. PROFILE 設定 ---------------- */}
        {activeTab === "PROFILE" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">PROFILE：項目設定</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">見出しタイトル</label>
                  <input type="text" value={config.profileTitle || ""} onChange={e => setConfig({ ...config, profileTitle: e.target.value })} className="w-full p-2 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">年表の見出しタイトル</label>
                  <input type="text" value={config.historyTitle || ""} onChange={e => setConfig({ ...config, historyTitle: e.target.value })} className="w-full p-2 border rounded-lg text-xs" />
                </div>
              </div>

              {/* プロフィール項目リスト */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-500 block mb-2">プロフィール詳細カード一覧</label>
                {config.profileInfo?.map((info: any, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="項目名 (例: 身長)"
                      value={info.label}
                      onChange={e => {
                        const updated = [...config.profileInfo];
                        updated[i].label = e.target.value;
                        setConfig({ ...config, profileInfo: updated });
                      }}
                      className="w-1/3 p-2 border rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="値 (例: 148cm)"
                      value={info.value}
                      onChange={e => {
                        const updated = [...config.profileInfo];
                        updated[i].value = e.target.value;
                        setConfig({ ...config, profileInfo: updated });
                      }}
                      className="flex-1 p-2 border rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, profileInfo: config.profileInfo.filter((_: any, idx: number) => idx !== i) })}
                      className="text-red-500 text-xs px-2 border rounded-lg hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, profileInfo: [...(config.profileInfo || []), { label: "", value: "" }] })}
                  className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mt-1"
                >
                  + プロフィール項目を追加
                </button>
              </div>

              <button onClick={saveConfig} className="bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-pink-600 transition">
                PROFILE設定を保存
              </button>
            </div>

            {/* 活動履歴 (HISTORY) 管理 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">PROFILE：活動履歴 (HISTORY) 年表管理</h2>
              <form onSubmit={handleAddTimeline} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
                <h3 className="font-bold text-xs text-slate-700">年表項目を追加</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input type="number" placeholder="並び順 (例: 1)" value={newTlOrder} onChange={e => setNewTlOrder(Number(e.target.value))} required className="p-2 border rounded-lg text-xs" />
                  <input type="text" placeholder="時期 (例: 2024.04)" value={newTlDate} onChange={e => setNewTlDate(e.target.value)} required className="p-2 border rounded-lg text-xs" />
                  <input type="text" placeholder="タイトル" value={newTlTitle} onChange={e => setNewTlTitle(e.target.value)} required className="md:col-span-2 p-2 border rounded-lg text-xs" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select value={newTlMediaType} onChange={e => setNewTlMediaType(e.target.value)} className="p-2 border rounded-lg text-xs">
                    <option value="none">メディアなし</option>
                    <option value="image">画像URL</option>
                    <option value="youtube">YouTube埋め込みURL</option>
                  </select>
                  <input type="text" placeholder="メディアURL (画像リンクまたはYouTube埋め込みURL)" value={newTlMediaUrl} onChange={e => setNewTlMediaUrl(e.target.value)} className="md:col-span-2 p-2 border rounded-lg text-xs" />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700">
                  年表項目を追加
                </button>
              </form>

              <div className="space-y-2">
                {timelineList.map(t => (
                  <div key={t.id} className="flex justify-between items-center border p-3 rounded-xl bg-slate-50 text-xs">
                    <div>
                      <span className="font-bold text-slate-400 mr-2">#{t.order}</span>
                      <span className="text-pink-500 font-bold mr-2">{t.date}</span>
                      <strong className="text-slate-800">{t.title}</strong>
                      {t.mediaType !== "none" && <span className="ml-2 text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">{t.mediaType}</span>}
                    </div>
                    <button onClick={() => handleDeleteTimeline(t.id)} className="text-red-500 hover:underline">
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 3. VIP 設定 ---------------- */}
        {activeTab === "VIP" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">VIP：返礼・グッズ設定</h2>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">VIP見出しタイトル</label>
                <input type="text" value={config.vipTitle || ""} onChange={e => setConfig({ ...config, vipTitle: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm" />
              </div>

              {/* サポート返礼項目 */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">サポート返礼項目一覧</label>
                {config.vipRewards?.map((rew: string, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <span className="w-8 flex items-center justify-center font-bold text-xs bg-pink-100 text-pink-600 rounded-lg">{i + 1}</span>
                    <input
                      type="text"
                      value={rew}
                      onChange={e => {
                        const updated = [...config.vipRewards];
                        updated[i] = e.target.value;
                        setConfig({ ...config, vipRewards: updated });
                      }}
                      className="flex-1 p-2 border rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, vipRewards: config.vipRewards.filter((_: any, idx: number) => idx !== i) })}
                      className="text-red-500 text-xs px-2 border rounded-lg hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, vipRewards: [...(config.vipRewards || []), ""] })}
                  className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mt-1"
                >
                  + 返礼項目を追加
                </button>
              </div>

              {/* グッズ写真URL一覧 */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">グッズ写真URL一覧</label>
                {config.goodsImages?.map((img: string, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="画像URL"
                      value={img}
                      onChange={e => {
                        const updated = [...config.goodsImages];
                        updated[i] = e.target.value;
                        setConfig({ ...config, goodsImages: updated });
                      }}
                      className="flex-1 p-2 border rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, goodsImages: config.goodsImages.filter((_: any, idx: number) => idx !== i) })}
                      className="text-red-500 text-xs px-2 border rounded-lg hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, goodsImages: [...(config.goodsImages || []), ""] })}
                  className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mt-1"
                >
                  + グッズ写真URLを追加
                </button>
              </div>

              <button onClick={saveConfig} className="bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-pink-600 transition">
                VIP設定を保存
              </button>
            </div>

            {/* 歴代サポーター一覧 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">VIP：歴代サポーター管理</h2>
              <form onSubmit={handleAddSupporter} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
                <h3 className="font-bold text-xs text-slate-700">サポーターを追加</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input type="number" placeholder="並び順" value={newSupOrder} onChange={e => setNewSupOrder(Number(e.target.value))} required className="p-2 border rounded-lg text-xs" />
                  <input type="text" placeholder="名前 (例: おやすみ太郎)" value={newSupName} onChange={e => setNewSupName(e.target.value)} required className="p-2 border rounded-lg text-xs" />
                  <input type="text" placeholder="アバター画像URL" value={newSupAvatarUrl} onChange={e => setNewSupAvatarUrl(e.target.value)} className="md:col-span-2 p-2 border rounded-lg text-xs" />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700">
                  サポーターを追加
                </button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {supportersList.map(s => (
                  <div key={s.id} className="border p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <img src={s.avatarUrl || "/api/placeholder/40/40"} alt="" className="w-8 h-8 rounded-full object-cover border" />
                      <span className="font-bold truncate">{s.name}</span>
                    </div>
                    <button onClick={() => handleDeleteSupporter(s.id)} className="text-red-500 text-xs ml-2">削除</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 4. MISSION 設定 ---------------- */}
        {activeTab === "MISSION" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">MISSION：イベント・ポイント・公約設定</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">イベント名 (タイトル)</label>
                  <input type="text" value={mission.title || ""} onChange={e => setMission({ ...mission, title: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">サブタイトル / 告知文</label>
                  <input type="text" value={mission.subTitle || ""} onChange={e => setMission({ ...mission, subTitle: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">現在ポイント (pt)</label>
                  <input type="number" value={mission.currentPt || 0} onChange={e => setMission({ ...mission, currentPt: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">目標ポイント (pt)</label>
                  <input type="number" value={mission.targetPt || 0} onChange={e => setMission({ ...mission, targetPt: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
              </div>

              {/* 公約・特典リスト */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-500 block mb-2">公約・達成特典一覧</label>
                {mission.rewards?.map((r: any, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Step (例: 50%達成)"
                      value={r.step}
                      onChange={e => {
                        const updated = [...mission.rewards];
                        updated[i].step = e.target.value;
                        setMission({ ...mission, rewards: updated });
                      }}
                      className="w-1/3 p-2 border rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="特典内容 (例: 新規歌ってみた投稿)"
                      value={r.reward}
                      onChange={e => {
                        const updated = [...mission.rewards];
                        updated[i].reward = e.target.value;
                        setMission({ ...mission, rewards: updated });
                      }}
                      className="flex-1 p-2 border rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setMission({ ...mission, rewards: mission.rewards.filter((_: any, idx: number) => idx !== i) })}
                      className="text-red-500 text-xs px-2 border rounded-lg hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMission({ ...mission, rewards: [...(mission.rewards || []), { step: "", reward: "" }] })}
                  className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mt-1"
                >
                  + 公約・特典を追加
                </button>
              </div>

              <button onClick={saveMission} className="bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-pink-600 transition">
                MISSION設定を保存
              </button>
            </div>
          </div>
        )}

        {/* ---------------- 5. COLLECTION 設定 ---------------- */}
        {activeTab === "COLLECTION" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">COLLECTION：文言カスタマイズ</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">吹き出しメッセージ</label>
                  <input type="text" value={config.collectionBubbleText || ""} onChange={e => setConfig({ ...config, collectionBubbleText: e.target.value })} className="w-full p-2 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">合言葉プレースホルダー</label>
                  <input type="text" value={config.collectionGachaPlaceholder || ""} onChange={e => setConfig({ ...config, collectionGachaPlaceholder: e.target.value })} className="w-full p-2 border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">ガチャボタン文言</label>
                  <input type="text" value={config.collectionButtonText || ""} onChange={e => setConfig({ ...config, collectionButtonText: e.target.value })} className="w-full p-2 border rounded-lg text-xs" />
                </div>
              </div>
              <button onClick={saveConfig} className="bg-pink-500 text-white px-5 py-2 rounded-xl font-bold text-sm shadow hover:bg-pink-600 transition">
                文言設定を保存
              </button>
            </div>

            {/* ガチャカード管理 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">COLLECTION：カード登録・削除 (無制限)</h2>
              <form onSubmit={handleAddCard} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
                <h3 className="font-bold text-xs text-slate-700">新しいカードの追加</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input name="cardNumber" type="number" placeholder="No. (例: 1)" required className="p-2 border rounded-lg text-xs" />
                  <input name="title" type="text" placeholder="カード名 (例: 桜の下で)" required className="p-2 border rounded-lg text-xs" />
                  <input name="keyword" type="text" placeholder="解禁用合言葉 (例: sakura)" required className="p-2 border rounded-lg text-xs" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">画像ファイルを直接アップロード</label>
                    <input name="image" type="file" accept="image/*" className="block w-full text-xs" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">または 画像URLを直接入力</label>
                    <input name="imageUrlDirect" type="text" placeholder="https://..." className="w-full p-2 border rounded-lg text-xs" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className={`w-full py-2.5 bg-pink-500 text-white rounded-xl font-bold text-xs transition shadow ${
                    isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-pink-600"
                  }`}
                >
                  {isUploading ? "カードを保存中..." : "カードを追加する"}
                </button>
              </form>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                {cards.map(c => (
                  <div key={c.id} className="border rounded-xl p-2.5 flex flex-col items-center bg-white shadow-sm">
                    <img src={c.imageUrl} className="w-full h-28 object-cover rounded-lg mb-2" alt={c.title} />
                    <span className="font-bold text-xs text-slate-800">No.{c.cardNumber} {c.title}</span>
                    <span className="text-[10px] text-pink-500 mt-0.5">合言葉: {c.keyword}</span>
                    <button onClick={() => handleDeleteCard(c.id)} className="mt-2 text-red-500 text-[11px] font-bold border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 w-full">
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}