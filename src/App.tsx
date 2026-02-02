
import React, { useState, useEffect } from 'react';
import ScheduleView from './views/ScheduleView';
import BookingsView from './views/BookingsView';
import ExpenseView from './views/ExpenseView';
import PlanningView from './views/PlanningView';
import MembersView from './views/MembersView';
import { Modal, NordicButton } from './components/Shared';
import type{ Member } from './types';
import { dbService } from './firebaseService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'bookings' | 'expense' | 'planning' | 'members'>('schedule');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [sharedDriveUrl, setSharedDriveUrl] = useState<string>('');

  useEffect(() => {
    dbService.initAuth().catch(() => console.log("Auth initialized in local mode"));
  }, []);

  useEffect(() => {
    const unsubscribeMembers = dbService.subscribeField('members', (data) => {
      if (data && Array.isArray(data)) {
        setMembers(data);
      } else if (data === undefined) {
        dbService.updateField('members', []);
      }
    });
    
    const unsubscribeDrive = dbService.subscribeField('sharedDriveUrl', (data) => {
      setSharedDriveUrl(data || '');
    });
    
    return () => {
      if (typeof unsubscribeMembers === 'function') unsubscribeMembers();
      if (typeof unsubscribeDrive === 'function') unsubscribeDrive();
    };
  }, []);

  const saveMembersToCloud = (updatedMembers: Member[]) => {
    setMembers(updatedMembers);
    dbService.updateField('members', updatedMembers);
  };

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

  const addMember = (name: string) => {
    const newMember: Member = {
      id: Date.now().toString(),
      name,
      title: 'Adventure Buddy',
      avatar: `https://picsum.photos/seed/${Math.random()}/100/100`
    };
    saveMembersToCloud([...members, newMember]);
  };

  const deleteMember = (id: string) => {
    const nextMembers = members.filter(m => m.id !== id);
    saveMembersToCloud(nextMembers);
  };

  const updateMemberAvatar = (id: string, avatar: string) => {
    saveMembersToCloud(members.map(m => m.id === id ? { ...m, avatar } : m));
  };

  const updateMemberInfo = (id: string, name: string, title: string) => {
    saveMembersToCloud(members.map(m => m.id === id ? { ...m, name, title } : m));
  };

  const updateSharedDriveUrl = (url: string) => {
    setSharedDriveUrl(url);
    dbService.updateField('sharedDriveUrl', url);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule': 
        return <ScheduleView isEditMode={isEditMode} onToggleLock={handleToggleLock} />;
      case 'bookings': 
        return <BookingsView isEditMode={isEditMode} onToggleLock={handleToggleLock} />;
      case 'expense': 
        return <ExpenseView members={members || []} />;
      case 'planning': 
        return <PlanningView members={members || []} />;
      case 'members': 
        return (
          <MembersView 
            members={members || []} 
            onAddMember={addMember} 
            onUpdateAvatar={updateMemberAvatar}
            onDeleteMember={deleteMember}
            onUpdateMemberInfo={updateMemberInfo}
            isEditMode={isEditMode}
            onToggleLock={handleToggleLock}
            driveUrl={sharedDriveUrl}
            onUpdateDriveUrl={updateSharedDriveUrl}
          />
        );
      default: return <ScheduleView isEditMode={isEditMode} onToggleLock={handleToggleLock} />;
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
    <div className="min-h-screen max-w-lg mx-auto bg-cream overflow-x-hidden relative flex flex-col">
      {/* iOS Status Bar Spacer */}
      <div className="pt-[env(safe-area-inset-top)] flex-shrink-0" />

      {/* Main content with padding adjustment */}
      <main className="w-full flex-grow overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {renderContent()}
      </main>

      <Modal isOpen={showLockModal} onClose={() => setShowLockModal(false)} title="啟用編輯權限">
        <div className="space-y-4 text-center overflow-x-hidden">
          <p className="text-steel text-sm font-bold">請輸入編輯密碼以開啟修改功能</p>
          <input 
            type="password" 
            value={pinInput} 
            onChange={(e) => setPinInput(e.target.value)} 
            className="w-full p-4 text-center text-3xl tracking-[0.5em] bg-white border-2 border-paper rounded-2xl focus:border-harbor transition-colors" 
            placeholder="***"
            maxLength={3} 
            autoFocus 
          />
          <NordicButton onClick={handleVerifyPin} className="w-full py-4">
            確認驗證
          </NordicButton>
        </div>
      </Modal>

      {/* Nav with Safe Area handling */}
      <nav className="fixed bottom-0 left-0 right-0 glass-nav z-50">
        <div className="max-w-lg mx-auto flex justify-around items-center h-20 px-4">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 relative ${active ? 'text-harbor' : 'text-cream/40'}`}
              >
                {active && (
                  <div className="absolute top-[-12px] w-12 h-1.5 bg-harbor rounded-full animate-in fade-in zoom-in duration-300"></div>
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
