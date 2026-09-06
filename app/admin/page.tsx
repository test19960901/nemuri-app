"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Data States
  const [config, setConfig] = useState<any>({});
  const [mission, setMission] = useState<any>({});
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      // 匿名ログインのリスナーは管理者と判定しない
      if (u && !u.isAnonymous) {
        setUser(u);
        try {
          const confSnap = await getDoc(doc(db, "app_config", "global"));
          if (confSnap.exists()) setConfig(confSnap.data());
          
          const misSnap = await getDoc(doc(db, "mission", "main"));
          if (misSnap.exists()) setMission(misSnap.data());

          const cardsSnap = await getDocs(collection(db, "cards"));
          setCards(
            cardsSnap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a: any, b: any) => (a.cardNumber || 0) - (b.cardNumber || 0))
          );
        } catch (err) {
          console.warn("初期データ取得警告:", err);
        }
      } else {
        setUser(null);
      }
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      alert("ログイン失敗: " + err.message);
    }
  };

  const uploadImage = async (file: File) => {
    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const saveConfig = async () => {
    try {
      await setDoc(doc(db, "app_config", "global"), config, { merge: true });
      alert("一般設定を保存しました。");
    } catch (err: any) {
      alert("保存失敗: " + err.message);
    }
  };

  const saveMission = async () => {
    try {
      await setDoc(doc(db, "mission", "main"), mission, { merge: true });
      alert("ミッション設定を保存しました。");
    } catch (err: any) {
      alert("保存失敗: " + err.message);
    }
  };

  const addCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("image") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    const cardNumber = Number((form.elements.namedItem("cardNumber") as HTMLInputElement).value);
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const keyword = (form.elements.namedItem("keyword") as HTMLInputElement).value;
    
    if (!file) return alert("画像を選択してください");
    
    setIsUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      const docRef = await addDoc(collection(db, "cards"), { cardNumber, title, keyword, imageUrl });
      
      setCards(prev => [...prev, { id: docRef.id, cardNumber, title, keyword, imageUrl }]
        .sort((a, b) => a.cardNumber - b.cardNumber));
      
      form.reset();
      alert("カードを追加しました！");
    } catch(err: any) {
      alert("追加失敗: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteCard = async (id: string) => {
    if (confirm("本当に削除しますか？")) {
      try {
        await deleteDoc(doc(db, "cards", id));
        setCards(cards.filter(c => c.id !== id));
      } catch (err: any) {
        alert("削除失敗: " + err.message);
      }
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm space-y-4">
          <h1 className="font-bold text-xl text-center text-slate-800 mb-6">管理者ログイン</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full p-2 border rounded-xl bg-slate-50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full p-2 border rounded-xl bg-slate-50"
          />
          <button type="submit" className="w-full py-2 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition">
            ログイン
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
          <h1 className="font-bold text-xl text-slate-800">百合加護ねむり ダッシュボード</h1>
          <button onClick={() => signOut(auth)} className="text-sm text-red-500 font-bold border border-red-500 px-4 py-1 rounded-full hover:bg-red-50">
            ログアウト
          </button>
        </div>

        {/* 基本設定 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="font-bold border-b pb-2">基本設定 (HOME)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block">キャッチコピー</label>
              <input type="text" value={config.catchphrase || ""} onChange={e => setConfig({...config, catchphrase: e.target.value})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block">名前</label>
              <input type="text" value={config.name || ""} onChange={e => setConfig({...config, name: e.target.value})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block">ヘッダー画像URL</label>
              <input type="text" value={config.headerImage || ""} onChange={e => setConfig({...config, headerImage: e.target.value})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block">アバター画像URL</label>
              <input type="text" value={config.avatarImage || ""} onChange={e => setConfig({...config, avatarImage: e.target.value})} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
          <button onClick={saveConfig} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition">
            基本設定を保存
          </button>
        </div>

        {/* MISSION 設定 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="font-bold border-b pb-2">MISSION 設定</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 block">イベント名</label>
              <input type="text" value={mission.title || ""} onChange={e => setMission({...mission, title: e.target.value})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block">現在ポイント</label>
              <input type="number" value={mission.currentPt || 0} onChange={e => setMission({...mission, currentPt: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block">目標ポイント</label>
              <input type="number" value={mission.targetPt || 0} onChange={e => setMission({...mission, targetPt: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
          <button onClick={saveMission} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition">
            MISSIONを保存
          </button>
        </div>

        {/* ガチャカード管理 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="font-bold border-b pb-2">ガチャカード管理 (無制限追加)</h2>
          
          <form onSubmit={addCard} className="bg-slate-50 p-4 rounded-xl space-y-3 border">
            <h3 className="font-bold text-sm text-slate-700">新規カードの追加</h3>
            <div className="grid grid-cols-3 gap-3">
              <input name="cardNumber" type="number" placeholder="No. (例: 10)" required className="p-2 border rounded-lg text-sm" />
              <input name="title" type="text" placeholder="カード名" required className="p-2 border rounded-lg text-sm" />
              <input name="keyword" type="text" placeholder="合言葉" required className="p-2 border rounded-lg text-sm" />
            </div>
            <input name="image" type="file" required className="block w-full text-sm" accept="image/*" />
            <button
              type="submit"
              disabled={isUploading}
              className={`bg-pink-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition ${isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-pink-600"}`}
            >
              {isUploading ? "アップロード中..." : "アップロードして追加"}
            </button>
          </form>

          <div className="grid grid-cols-4 gap-3 mt-4">
            {cards.map(c => (
              <div key={c.id} className="border rounded-lg p-2 flex flex-col items-center bg-white shadow-sm">
                <img src={c.imageUrl} className="w-full h-24 object-cover rounded mb-2" alt={c.title} />
                <span className="font-bold text-xs">No.{c.cardNumber}</span>
                <span className="text-[10px] text-slate-500 break-all">{c.keyword}</span>
                <button onClick={() => deleteCard(c.id)} className="mt-2 text-red-500 text-xs font-bold border border-red-200 px-2 rounded hover:bg-red-50">
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}