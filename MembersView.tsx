
import React, { useState, useRef } from 'react';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { Member } from '../types';

interface MembersViewProps {
  members: Member[];
  onAddMember: (name: string) => void;
  onUpdateAvatar: (id: string, avatar: string) => void;
  onDeleteMember: (id: string) => void;
  onUpdateMemberInfo: (id: string, name: string, title: string) => void;
  isEditMode: boolean;
  driveUrl: string;
  onUpdateDriveUrl: (url: string) => void;
}

const MembersView: React.FC<MembersViewProps> = ({ 
  members, 
  onAddMember, 
  onUpdateAvatar, 
  onDeleteMember,
  onUpdateMemberInfo,
  isEditMode,
  driveUrl,
  onUpdateDriveUrl
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [newName, setNewName] = useState('');
  
  // 編輯成員資訊用狀態
  const [editNameValue, setEditNameValue] = useState('');
  const [editTitleValue, setEditTitleValue] = useState('');
  
  const [driveUrlInput, setDriveUrlInput] = useState(driveUrl);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (newName.trim()) {
      onAddMember(newName.trim());
      setNewName('');
      setShowInviteModal(false);
    }
  };

  const handleUpdateMemberSubmit = () => {
    if (currentEditId && editNameValue.trim()) {
      onUpdateMemberInfo(currentEditId, editNameValue.trim(), editTitleValue.trim());
      setShowEditMemberModal(false);
      setCurrentEditId(null);
    }
  };

  const handleCameraClick = (id: string) => {
    setCurrentEditId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentEditId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateAvatar(currentEditId, reader.result as string);
        setCurrentEditId(null);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDriveClick = () => {
    if (driveUrl) {
      window.open(driveUrl, '_blank');
    } else if (!isEditMode) {
      alert('尚未設定雲端連結，請聯絡管理員設定。');
    }
  };

  const handleSaveDriveUrl = () => {
    onUpdateDriveUrl(driveUrlInput);
    setShowDriveModal(false);
  };

  return (
    <div className="pb-24 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pt-6">
        <h1 className="text-3xl font-bold text-sage">成員清單</h1>
        <p className="text-earth-dark mt-1 font-bold">旅伴們一起快樂出遊</p>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="grid grid-cols-2 gap-4">
        {members.map(member => (
          <NordicCard key={member.id} className="text-center py-8 relative group overflow-visible">
            {isEditMode && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteMember(member.id); }}
                className="absolute -top-2 -right-2 w-7 h-7 bg-terracotta text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all z-10"
              >
                <i className="fa-solid fa-trash-can text-[10px]"></i>
              </button>
            )}

            <div className="relative inline-block mb-3">
              <img src={member.avatar} className="w-24 h-24 rounded-full border-4 border-slate shadow-inner object-cover" alt={member.name} />
              
              <div 
                onClick={(e) => { e.stopPropagation(); handleCameraClick(member.id); }}
                className="absolute bottom-0 right-0 bg-sage text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white cursor-pointer active:scale-90 transition-all shadow-md"
              >
                <i className="fa-solid fa-camera text-xs"></i>
              </div>
            </div>

            <div 
              onClick={() => {
                if (isEditMode) {
                  setCurrentEditId(member.id);
                  setEditNameValue(member.name);
                  setEditTitleValue(member.title || '');
                  setShowEditMemberModal(true);
                }
              }}
              className={`group/name flex flex-col items-center ${isEditMode ? 'cursor-pointer' : ''}`}
            >
              <h3 className="text-xl font-bold text-sage flex items-center gap-1.5">
                {member.name}
                {isEditMode && <i className="fa-solid fa-pen text-[10px] opacity-0 group-hover/name:opacity-100 transition-opacity"></i>}
              </h3>
              <span className="text-[10px] text-earth-dark font-bold uppercase tracking-widest block mt-1">
                {member.title || 'Adventure Buddy'}
              </span>
            </div>
          </NordicCard>
        ))}
        
        <NordicCard 
          onClick={() => setShowInviteModal(true)}
          className="border-2 border-dashed border-earth bg-white/40 flex flex-col items-center justify-center py-8 hover:bg-white hover:border-sage transition-all shadow-sm"
        >
          <div className="w-16 h-16 rounded-full border-2 border-earth border-dashed flex items-center justify-center mb-2">
            <i className="fa-solid fa-user-plus text-earth"></i>
          </div>
          <span className="text-sm font-bold text-earth">邀請新旅伴</span>
        </NordicCard>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="font-bold text-sage px-2 flex justify-between items-center">
          群組共同檔案
          {isEditMode && (
            <button 
              onClick={() => { setDriveUrlInput(driveUrl); setShowDriveModal(true); }}
              className="text-[10px] bg-sage/10 px-3 py-1 rounded-full text-sage hover:bg-sage hover:text-white transition-all"
            >
              <i className="fa-solid fa-link mr-1"></i> 設定連結
            </button>
          )}
        </h3>
        
        <NordicCard 
          onClick={handleDriveClick}
          className={`flex items-center gap-4 group transition-all ${driveUrl ? 'hover:border-sage' : ''}`}
        >
          <div className="w-12 h-12 rounded-xl bg-harbor/20 text-harbor flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <i className="fa-brands fa-google-drive"></i>
          </div>
          <div className="flex-grow">
            <h4 className="font-bold text-sage">共享雲端硬碟</h4>
            <p className="text-xs text-earth-dark font-bold">
              {driveUrl ? '點擊查看所有的行程照片' : '尚未設定雲端連結'}
            </p>
          </div>
          <i className={`fa-solid ${driveUrl ? 'fa-arrow-up-right-from-square' : 'fa-chevron-right'} text-earth-dark text-xs`}></i>
        </NordicCard>
      </div>

      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="邀請新旅伴">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">旅伴姓名</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="輸入姓名..."
              className="w-full p-4 bg-white border-2 border-paper rounded-2xl font-bold text-sage outline-none shadow-sm"
              autoFocus
            />
          </div>
          <NordicButton onClick={handleAdd} className="w-full py-4">
            確定加入
          </NordicButton>
        </div>
      </Modal>

      <Modal isOpen={showEditMemberModal} onClose={() => setShowEditMemberModal(false)} title="修改成員資訊">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">成員姓名</label>
            <input 
              type="text" 
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              className="w-full p-4 bg-white border-2 border-paper rounded-2xl font-bold text-sage outline-none shadow-sm"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">成員稱號</label>
            <input 
              type="text" 
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              placeholder="例如：專業導航、美食專家..."
              className="w-full p-4 bg-white border-2 border-paper rounded-2xl font-bold text-sage outline-none shadow-sm"
            />
          </div>
          <div className="pt-2">
            <NordicButton onClick={handleUpdateMemberSubmit} className="w-full py-4">
              儲存資訊
            </NordicButton>
            <button 
              onClick={() => { if(currentEditId) { onDeleteMember(currentEditId); setShowEditMemberModal(false); } }}
              className="w-full py-3 mt-2 text-stamp font-bold text-[10px] uppercase tracking-widest hover:underline"
            >
              <i className="fa-solid fa-user-minus mr-2"></i> 移除此成員
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDriveModal} onClose={() => setShowDriveModal(false)} title="設定雲端連結">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">Google Drive 網址</label>
            <textarea 
              value={driveUrlInput}
              onChange={(e) => setDriveUrlInput(e.target.value)}
              placeholder="貼上您的共享資料夾網址..."
              className="w-full p-4 bg-white border-2 border-paper rounded-2xl font-bold text-sage outline-none min-h-[100px] shadow-sm"
              autoFocus
            />
          </div>
          <p className="text-[10px] text-earth-dark italic px-1">設定完成後，全體旅伴點擊卡片即可開啟此連結。</p>
          <NordicButton onClick={handleSaveDriveUrl} className="w-full py-4">
            儲存連結設定
          </NordicButton>
        </div>
      </Modal>
    </div>
  );
};

export default MembersView;
