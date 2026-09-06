"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { Home, User, Crown, Flag, Gift, ChevronDown, ChevronUp, Lock, ExternalLink, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// Firestoreが空の場合のデフォルトデータ（Loading停止を防止）
const DEFAULT_CONFIG = {
  name: "百合加護ねむり",
  catchphrase: "あなたの夜にそっと寄り添う、安眠系VTuber。",
  headerImage: "",
  avatarImage: "",
  snsLinks: [
    { name: "YouTube", url: "https://youtube.com" },
    { name: "X (Twitter)", url: "https://twitter.com" }
  ],
  profileInfo: [
    { label: "誕生日", value: "9月1日" },
    { label: "ファンネーム", value: "ねむりんちゅ" }
  ],
  vipRewards: ["限定お礼ボイス", "デジタル会員証", "限定イラストカード"],
  goodsImages: []
};

export default function App() {
  const [tab, setTab] = useState("HOME");
  const [uid, setUid] = useState<string | null>(null);
  
  // Data States（初期値にフォールバックを設定してブロックを防止）
  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [news, setNews] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [supporters, setSupporters] = useState<any[]>([]);
  const [mission, setMission] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  
  // UI States
  const [openNews, setOpenNews] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [unlockedCards, setUnlockedCards] = useState<number[]>([]);
  const [gachaInput, setGachaInput] = useState("");
  const [msgName, setMsgName] = useState("");
  const [msgText, setMsgText] = useState("");

  useEffect(() => {
    // 匿名ログイン
    signInAnonymously(auth).catch(console.error);
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
    });

    // LocalStorageから獲得済みカードを復元
    try {
      const storedCards = localStorage.getItem("nemuri_cards");
      if (storedCards) setUnlockedCards(JSON.parse(storedCards));
    } catch (e) {
      console.warn("LocalStorage read error:", e);
    }

    // Firestore リアルタイムリスナー
    const unsubConfig = onSnapshot(doc(db, "app_config", "global"), (d) => {
      if (d.exists()) {
        setConfig(d.data());
      }
    }, (err) => console.warn("config snapshot error:", err));

    const unsubMission = onSnapshot(doc(db, "mission", "main"), (d) => {
      if (d.exists()) {
        setMission(d.data());
      }
    }, (err) => console.warn("mission snapshot error:", err));

    const unsubNews = onSnapshot(query(collection(db, "news"), orderBy("createdAt", "desc")), 
      (s) => setNews(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.warn("news snapshot error:", err)
    );

    const unsubTimeline = onSnapshot(query(collection(db, "timeline"), orderBy("order", "asc")), 
      (s) => setTimeline(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.warn("timeline snapshot error:", err)
    );

    const unsubSupporters = onSnapshot(query(collection(db, "supporters"), orderBy("order", "asc")), 
      (s) => setSupporters(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.warn("supporters snapshot error:", err)
    );

    const unsubMessages = onSnapshot(query(collection(db, "messages"), orderBy("createdAt", "desc")), 
      (s) => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.warn("messages snapshot error:", err)
    );

    const unsubCards = onSnapshot(query(collection(db, "cards"), orderBy("cardNumber", "asc")), 
      (s) => setCards(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.warn("cards snapshot error:", err)
    );

    return () => {
      unsubAuth(); unsubConfig(); unsubMission(); unsubNews();
      unsubTimeline(); unsubSupporters(); unsubMessages(); unsubCards();
    };
  }, []);

  const handleGacha = () => {
    const input = gachaInput.trim().toLowerCase();
    const matchedCard = cards.find(c => c.keyword && c.keyword.toLowerCase() === input);
    
    if (matchedCard) {
      if (!unlockedCards.includes(matchedCard.cardNumber)) {
        const newUnlocked = [...unlockedCards, matchedCard.cardNumber];
        setUnlockedCards(newUnlocked);
        localStorage.setItem("nemuri_cards", JSON.stringify(newUnlocked));
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        alert(`🎉 カード「${matchedCard.title}」を解放しました！`);
      } else {
        alert("すでに持っているカードです！");
      }
    } else {
      alert("合言葉が違います。配信をチェックしてね！");
    }
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
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              
              {/* HOME */}
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
                      <h1 className="text-xl font-bold pb-2 drop-shadow-md">{config.name || "百合加護ねむり"}</h1>
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
                      {news.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">お知らせはまだありません</p>
                      ) : (
                        news.map(n => (
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
                                  <p className="px-4 pb-4 text-xs text-slate-600 whitespace-pre-wrap border-t pt-3">{n.content}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PROFILE */}
              {tab === "PROFILE" && (
                <div className="p-6 space-y-8">
                  <h2 className="text-center text-xl font-black tracking-wider">PROFILE</h2>
                  <div className="grid grid-cols-2 gap-3 bg-pink-50 p-4 rounded-2xl border border-pink-100">
                    {config.profileInfo?.map((info: any, i: number) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-xs text-slate-400 block mb-0.5">{info.label}</span>
                        <span className="text-sm font-bold text-slate-700">{info.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">HISTORY</h3>
                    <div className="flex flex-col items-center space-y-3">
                      {timeline.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4">活動履歴はまだありません</p>
                      ) : (
                        timeline.map((t, idx) => (
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
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIP */}
              {tab === "VIP" && (
                <div className="p-6 space-y-8">
                  <h2 className="text-center text-xl font-black tracking-wider">サポート返礼</h2>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                    {config.vipRewards?.map((reward: string, i: number) => (
                      <div key={i} className="flex items-center space-x-3 text-sm font-medium py-1.5 border-b border-slate-50 last:border-0">
                        {i < 7 ? (
                          <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs flex-shrink-0">{i + 1}</span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"><Gift className="w-3 h-3 text-slate-400" /></span>
                        )}
                        <span>{reward}</span>
                      </div>
                    ))}
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
                    <h3 className="text-center text-lg font-bold mb-4">歴代サポーター</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                      {supporters.length === 0 ? (
                        <p className="text-xs text-slate-400 w-full text-center py-2">サポーター募集中！</p>
                      ) : (
                        supporters.map((sup) => (
                          <div key={sup.id} className="flex flex-col items-center flex-shrink-0 w-20">
                            <img src={sup.avatarUrl || "/api/placeholder/64/64"} className="w-16 h-16 rounded-2xl border-2 border-pink-200 p-0.5 object-cover shadow-sm mb-1" alt={sup.name} />
                            <span className="text-xs font-bold text-slate-700 truncate w-full text-center">{sup.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MISSION */}
              {tab === "MISSION" && (
                <div className="p-6 space-y-6">
                  {mission ? (
                    <>
                      <div className="text-center">
                        <h2 className="text-base font-black text-slate-800">{mission.title}</h2>
                        <p className="text-xs text-pink-500 font-bold mt-1">応援よろしくお願いします！</p>
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
                          <div key={i} className="flex items-center space-x-2 text-xs font-medium text-slate-700">
                            <span className="bg-white px-2 py-0.5 rounded-md font-bold text-pink-500 border border-pink-100">{r.step}</span>
                            <span>{r.reward}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="bg-pink-50 border border-pink-100 rounded-2xl p-6 text-center">
                      <p className="text-sm font-bold text-pink-500">現在開催中のミッションはありません</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block">応援メッセージ掲示板</span>
                    <div className="space-y-2">
                      <input type="text" placeholder="お名前" value={msgName} onChange={e=>setMsgName(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border bg-slate-50 focus:bg-white outline-none" />
                      <textarea placeholder="メッセージ..." value={msgText} onChange={e=>setMsgText(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border bg-slate-50 focus:bg-white h-16 resize-none outline-none" />
                      <button onClick={handleSendMessage} className="w-full py-2 bg-pink-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-pink-600 transition">送信する</button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
                      {messages.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">最初のメッセージを送ってみよう！</p>
                      ) : (
                        messages.map(m => (
                          <div key={m.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                            <span className="font-bold block mb-0.5 text-pink-600">{m.name}</span>
                            <p className="text-slate-600">{m.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* COLLECTION */}
              {tab === "COLLECTION" && (
                <div className="p-6 space-y-6">
                  <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 text-center space-y-3 shadow-sm">
                    <div className="flex items-center justify-center space-x-2">
                      {config.avatarImage && (
                        <img src={config.avatarImage} className="w-10 h-10 rounded-full border border-pink-200 object-cover" alt="mini avatar" />
                      )}
                      <div className="bg-white px-3 py-1.5 rounded-2xl rounded-bl-none text-xs font-bold text-pink-600 shadow-sm">ネムリンのイラストカードをコンプしよう！</div>
                    </div>
                    <input type="text" placeholder="合言葉を入力 (例: nemuri)" value={gachaInput} onChange={e=>setGachaInput(e.target.value)} className="w-full text-center text-sm p-2 rounded-xl border border-pink-200 outline-none" />
                    <button onClick={handleGacha} className="w-full py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition">ガチャをひく</button>
                  </div>
                  
                  {/* 横3列 × 縦無制限 グリッド */}
                  <div className="grid grid-cols-3 gap-2">
                    {cards.length === 0 ? (
                      <p className="col-span-3 text-xs text-slate-400 text-center py-8">カードがまだ登録されていません</p>
                    ) : (
                      cards.map(card => {
                        const isUnlocked = unlockedCards.includes(card.cardNumber);
                        return (
                          <div key={card.id} onClick={() => isUnlocked && setLightbox(card.imageUrl)} className={`aspect-[3/4] rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${isUnlocked ? 'bg-white border-pink-200 shadow-sm cursor-pointer hover:scale-105' : 'bg-slate-50 border-slate-200'}`}>
                            {isUnlocked ? (
                              <>
                                <img src={card.imageUrl} className="w-full h-full object-cover" alt={card.title} />
                                <span className="absolute bottom-1 right-1 bg-black/50 text-white font-bold text-[9px] px-1.5 rounded-full">#{card.cardNumber}</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-5 h-5 text-slate-300 mb-1" />
                                <span className="text-[9px] font-bold text-slate-400">#{card.cardNumber}</span>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ナビゲーションバー */}
        <nav className="absolute bottom-0 left-0 w-full h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around items-center z-40">
          {[
            { id: "HOME", icon: Home }, { id: "PROFILE", icon: User },
            { id: "VIP", icon: Crown }, { id: "MISSION", icon: Flag },
            { id: "COLLECTION", icon: Gift }
          ].map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center w-16 py-1 transition-colors ${tab === item.id ? "text-pink-500 font-bold" : "text-slate-400 hover:text-slate-600"}`}>
              <item.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px]">{item.id}</span>
            </button>
          ))}
        </nav>

        {/* ライトボックス（画像拡大表示） */}
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