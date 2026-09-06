"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { Home, User, Crown, Flag, Gift, ChevronDown, ChevronUp, Lock, ExternalLink, X, Sparkles, CheckCircle2, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const DEFAULT_CONFIG = {
  name: "百合加護ねむり",
  catchphrase: "あなたの夜にそっと寄り添う、安眠系VTuber。",
  headerImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
  avatarImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop",
  snsLinks: [
    { name: "YouTube", url: "https://youtube.com" },
    { name: "X (Twitter)", url: "https://twitter.com" },
    { name: "FANBOX", url: "https://pixiv.net" }
  ],
  profileTitle: "PROFILE",
  historyTitle: "HISTORY",
  profileInfo: [
    { label: "誕生日", value: "9月1日", imageUrl: "" },
    { label: "ファンネーム", value: "ねむりんちゅ", imageUrl: "" },
    { label: "好きなもの", value: "温かいミルク・オルゴール", imageUrl: "" }
  ],
  vipTitle: "サポート返礼",
  supportersTitle: "歴代サポーター",
  vipRewards: [
    { text: "限定おやすみ添い寝ボイス（毎月更新）", imageUrl: "" },
    { text: "デジタルねむりん会員証", imageUrl: "" },
    { text: "シークレット描き下ろしイラストカード", imageUrl: "" }
  ],
  goodsImages: [
    "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=500&auto=format&fit=crop"
  ],
  collectionBubbleText: "ネムリンのイラストカードをコンプしよう！",
  collectionGachaPlaceholder: "合言葉を入力 (例: nemuri)",
  collectionButtonText: "ガチャをひく",
  gachaKeywords: ["nemuri", "おやすみ", "ねむりん"]
};

const DEFAULT_MISSION = {
  title: "1st Anniversary 記念イベント",
  subTitle: "みんなで新衣装と記念配信を目指そう！",
  currentPt: 45000,
  targetPt: 100000,
  rewards: [
    { step: "Step 1 (30%)", reward: "記念スマホ壁紙プレゼント", imageUrl: "" },
    { step: "Step 2 (60%)", reward: "新衣装ラフ画先行チラ見せ", imageUrl: "" },
    { step: "Step 3 (100%)", reward: "新衣装お披露目3Dミニライブ開催！", imageUrl: "" }
  ]
};

const DEFAULT_NEWS = [
  {
    id: "dummy-news-1",
    date: "2026.09.01",
    title: "公式ファンポータル＆カードコレクション公開！",
    content: "百合加護ねむりの公式ファンアプリがオープンしました！\n毎日合言葉でガチャを引いて、限定カードをコレクションしてね🌙",
    imageUrl: ""
  },
  {
    id: "dummy-news-2",
    date: "2026.08.20",
    title: "活動1周年記念配信のお知らせ",
    content: "おかげさまで活動1周年を迎えます！\n当日は記念ミッションの達成発表や特別な歌枠を予定しています。",
    imageUrl: ""
  },
  {
    id: "dummy-news-3",
    date: "2026.08.01",
    title: "新メンバーシップ特典・限定ボイス追加",
    content: "今月の限定おやすみボイス「夏の夜のひそひそ話」を公開しました！VIPタブからチェックしてね。",
    imageUrl: ""
  }
];

const DEFAULT_TIMELINE = [
  {
    id: "dummy-tl-1",
    date: "2024.09.01",
    title: "初配信＆VTuberデビュー🌙",
    mediaType: "none",
    mediaUrl: "",
    order: 1
  },
  {
    id: "dummy-tl-2",
    date: "2025.03.15",
    title: "チャンネル登録者数1万人突破＆記念歌枠",
    mediaType: "none",
    mediaUrl: "",
    order: 2
  },
  {
    id: "dummy-tl-3",
    date: "2025.09.01",
    title: "活動1周年＆初オリジナルソング発表",
    mediaType: "none",
    mediaUrl: "",
    order: 3
  }
];

const DEFAULT_SUPPORTERS = [
  {
    id: "dummy-sup-1",
    name: "ねむねむナイト",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
    order: 1
  },
  {
    id: "dummy-sup-2",
    name: "おやすみ星人",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop",
    order: 2
  },
  {
    id: "dummy-sup-3",
    name: "パジャマ部長",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop",
    order: 3
  }
];

const DEFAULT_CARDS = [
  {
    id: "dummy-card-1",
    cardNumber: 1,
    title: "星降る夜のねむりん",
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=400&auto=format&fit=crop"
  },
  {
    id: "dummy-card-2",
    cardNumber: 2,
    title: "もこもこパジャマパーティー",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400&auto=format&fit=crop"
  },
  {
    id: "dummy-card-3",
    cardNumber: 3,
    title: "夢のなかでおはよう",
    imageUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=400&auto=format&fit=crop"
  }
];

const DEFAULT_MESSAGES = [
  {
    id: "dummy-msg-1",
    name: "ねむりん推し",
    text: "いつも心地よい配信をありがとう！毎晩癒やされてぐっすり眠れてます🌙"
  },
  {
    id: "dummy-msg-2",
    name: "ひつじ数え隊",
    text: "1周年おめでとう！ミッション達成応援してるよ〜！！"
  },
  {
    id: "dummy-msg-3",
    name: "ナイトミルク",
    text: "カードコンプ目指して毎日合言葉入力します！"
  }
];

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
};

export default function App() {
  const [tab, setTab] = useState("HOME");
  const [uid, setUid] = useState<string | null>(null);

  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [news, setNews] = useState<any[]>(DEFAULT_NEWS);
  const [timeline, setTimeline] = useState<any[]>(DEFAULT_TIMELINE);
  const [supporters, setSupporters] = useState<any[]>(DEFAULT_SUPPORTERS);
  const [mission, setMission] = useState<any>(DEFAULT_MISSION);
  const [messages, setMessages] = useState<any[]>(DEFAULT_MESSAGES);
  const [cards, setCards] = useState<any[]>(DEFAULT_CARDS);

  const [openNews, setOpenNews] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [unlockedCards, setUnlockedCards] = useState<number[]>([]);
  const [gachaInput, setGachaInput] = useState("");
  const [msgName, setMsgName] = useState("");
  const [msgText, setMsgText] = useState("");

  const [lastGachaDate, setLastGachaDate] = useState<string>("");
  const [wonCard, setWonCard] = useState<{ card: any; isNew: boolean } | null>(null);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().lastGachaDate) {
            setLastGachaDate(userDoc.data().lastGachaDate);
          }
        } catch (e) {
          console.warn("ユーザー情報取得スキップ:", e);
        }
      }
    });

    try {
      const storedCards = localStorage.getItem("nemuri_cards");
      if (storedCards) setUnlockedCards(JSON.parse(storedCards));

      const storedDate = localStorage.getItem("nemuri_last_gacha_date");
      if (storedDate) setLastGachaDate(storedDate);
    } catch (e) {
      console.warn(e);
    }

    const unsubConfig = onSnapshot(doc(db, "app_config", "global"), (d) => {
      if (d.exists()) setConfig((prev: any) => ({ ...prev, ...d.data() }));
    });

    const unsubMission = onSnapshot(doc(db, "mission", "main"), (d) => {
      if (d.exists()) setMission(d.data());
    });

    const unsubNews = onSnapshot(query(collection(db, "news"), orderBy("createdAt", "desc")), (s) => {
      if (!s.empty) setNews(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTimeline = onSnapshot(query(collection(db, "timeline"), orderBy("order", "asc")), (s) => {
      if (!s.empty) setTimeline(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubSupporters = onSnapshot(query(collection(db, "supporters"), orderBy("order", "asc")), (s) => {
      if (!s.empty) setSupporters(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubMessages = onSnapshot(query(collection(db, "messages"), orderBy("createdAt", "desc")), (s) => {
      if (!s.empty) setMessages(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubCards = onSnapshot(query(collection(db, "cards"), orderBy("cardNumber", "asc")), (s) => {
      if (!s.empty) setCards(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAuth(); unsubConfig(); unsubMission(); unsubNews();
      unsubTimeline(); unsubSupporters(); unsubMessages(); unsubCards();
    };
  }, []);

  const todayStr = getTodayString();
  const hasPulledToday = lastGachaDate === todayStr;
  const unobtainedCards = cards.filter((c) => !unlockedCards.includes(c.cardNumber));
  const isCompleted = cards.length > 0 && unobtainedCards.length === 0;

  const handleGacha = async () => {
    if (isCompleted) {
      alert("全種類のカードをコンプリートしています！おめでとうございます！");
      return;
    }

    if (hasPulledToday) {
      alert("本日のガチャはすでに引いています。明日また挑戦してね！");
      return;
    }

    const input = gachaInput.trim().toLowerCase();
    if (!input) return;

    if (cards.length === 0) {
      alert("カードがまだ登録されていません。");
      return;
    }

    const validKeywords = (config.gachaKeywords || ["nemuri"]).map((k: string) => k.trim().toLowerCase());
    const isValid = validKeywords.includes(input);

    if (!isValid) {
      alert("合言葉が違います。配信やSNSをチェックしてみてね！");
      return;
    }

    const randomIndex = Math.floor(Math.random() * unobtainedCards.length);
    const chosenCard = unobtainedCards[randomIndex];

    const newUnlocked = [...unlockedCards, chosenCard.cardNumber];
    setUnlockedCards(newUnlocked);
    localStorage.setItem("nemuri_cards", JSON.stringify(newUnlocked));

    setLastGachaDate(todayStr);
    localStorage.setItem("nemuri_last_gacha_date", todayStr);

    if (uid) {
      try {
        await setDoc(doc(db, "users", uid), { lastGachaDate: todayStr }, { merge: true });
      } catch (e) {
        console.warn("ガチャ実施日記録スキップ:", e);
      }
    }

    confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
    setWonCard({ card: chosenCard, isNew: true });
    setGachaInput("");
  };

  const handleSendMessage = async () => {
    if (!msgName.trim() || !msgText.trim() || !uid) return;
    try {
      await addDoc(collection(db, "messages"), {
        uid,
        name: msgName,
        text: msgText,
        createdAt: serverTimestamp()
      });
      setMsgName(""); setMsgText("");
    } catch (err) {
      console.error(err);
      alert("メッセージの送信に失敗しました。");
    }
  };

  const missionPercent = mission && mission.targetPt > 0 
    ? Math.min(Math.round((mission.currentPt / mission.targetPt) * 100), 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-800 selection:bg-pink-200 font-sans">
      <main className="w-full max-w-[430px] bg-white min-h-screen shadow-2xl relative pb-20 overflow-x-hidden flex flex-col">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              
              {tab === "HOME" && (
                <div className="space-y-6 pb-6">
                  <div className="relative">
                    {config.headerImage ? (
                      <img src={config.headerImage} className="w-full h-48 object-cover bg-slate-200" alt="header" />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-r from-pink-200 to-purple-200" />
                    )}
                    <div className="absolute -bottom-10 left-6 flex items-end space-x-4">
                      {config.avatarImage ? (
                        <img src={config.avatarImage} className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-md object-cover" alt="avatar" />
                      ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-white bg-pink-100 shadow-md flex items-center justify-center text-2xl">
                          🌙
                        </div>
                      )}
                      <h1 className="text-xl font-bold pb-2 drop-shadow-md">{config.name}</h1>
                    </div>
                  </div>
                  <div className="pt-10 px-6 text-center">
                    <p className="text-sm font-bold text-pink-500 bg-pink-50 py-3 px-4 rounded-2xl border border-pink-100">{config.catchphrase}</p>
                  </div>
                  <div className="px-6 grid grid-cols-3 gap-2">
                    {config.snsLinks?.map((sns: any, i: number) => (
                      <a key={i} href={sns.url} target="_blank" rel="noreferrer" className="flex items-center justify-center space-x-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm">
                        <span>{sns.name}</span> <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ))}
                  </div>
                  <div className="px-6">
                    <h2 className="text-lg font-bold mb-3">News</h2>
                    <div className="space-y-2">
                      {news.map(n => (
                        <div key={n.id} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                          <button onClick={() => setOpenNews(prev => ({ ...prev, [n.id]: !prev[n.id] }))} className="w-full p-4 flex justify-between items-center text-left">
                            <div>
                              <span className="text-xs text-pink-500 font-bold block">{n.date}</span>
                              <span className="text-sm font-bold">{n.title}</span>
                            </div>
                            {openNews[n.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </button>
                          <AnimatePresence>
                            {openNews[n.id] && (
                              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{n.content}</p>
                                  {n.imageUrl && (
                                    <img
                                      src={n.imageUrl}
                                      alt=""
                                      className="w-full rounded-xl object-cover max-h-48 cursor-pointer border border-slate-100 hover:opacity-95 transition"
                                      onClick={() => setLightbox(n.imageUrl)}
                                    />
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "PROFILE" && (
                <div className="p-6 space-y-8">
                  <h2 className="text-center text-xl font-black tracking-wider">{config.profileTitle || "PROFILE"}</h2>
                  <div className="grid grid-cols-2 gap-3 bg-pink-50 p-4 rounded-2xl border border-pink-100">
                    {config.profileInfo?.map((info: any, i: number) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-2">
                        <div className="truncate">
                          <span className="text-[10px] text-slate-400 block mb-0.5">{info.label}</span>
                          <span className="text-xs font-bold text-slate-700">{info.value}</span>
                        </div>
                        {info.imageUrl && (
                          <img
                            src={info.imageUrl}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover border border-slate-100 flex-shrink-0 cursor-pointer"
                            onClick={() => setLightbox(info.imageUrl)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">{config.historyTitle || "HISTORY"}</h3>
                    <div className="flex flex-col items-center space-y-3">
                      {timeline.map((t, idx) => (
                        <div key={t.id} className="w-full flex flex-col items-center">
                          <div className="w-full bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                            <div className="text-xs font-bold text-pink-500 mb-1">{t.date}</div>
                            <div className="text-sm font-bold">{t.title}</div>
                            {t.mediaType === "youtube" && (
                              <div className="aspect-video w-full rounded-xl overflow-hidden mt-3"><iframe src={t.mediaUrl} className="w-full h-full" allowFullScreen></iframe></div>
                            )}
                            {t.mediaType === "image" && (
                              <div className="mt-3 cursor-pointer rounded-xl overflow-hidden" onClick={() => setLightbox(t.mediaUrl)}>
                                <img src={t.mediaUrl} className="w-full h-40 object-cover hover:opacity-90 transition" alt={t.title} />
                              </div>
                            )}
                          </div>
                          {idx !== timeline.length - 1 && <ChevronDown className="w-5 h-5 text-slate-300 my-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "VIP" && (
                <div className="p-6 space-y-8">
                  <h2 className="text-center text-xl font-black tracking-wider">{config.vipTitle || "サポート返礼"}</h2>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                    {config.vipRewards?.map((rew: any, i: number) => {
                      const text = typeof rew === "string" ? rew : rew.text;
                      const imageUrl = typeof rew === "string" ? "" : rew.imageUrl;

                      return (
                        <div key={i} className="flex items-center justify-between text-sm font-medium py-2 border-b border-slate-50 last:border-0 gap-3">
                          <div className="flex items-center space-x-3 truncate">
                            {i < 7 ? (
                              <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs flex-shrink-0">{i + 1}</span>
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"><Gift className="w-3 h-3 text-slate-400" /></span>
                            )}
                            <span className="truncate">{text}</span>
                          </div>
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 flex-shrink-0 cursor-pointer hover:scale-105 transition"
                              onClick={() => setLightbox(imageUrl)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-2">グッズ写真</span>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                      {config.goodsImages && config.goodsImages.length > 0 ? (
                        config.goodsImages.map((img: string, i: number) => (
                          <img key={i} src={img} className="w-40 h-28 object-cover rounded-xl shadow-sm cursor-pointer border border-slate-200 flex-shrink-0" onClick={() => setLightbox(img)} alt="goods" />
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 py-2">グッズ写真はまだありません</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-center text-lg font-bold mb-4">{config.supportersTitle || "歴代サポーター"}</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                      {supporters.map((sup) => (
                        <div key={sup.id} className="flex flex-col items-center flex-shrink-0 w-20">
                          <img src={sup.avatarUrl || "/api/placeholder/64/64"} className="w-16 h-16 rounded-2xl border-2 border-pink-200 p-0.5 object-cover shadow-sm mb-1" alt={sup.name} />
                          <span className="text-xs font-bold text-slate-700 truncate w-full text-center">{sup.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "MISSION" && (
                <div className="p-6 space-y-6">
                  {mission && (
                    <>
                      <div className="text-center">
                        <h2 className="text-base font-black text-slate-800">{mission.title}</h2>
                        <p className="text-xs text-pink-500 font-bold mt-1">{mission.subTitle || "応援よろしくお願いします！"}</p>
                      </div>
                      <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-slate-400">プログレスバー</span>
                          <span className="text-2xl font-black text-pink-500">{missionPercent}%</span>
                        </div>
                        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${missionPercent}%` }} className="h-full bg-gradient-to-r from-pink-300 to-pink-500 rounded-full" />
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>{(mission.currentPt || 0).toLocaleString()} pt</span>
                          <span>目標: {(mission.targetPt || 0).toLocaleString()} pt</span>
                        </div>
                      </div>
                      <div className="bg-pink-50/60 border border-pink-100 rounded-2xl p-4 space-y-2">
                        <span className="text-xs font-bold text-pink-500 block mb-2">公約・達成特典</span>
                        {mission.rewards?.map((r: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs font-medium text-slate-700 py-1 border-b border-pink-100/50 last:border-0">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-pink-500 border border-pink-100 flex-shrink-0">{r.step}</span>
                              <span className="truncate">{r.reward}</span>
                            </div>
                            {r.imageUrl && (
                              <img
                                src={r.imageUrl}
                                alt=""
                                className="w-7 h-7 rounded-md object-cover border border-pink-200 flex-shrink-0 ml-2 cursor-pointer hover:scale-105 transition"
                                onClick={() => setLightbox(r.imageUrl)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block">応援メッセージ掲示板</span>
                    <div className="space-y-2">
                      <input type="text" placeholder="お名前" value={msgName} onChange={e=>setMsgName(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border bg-slate-50 focus:bg-white outline-none" />
                      <textarea placeholder="メッセージ..." value={msgText} onChange={e=>setMsgText(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border bg-slate-50 focus:bg-white h-16 resize-none outline-none" />
                      <button onClick={handleSendMessage} className="w-full py-2 bg-pink-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-pink-600 transition">送信する</button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
                      {messages.map(m => (
                        <div key={m.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <span className="font-bold block mb-0.5 text-pink-600">{m.name}</span>
                          <p className="text-slate-600">{m.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "COLLECTION" && (
                <div className="p-6 space-y-6">
                  <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 text-center space-y-3 shadow-sm">
                    <div className="flex items-center justify-center space-x-2">
                      {config.avatarImage && (
                        <img src={config.avatarImage} className="w-10 h-10 rounded-full border border-pink-200 object-cover" alt="mini avatar" />
                      )}
                      <div className="bg-white px-3 py-1.5 rounded-2xl rounded-bl-none text-xs font-bold text-pink-600 shadow-sm">
                        {isCompleted
                          ? "すごい！全種類のイラストカードをコンプリートしました！🎉"
                          : (config.collectionBubbleText || "ネムリンのイラストカードをコンプしよう！")}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder={
                          isCompleted
                            ? "全カードコンプリート済みです！"
                            : hasPulledToday
                            ? "本日は獲得済みです（また明日！）"
                            : (config.collectionGachaPlaceholder || "合言葉を入力 (例: nemuri)")
                        }
                        value={gachaInput}
                        disabled={hasPulledToday || isCompleted}
                        onChange={e => setGachaInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !hasPulledToday && !isCompleted && handleGacha()}
                        className={`w-full text-center text-sm p-2 rounded-xl border outline-none transition ${
                          hasPulledToday || isCompleted
                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-white border-pink-200 focus:ring-2 focus:ring-pink-300"
                        }`}
                      />
                      <button
                        onClick={handleGacha}
                        disabled={hasPulledToday || isCompleted}
                        className={`w-full py-2.5 font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 ${
                          isCompleted
                            ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white cursor-default shadow-md"
                            : hasPulledToday
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                            : "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-md active:scale-95"
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <Trophy className="w-4 h-4" />
                            <span>全カードコンプリート達成！</span>
                          </>
                        ) : hasPulledToday ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-slate-500" />
                            <span>本日分は獲得済みです（毎日0時更新）</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>{config.collectionButtonText || "ガチャをひく (1日1回・ダブりなし)"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-[11px] font-bold text-slate-500 pt-1">
                      集めたカード: <span className="text-pink-600">{unlockedCards.length}</span> / {cards.length} 枚
                      {unobtainedCards.length > 0 && (
                        <span className="text-slate-400 ml-1.5 font-normal">
                          (残り未所持: {unobtainedCards.length}枚)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {cards.map(card => {
                      const isUnlocked = unlockedCards.includes(card.cardNumber);
                      return (
                        <div
                          key={card.id}
                          onClick={() => isUnlocked && setLightbox(card.imageUrl)}
                          className={`aspect-[3/4] rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                            isUnlocked
                              ? "bg-white border-pink-200 shadow-sm cursor-pointer hover:scale-105"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          {isUnlocked ? (
                            <>
                              <img src={card.imageUrl} className="w-full h-full object-cover" alt={card.title} />
                              <span className="absolute bottom-1 right-1 bg-black/50 text-white font-bold text-[9px] px-1.5 rounded-full">
                                #{card.cardNumber}
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-5 h-5 text-slate-300 mb-1" />
                              <span className="text-[9px] font-bold text-slate-400">#{card.cardNumber}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around items-center z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {[
            { id: "HOME", icon: Home }, { id: "PROFILE", icon: User },
            { id: "VIP", icon: Crown }, { id: "MISSION", icon: Flag },
            { id: "COLLECTION", icon: Gift }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-col items-center justify-center w-16 py-1 transition-colors ${
                tab === item.id ? "text-pink-500 font-bold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] tracking-tight">{item.id}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence>
          {wonCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6 backdrop-blur-sm"
              onClick={() => setWonCard(null)}
            >
              <motion.div
                initial={{ scale: 0.7, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 20 }}
                className="bg-white rounded-3xl p-5 max-w-[320px] w-full text-center space-y-4 shadow-2xl border-4 border-pink-200 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-wider bg-pink-100 text-pink-600 py-1 px-3 rounded-full inline-block">
                    🎉 NEW CARD GET!
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm">
                    No.{wonCard.card.cardNumber} {wonCard.card.title}
                  </h3>
                </div>

                <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-inner border border-slate-100 bg-slate-50 relative">
                  <img
                    src={wonCard.card.imageUrl}
                    alt={wonCard.card.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <button
                  onClick={() => setWonCard(null)}
                  className="w-full py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white font-bold text-xs rounded-xl shadow"
                >
                  コレクションに追加する
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {lightbox && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
              <button className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full"><X className="w-6 h-6" /></button>
              <img src={lightbox} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" alt="zoom" onClick={e => e.stopPropagation()} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}