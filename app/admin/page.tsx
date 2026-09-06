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

// 共通画像アップローダーコンポーネント
function ImageUploader({
  label,
  value,
  onChange,
  folder = "uploads"
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      onChange(downloadUrl);
    } catch (err: any) {
      alert("アップロード失敗: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      <label className="text-xs font-bold text-slate-600 block">{label}</label>
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        {value ? (
          <div className="relative group">
            <img
              src={value}
              alt="Preview"
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center shadow"
              title="画像を削除"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 flex-shrink-0">
            No Img
          </div>
        )}
        <div className="flex-1 w-full space-y-1">
          <div className="flex gap-2 items-center">
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={handleFileChange}
              className="text-xs block w-full file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100 cursor-pointer"
            />
            {uploading && <span className="text-xs text-pink-500 font-bold self-center animate-pulse whitespace-nowrap">送信中...</span>}
          </div>
          <input
            type="text"
            placeholder="または画像URLを直接入力"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-1.5 border rounded-lg text-xs bg-slate-50 focus:bg-white"
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<"HOME" | "PROFILE" | "VIP" | "MISSION" | "COLLECTION">("HOME");

  // Config
  const [config, setConfig] = useState<any>({
    name: "百合加護ねむり",
    catchphrase: "あなたの夜にそっと寄り添う、安眠系VTuber。",
    headerImage: "",
    avatarImage: "",
    snsLinks: [],
    profileTitle: "PROFILE",
    historyTitle: "HISTORY",
    profileInfo: [],
    vipTitle: "サポート返礼",
    vipRewards: [],
    goodsImages: [],
    collectionBubbleText: "ネムリンのイラストカードをコンプしよう！",
    collectionGachaPlaceholder: "合言葉を入力 (例: nemuri)",
    collectionButtonText: "ガチャをひく",
    gachaKeywords: ["nemuri", "おやすみ"] // ガチャ用合言葉リスト
  });

  // News (HOME)
  const [newsList, setNewsList] = useState<any[]>([]);
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsDate, setNewNewsDate] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");
  const [newNewsImageUrl, setNewNewsImageUrl] = useState("");

  // Timeline (PROFILE)
  const [timelineList, setTimelineList] = useState<any[]>([]);
  const [newTlDate, setNewTlDate] = useState("");
  const [newTlTitle, setNewTlTitle] = useState("");
  const [newTlMediaType, setNewTlMediaType] = useState("none");
  const [newTlMediaUrl, setNewTlMediaUrl] = useState("");
  const [newTlOrder, setNewTlOrder] = useState(1);

  // Supporters (VIP)
  const [supportersList, setSupportersList] = useState<any[]>([]);
  const [newSupName, setNewSupName] = useState("");
  const [newSupAvatarUrl, setNewSupAvatarUrl] = useState("");
  const [newSupOrder, setNewSupOrder] = useState(1);

  // Mission
  const [mission, setMission] = useState<any>({
    title: "",
    subTitle: "",
    currentPt: 0,
    targetPt: 100000,
    rewards: []
  });

  // Cards (COLLECTION)
  const [cards, setCards] = useState<any[]>([]);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardImageUrl, setNewCardImageUrl] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);

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
      const confSnap = await getDoc(doc(db, "app_config", "global"));
      if (confSnap.exists()) setConfig((prev: any) => ({ ...prev, ...confSnap.data() }));

      const misSnap = await getDoc(doc(db, "mission", "main"));
      if (misSnap.exists()) setMission((prev: any) => ({ ...prev, ...misSnap.data() }));

      const newsSnap = await getDocs(query(collection(db, "news"), orderBy("createdAt", "desc")));
      setNewsList(newsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const tlSnap = await getDocs(query(collection(db, "timeline"), orderBy("order", "asc")));
      setTimelineList(tlSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const supSnap = await getDocs(query(collection(db, "supporters"), orderBy("order", "asc")));
      setSupportersList(supSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const cardsSnap = await getDocs(collection(db, "cards"));
      setCards(
        cardsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (a.cardNumber || 0) - (b.cardNumber || 0))
      );
    } catch (e) {
      console.warn("データ取得警告:", e);
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

  // --- News ---
  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle || !newNewsDate) return;
    try {
      const docRef = await addDoc(collection(db, "news"), {
        title: newNewsTitle,
        date: newNewsDate,
        content: newNewsContent,
        imageUrl: newNewsImageUrl,
        createdAt: serverTimestamp()
      });
      setNewsList([
        { id: docRef.id, title: newNewsTitle, date: newNewsDate, content: newNewsContent, imageUrl: newNewsImageUrl },
        ...newsList
      ]);
      setNewNewsTitle("");
      setNewNewsDate("");
      setNewNewsContent("");
      setNewNewsImageUrl("");
      alert("お知らせを追加しました！");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "news", id));
    setNewsList(newsList.filter((n) => n.id !== id));
  };

  // --- Timeline ---
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
      setTimelineList(
        [
          ...timelineList,
          {
            id: docRef.id,
            date: newTlDate,
            title: newTlTitle,
            mediaType: newTlMediaType,
            mediaUrl: newTlMediaUrl,
            order: Number(newTlOrder)
          }
        ].sort((a, b) => a.order - b.order)
      );
      setNewTlDate("");
      setNewTlTitle("");
      setNewTlMediaUrl("");
      setNewTlOrder((prev) => prev + 1);
      alert("年表項目を追加しました！");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteTimeline = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "timeline", id));
    setTimelineList(timelineList.filter((t) => t.id !== id));
  };

  // --- Supporter ---
  const handleAddSupporter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, "supporters"), {
        name: newSupName,
        avatarUrl: newSupAvatarUrl,
        order: Number(newSupOrder)
      });
      setSupportersList(
        [
          ...supportersList,
          { id: docRef.id, name: newSupName, avatarUrl: newSupAvatarUrl, order: Number(newSupOrder) }
        ].sort((a, b) => a.order - b.order)
      );
      setNewSupName("");
      setNewSupAvatarUrl("");
      setNewSupOrder((prev) => prev + 1);
      alert("サポーターを追加しました！");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteSupporter = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "supporters", id));
    setSupportersList(supportersList.filter((s) => s.id !== id));
  };

  // --- Cards ---
  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNumber || !newCardTitle) {
      return alert("No・カード名を入力してください");
    }
    if (!newCardImageUrl) {
      return alert("画像を選択してください");
    }

    setIsAddingCard(true);
    try {
      const cardNumber = Number(newCardNumber);
      const docRef = await addDoc(collection(db, "cards"), {
        cardNumber,
        title: newCardTitle,
        imageUrl: newCardImageUrl,
        createdAt: serverTimestamp()
      });

      setCards(
        (prev) =>
          [...prev, { id: docRef.id, cardNumber, title: newCardTitle, imageUrl: newCardImageUrl }].sort(
            (a, b) => a.cardNumber - b.cardNumber
          )
      );

      setNewCardNumber("");
      setNewCardTitle("");
      setNewCardImageUrl("");
      alert("カードを追加しました！");
    } catch (err: any) {
      alert("追加失敗: " + err.message);
    } finally {
      setIsAddingCard(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      await deleteDoc(doc(db, "cards", id));
      setCards(cards.filter((c) => c.id !== id));
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
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-pink-400"
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        
        {/* ヘッダー */}
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
          {(["HOME", "PROFILE", "VIP", "MISSION", "COLLECTION"] as const).map((tab) => (
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">HOME：基本プロフィール</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">名前</label>
                  <input
                    type="text"
                    value={config.name || ""}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">キャッチコピー</label>
                  <input
                    type="text"
                    value={config.catchphrase || ""}
                    onChange={(e) => setConfig({ ...config, catchphrase: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <ImageUploader
                  label="ヘッダー画像"
                  value={config.headerImage}
                  onChange={(url) => setConfig({ ...config, headerImage: url })}
                  folder="headers"
                />
                <ImageUploader
                  label="アバター（アイコン）画像"
                  value={config.avatarImage}
                  onChange={(url) => setConfig({ ...config, avatarImage: url })}
                  folder="avatars"
                />
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
                      onChange={(e) => {
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
                      onChange={(e) => {
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

            {/* お知らせ管理 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">HOME：お知らせ (News) 管理</h2>
              <form onSubmit={handleAddNews} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
                <h3 className="font-bold text-xs text-slate-700">新しいお知らせを追加</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="日付 (例: 2026.09.01)"
                    value={newNewsDate}
                    onChange={(e) => setNewNewsDate(e.target.value)}
                    required
                    className="p-2 border rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="タイトル"
                    value={newNewsTitle}
                    onChange={(e) => setNewNewsTitle(e.target.value)}
                    required
                    className="md:col-span-2 p-2 border rounded-lg text-xs"
                  />
                </div>
                <textarea
                  placeholder="詳細本文..."
                  value={newNewsContent}
                  onChange={(e) => setNewNewsContent(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs h-20"
                />
                
                <ImageUploader
                  label="お知らせの添付画像（任意）"
                  value={newNewsImageUrl}
                  onChange={setNewNewsImageUrl}
                  folder="news"
                />

                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700">
                  お知らせを追加
                </button>
              </form>

              <div className="space-y-2">
                {newsList.map((n) => (
                  <div key={n.id} className="flex justify-between items-start border p-3 rounded-xl bg-slate-50 text-xs">
                    <div className="flex gap-3">
                      {n.imageUrl && (
                        <img src={n.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover border flex-shrink-0" />
                      )}
                      <div>
                        <span className="text-pink-500 font-bold mr-2">{n.date}</span>
                        <strong className="text-slate-800">{n.title}</strong>
                        <p className="text-slate-600 mt-1 whitespace-pre-wrap">{n.content}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteNews(n.id)} className="text-red-500 ml-4 hover:underline flex-shrink-0">
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
                  <input
                    type="text"
                    value={config.profileTitle || ""}
                    onChange={(e) => setConfig({ ...config, profileTitle: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">年表の見出しタイトル</label>
                  <input
                    type="text"
                    value={config.historyTitle || ""}
                    onChange={(e) => setConfig({ ...config, historyTitle: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* プロフィール項目リスト */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-500 block mb-2">プロフィール詳細カード一覧</label>
                <div className="space-y-3">
                  {config.profileInfo?.map((info: any, i: number) => (
                    <div key={i} className="p-3 border rounded-xl bg-slate-50 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="項目名 (例: 身長)"
                          value={info.label}
                          onChange={(e) => {
                            const updated = [...config.profileInfo];
                            updated[i].label = e.target.value;
                            setConfig({ ...config, profileInfo: updated });
                          }}
                          className="w-1/3 p-2 border rounded-xl text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="値 (例: 148cm)"
                          value={info.value}
                          onChange={(e) => {
                            const updated = [...config.profileInfo];
                            updated[i].value = e.target.value;
                            setConfig({ ...config, profileInfo: updated });
                          }}
                          className="flex-1 p-2 border rounded-xl text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, profileInfo: config.profileInfo.filter((_: any, idx: number) => idx !== i) })}
                          className="text-red-500 text-xs px-2 border rounded-lg hover:bg-red-50 bg-white"
                        >
                          削除
                        </button>
                      </div>
                      <ImageUploader
                        label="アイコン・イメージ画像（任意）"
                        value={info.imageUrl || ""}
                        onChange={(url) => {
                          const updated = [...config.profileInfo];
                          updated[i].imageUrl = url;
                          setConfig({ ...config, profileInfo: updated });
                        }}
                        folder="profile_icons"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, profileInfo: [...(config.profileInfo || []), { label: "", value: "", imageUrl: "" }] })}
                  className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mt-2"
                >
                  + プロフィール項目を追加
                </button>
              </div>

              <button onClick={saveConfig} className="bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-pink-600 transition">
                PROFILE設定を保存
              </button>
            </div>

            {/* 活動履歴 (HISTORY) 年表管理 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">PROFILE：活動履歴 (HISTORY) 年表管理</h2>
              <form onSubmit={handleAddTimeline} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
                <h3 className="font-bold text-xs text-slate-700">年表項目を追加</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    type="number"
                    placeholder="並び順"
                    value={newTlOrder}
                    onChange={(e) => setNewTlOrder(Number(e.target.value))}
                    required
                    className="p-2 border rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="時期 (例: 2024.04)"
                    value={newTlDate}
                    onChange={(e) => setNewTlDate(e.target.value)}
                    required
                    className="p-2 border rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="出来事のタイトル"
                    value={newTlTitle}
                    onChange={(e) => setNewTlTitle(e.target.value)}
                    required
                    className="md:col-span-2 p-2 border rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-slate-500 block">メディア添付 (画像またはYouTube)</label>
                  <select
                    value={newTlMediaType}
                    onChange={(e) => setNewTlMediaType(e.target.value)}
                    className="p-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="none">メディアなし</option>
                    <option value="image">画像ファイル/URL</option>
                    <option value="youtube">YouTube埋め込みURL</option>
                  </select>

                  {newTlMediaType === "image" && (
                    <ImageUploader
                      label="年表用写真"
                      value={newTlMediaUrl}
                      onChange={setNewTlMediaUrl}
                      folder="timeline"
                    />
                  )}

                  {newTlMediaType === "youtube" && (
                    <input
                      type="text"
                      placeholder="YouTube埋め込みURL (例: https://www.youtube.com/embed/...)"
                      value={newTlMediaUrl}
                      onChange={(e) => setNewTlMediaUrl(e.target.value)}
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  )}
                </div>

                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700">
                  年表項目を追加
                </button>
              </form>

              <div className="space-y-2">
                {timelineList.map((t) => (
                  <div key={t.id} className="flex justify-between items-center border p-3 rounded-xl bg-slate-50 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-400">#{t.order}</span>
                      <span className="text-pink-500 font-bold">{t.date}</span>
                      <strong className="text-slate-800">{t.title}</strong>
                      {t.mediaType === "image" && t.mediaUrl && (
                        <img src={t.mediaUrl} alt="" className="w-8 h-8 rounded object-cover border" />
                      )}
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">VIP：返礼・グッズ設定</h2>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">VIP見出しタイトル</label>
                <input
                  type="text"
                  value={config.vipTitle || ""}
                  onChange={(e) => setConfig({ ...config, vipTitle: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              {/* サポート返礼項目 */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">サポート返礼項目一覧</label>
                <div className="space-y-3">
                  {config.vipRewards?.map((rew: any, i: number) => {
                    const text = typeof rew === "string" ? rew : rew.text;
                    const imageUrl = typeof rew === "string" ? "" : rew.imageUrl;

                    return (
                      <div key={i} className="p-3 border rounded-xl bg-slate-50 space-y-2">
                        <div className="flex gap-2 items-center">
                          <span className="w-7 h-7 flex items-center justify-center font-bold text-xs bg-pink-100 text-pink-600 rounded-lg flex-shrink-0">
                            {i + 1}
                          </span>
                          <input
                            type="text"
                            placeholder="返礼内容 (例: 限定お礼ボイス)"
                            value={text || ""}
                            onChange={(e) => {
                              const updated = [...config.vipRewards];
                              updated[i] = { text: e.target.value, imageUrl: imageUrl || "" };
                              setConfig({ ...config, vipRewards: updated });
                            }}
                            className="flex-1 p-2 border rounded-xl text-xs bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setConfig({ ...config, vipRewards: config.vipRewards.filter((_: any, idx: number) => idx !== i) })}
                            className="text-red-500 text-xs px-2 py-1.5 border rounded-lg hover:bg-red-50 bg-white"
                          >
                            削除
                          </button>
                        </div>
                        <ImageUploader
                          label="特典イメージ・参考写真（任意）"
                          value={imageUrl || ""}
                          onChange={(url) => {
                            const updated = [...config.vipRewards];
                            updated[i] = { text: text || "", imageUrl: url };
                            setConfig({ ...config, vipRewards: updated });
                          }}
                          folder="vip_rewards"
                        />
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, vipRewards: [...(config.vipRewards || []), { text: "", imageUrl: "" }] })}
                  className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mt-2"
                >
                  + 返礼項目を追加
                </button>
              </div>

              {/* グッズ写真 */}
              <div className="pt-2 border-t">
                <label className="text-xs font-bold text-slate-600 block mb-2">グッズ写真ギャラリー</label>
                <div className="space-y-3">
                  {config.goodsImages?.map((img: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded-xl bg-slate-50">
                      <ImageUploader
                        label={`グッズ写真 #${i + 1}`}
                        value={img}
                        onChange={(url) => {
                          const updated = [...config.goodsImages];
                          updated[i] = url;
                          setConfig({ ...config, goodsImages: updated });
                        }}
                        folder="goods"
                      />
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, goodsImages: config.goodsImages.filter((_: any, idx: number) => idx !== i) })}
                        className="text-red-500 text-xs px-2 py-1 border border-red-200 rounded-lg hover:bg-red-50 self-center mt-4"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, goodsImages: [...(config.goodsImages || []), ""] })}
                    className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                  >
                    + グッズ写真枠を追加
                  </button>
                </div>
              </div>

              <button onClick={saveConfig} className="bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-pink-600 transition">
                VIP設定を保存
              </button>
            </div>

            {/* 歴代サポーター */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">VIP：歴代サポーター管理</h2>
              <form onSubmit={handleAddSupporter} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
                <h3 className="font-bold text-xs text-slate-700">サポーターを追加</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="並び順"
                    value={newSupOrder}
                    onChange={(e) => setNewSupOrder(Number(e.target.value))}
                    required
                    className="p-2 border rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="お名前 (例: おやすみ太郎)"
                    value={newSupName}
                    onChange={(e) => setNewSupName(e.target.value)}
                    required
                    className="md:col-span-2 p-2 border rounded-lg text-xs"
                  />
                </div>
                <ImageUploader
                  label="サポーターのアバターアイコン"
                  value={newSupAvatarUrl}
                  onChange={setNewSupAvatarUrl}
                  folder="supporters"
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700">
                  サポーターを追加
                </button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {supportersList.map((s) => (
                  <div key={s.id} className="border p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      {s.avatarUrl ? (
                        <img src={s.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200" />
                      )}
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
                  <input
                    type="text"
                    value={mission.title || ""}
                    onChange={(e) => setMission({ ...mission, title: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">サブタイトル / 告知文</label>
                  <input
                    type="text"
                    value={mission.subTitle || ""}
                    onChange={(e) => setMission({ ...mission, subTitle: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">現在ポイント (pt)</label>
                  <input
                    type="number"
                    value={mission.currentPt || 0}
                    onChange={(e) => setMission({ ...mission, currentPt: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">目標ポイント (pt)</label>
                  <input
                    type="number"
                    value={mission.targetPt || 0}
                    onChange={(e) => setMission({ ...mission, targetPt: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* 公約・特典 */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-500 block mb-2">公約・達成特典一覧</label>
                <div className="space-y-3">
                  {mission.rewards?.map((r: any, i: number) => (
                    <div key={i} className="p-3 border rounded-xl bg-slate-50 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Step (例: 50%達成)"
                          value={r.step}
                          onChange={(e) => {
                            const updated = [...mission.rewards];
                            updated[i].step = e.target.value;
                            setMission({ ...mission, rewards: updated });
                          }}
                          className="w-1/3 p-2 border rounded-xl text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="特典内容 (例: 新規歌ってみた投稿)"
                          value={r.reward}
                          onChange={(e) => {
                            const updated = [...mission.rewards];
                            updated[i].reward = e.target.value;
                            setMission({ ...mission, rewards: updated });
                          }}
                          className="flex-1 p-2 border rounded-xl text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setMission({ ...mission, rewards: mission.rewards.filter((_: any, idx: number) => idx !== i) })}
                          className="text-red-500 text-xs px-2 border rounded-lg hover:bg-red-50 bg-white"
                        >
                          削除
                        </button>
                      </div>
                      <ImageUploader
                        label="特典ラフ・告知画像（任意）"
                        value={r.imageUrl || ""}
                        onChange={(url) => {
                          const updated = [...mission.rewards];
                          updated[i].imageUrl = url;
                          setMission({ ...mission, rewards: updated });
                        }}
                        folder="mission_rewards"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMission({ ...mission, rewards: [...(mission.rewards || []), { step: "", reward: "", imageUrl: "" }] })}
                  className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mt-2"
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
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">COLLECTION：文言＆解禁用合言葉設定</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">吹き出しメッセージ</label>
                  <input
                    type="text"
                    value={config.collectionBubbleText || ""}
                    onChange={(e) => setConfig({ ...config, collectionBubbleText: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">合言葉プレースホルダー</label>
                  <input
                    type="text"
                    value={config.collectionGachaPlaceholder || ""}
                    onChange={(e) => setConfig({ ...config, collectionGachaPlaceholder: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">ガチャボタン文言</label>
                  <input
                    type="text"
                    value={config.collectionButtonText || ""}
                    onChange={(e) => setConfig({ ...config, collectionButtonText: e.target.value })}
                    className="w-full p-2 border rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* ガチャ解禁用合言葉（複数登録可能） */}
              <div className="pt-2 border-t">
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  🔑 ガチャ解禁用合言葉一覧（どれを入力してもガチャが引けます）
                </label>
                <p className="text-[11px] text-slate-400 mb-2">大文字小文字は自動で区別なく判定されます。</p>
                <div className="space-y-2">
                  {(config.gachaKeywords || ["nemuri"]).map((kw: string, i: number) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="合言葉 (例: nemuri)"
                        value={kw}
                        onChange={(e) => {
                          const updated = [...(config.gachaKeywords || [])];
                          updated[i] = e.target.value;
                          setConfig({ ...config, gachaKeywords: updated });
                        }}
                        className="flex-1 p-2 border rounded-xl text-xs bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            gachaKeywords: config.gachaKeywords.filter((_: any, idx: number) => idx !== i)
                          })
                        }
                        className="text-red-500 text-xs px-2 py-1.5 border rounded-lg hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, gachaKeywords: [...(config.gachaKeywords || []), ""] })}
                    className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mt-1"
                  >
                    + 合言葉を追加
                  </button>
                </div>
              </div>

              <button onClick={saveConfig} className="bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-pink-600 transition">
                COLLECTION設定を保存
              </button>
            </div>

            {/* ガチャカード管理 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="font-bold text-base border-b pb-2 text-slate-800">COLLECTION：排出カードプール管理 ({cards.length}枚)</h2>
              <form onSubmit={handleAddCard} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
                <h3 className="font-bold text-xs text-slate-700">新しいカードの追加</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="カードNo. (例: 1)"
                    value={newCardNumber}
                    onChange={(e) => setNewCardNumber(e.target.value)}
                    required
                    className="p-2 border rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="カード名 (例: 桜の下で)"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    required
                    className="p-2 border rounded-lg text-xs"
                  />
                </div>

                <ImageUploader
                  label="カードイラスト画像"
                  value={newCardImageUrl}
                  onChange={setNewCardImageUrl}
                  folder="cards"
                />

                <button
                  type="submit"
                  disabled={isAddingCard}
                  className={`w-full py-2.5 bg-pink-500 text-white rounded-xl font-bold text-xs transition shadow ${
                    isAddingCard ? "opacity-50 cursor-not-allowed" : "hover:bg-pink-600"
                  }`}
                >
                  {isAddingCard ? "カードを追加中..." : "カードをプールに追加する"}
                </button>
              </form>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                {cards.map((c) => (
                  <div key={c.id} className="border rounded-xl p-2.5 flex flex-col items-center bg-white shadow-sm">
                    <img src={c.imageUrl} className="w-full h-28 object-cover rounded-lg mb-2" alt={c.title} />
                    <span className="font-bold text-xs text-slate-800">
                      No.{c.cardNumber} {c.title}
                    </span>
                    <button
                      onClick={() => handleDeleteCard(c.id)}
                      className="mt-2 text-red-500 text-[11px] font-bold border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 w-full"
                    >
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