import React, { useState, useEffect } from 'react';
import { db } from './firebaseService'; 
import { collection, addDoc, onSnapshot, query } from "firebase/firestore"; 
import ScheduleView from './views/ScheduleView';
import BookingsView from './views/BookingsView';
import ExpenseView from './views/ExpenseView';
import PlanningView from './views/PlanningView';
import MembersView from './views/MembersView';
import { Modal, NordicButton } from './components/Shared';
import { MOCK_MEMBERS } from './constants';
import { Member } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'bookings' | 'expense' | 'planning' | 'members'>('schedule');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // 1. 成員狀態：從 Firebase 即時同步
  const [members, setMembers] = useState<Member[]>([]);

  // 2. 當 App 啟動時，自動從 Firebase 監聽資料
  useEffect(() => {
    const q = query(collection(db, "members"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const membersArray: Member[] = [];
      querySnapshot.forEach((doc) => {
        membersArray.push({ ...doc.data(), id: doc.id } as Member);
      });
      // 如果 Firebase 沒資料，先用預設的 MOCK_MEMBERS
      setMembers(membersArray.length > 0 ? membersArray : MOCK_MEMBERS);
    });

    return () => unsubscribe(); 
  }, []);

  const handleToggleLock = () => {
    if (isEditMode) {
      setIsEditMode(false);
    } else {
      setShowLockModal(true);
    }
  };

  const handleVerifyPin = () => {
    if (pinInput === '007') {
      setIsEditMode(true);
      setShowLockModal(false);
      setPinInput('');
    } else {
      alert('密碼錯誤！');
      setPinInput('');
    }
  };

  // 3. 修改新增成員函式：同步寫入 Firebase
  const addMember = async (name: string) => {
    const newMemberData = {
      name,
      avatar: `https://picsum.photos/seed/${Math.random()}/100/100`
    };
    
    try {
      await addDoc(collection(db, "members"), newMemberData);
    } catch (e) {
      console.error("Firebase 寫入失敗: ", e);
      alert("儲存失敗，請檢查資料庫權限！");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule': return <ScheduleView isEditMode={isEditMode} />;
      case 'bookings': return <BookingsView isEditMode={isEditMode} />;
      case 'expense': return <ExpenseView members={members} />;
      case 'planning': return <PlanningView members={members} />;
      case 'members': return <MembersView members={members} onAddMember={addMember} />;
      default: return <ScheduleView isEditMode={isEditMode} />;
    }
  };

  const navItems = [
    { id: 'schedule', icon: 'fa-calendar-days', label: '行程' },
    { id: 'bookings', icon: 'fa-ticket', label: '預訂' },
    { id: 'expense', icon: 'fa-wallet', label: '記帳' },
    { id: 'planning', icon: 'fa-list-check', label: '準備' },
    { id: 'members', icon: 'fa-user-group', label: '成員' }
  ];

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-cream pb-20 overflow-x-hidden relative">
      <header className="px-4 pt-4 flex justify-end items-center h-14">
        <button 
          onClick={handleToggleLock}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border-2 ${
            isEditMode ? 'bg-terracotta text-white border-white' : 'bg-white text-earth border-slate'
          }`}
        >
          <i className={`fa-solid ${isEditMode ? 'fa-lock-open' : 'fa-lock'}`}></i>
        </button>
      </header>

      <main className="w-full overflow-x-hidden">
        {renderContent()}
      </main>

      <Modal isOpen={showLockModal} onClose={() => setShowLockModal(false)} title="啟用編輯權限">
        <div className="space-y-4 text-center overflow-x-hidden">
          <p className="text-earth-dark text-sm font-bold">請輸入編輯密碼以開啟修改功能</p>
          <input 
            type="password" 
            value={pinInput} 
            onChange={(e) => setPinInput(e.target.value)} 
            className="w-full p-4 text-center text-3xl tracking-[0.5em] bg-white border-2 border-slate rounded-2xl focus:border-sage transition-colors" 
            placeholder="***"
            maxLength={3} 
            autoFocus 
          />
          <NordicButton onClick={handleVerifyPin} className="w-full py-4">
            確認驗證
          </NordicButton>
        </div>
      </Modal>

      <nav className="fixed bottom-0 left-0 right-0 glass-nav border-t border-slate/50 z-50">
        <div className="max-w-lg mx-auto flex justify-around items-center h-20 px-4">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 relative ${active ? 'text-sage' : 'text-earth'}`}
              >
                {active && (
                  <div className="absolute top-[-12px] w-12 h-1.5 bg-sage rounded-full animate-in fade-in zoom-in duration-300"></div>
                )}
                <i className={`fa-solid ${item.icon} text-xl mb-1 ${active ? 'scale-110' : ''}`}></i>
                <span className={`text-[10px] font-bold tracking-wider uppercase ${active ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default App;