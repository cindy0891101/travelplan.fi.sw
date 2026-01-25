import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy,
  getDocs
} from "firebase/firestore";
import { Expense, Member } from './types';

// 1. 使用你真實的 Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyChx0Ro7ArYxM1CQcBf41mq63p4AEVWZC4",
  authDomain: "fi-travel.firebaseapp.com",
  projectId: "fi-travel",
  storageBucket: "fi-travel.firebasestorage.app",
  messagingSenderId: "158292900207",
  appId: "1:158292900207:web:40d53c028906d66b88109a",
  measurementId: "G-GC0JGS4LJB"
};

// 2. 初始化實例
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 3. 封裝資料庫功能
export const dbService = {
  // 監聽行程更新
  subscribeSchedule: (callback: (data: any) => void) => {
    const q = query(collection(db, "schedules"), orderBy("time"));
    return onSnapshot(q, (snapshot) => {
      const data: any = {};
      snapshot.forEach((doc) => {
        const item = doc.data();
        const date = item.date;
        if (!data[date]) data[date] = [];
        data[date].push({ id: doc.id, ...item });
      });
      callback(data);
    });
  },

  // 新增支出
  saveExpense: async (expense: Omit<Expense, 'id'>) => {
    try {
      await addDoc(collection(db, "expenses"), { 
        ...expense, 
        createdAt: new Date() 
      });
    } catch (e) {
      console.error("Firebase 儲存失敗，改存本地", e);
      const current = JSON.parse(localStorage.getItem('expenses') || '[]');
      localStorage.setItem('expenses', JSON.stringify([{ id: Date.now().toString(), ...expense }, ...current]));
    }
  },

  // 獲取成員
  getMembers: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "members"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      return JSON.parse(localStorage.getItem('members') || '[]');
    }
  }
};