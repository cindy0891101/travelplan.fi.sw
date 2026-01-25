import React, { useState } from 'react';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { Member } from '../types';

interface MembersViewProps {
  members: Member[];
  onAddMember: (name: string) => void;
}

const MembersView: React.FC<MembersViewProps> = ({ members, onAddMember }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      onAddMember(newName.trim());
      setNewName('');
      setShowInviteModal(false);
    }
  };

  return (
    <div className="pb-24 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pt-6">
        <h1 className="text-3xl font-bold text-sage">成員清單</h1>
        <p className="text-earth-dark mt-1 font-bold">旅伴們一起快樂出遊</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {members.map(member => (
          <NordicCard key={member.id} className="text-center py-8">
            <div className="relative inline-block mb-3">
              <img src={member.avatar} className="w-24 h-24 rounded-full border-4 border-slate shadow-inner" alt={member.name} />
              <div className="absolute bottom-0 right-0 bg-sage text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white cursor-pointer active:scale-90 transition-all">
                <i className="fa-solid fa-camera text-xs"></i>
              </div>
            </div>
            <h3 className="text-xl font-bold text-sage">{member.name}</h3>
            <span className="text-[10px] text-earth-dark font-bold uppercase tracking-widest block mt-1">Adventure Buddy</span>
          </NordicCard>
        ))}
        
        <NordicCard 
          onClick={() => setShowInviteModal(true)}
          className="border-2 border-dashed border-earth bg-white/30 flex flex-col items-center justify-center py-8 opacity-60 hover:opacity-100 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full border-2 border-earth border-dashed flex items-center justify-center mb-2">
            <i className="fa-solid fa-user-plus text-earth"></i>
          </div>
          <span className="text-sm font-bold text-earth">邀請新旅伴</span>
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
              className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage outline-none"
              autoFocus
            />
          </div>
          <NordicButton onClick={handleAdd} className="w-full py-4">
            確定加入
          </NordicButton>
        </div>
      </Modal>

      <div className="mt-8 space-y-4">
        <h3 className="font-bold text-sage px-2">群組共同檔案</h3>
        <NordicCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-morandi-blue/20 text-morandi-blue flex items-center justify-center text-xl">
            <i className="fa-solid fa-folder-open"></i>
          </div>
          <div className="flex-grow">
            <h4 className="font-bold text-sage">共享雲端硬碟</h4>
            <p className="text-xs text-earth-dark font-bold">點擊查看所有的行程照片</p>
          </div>
          <i className="fa-solid fa-chevron-right text-earth-dark"></i>
        </NordicCard>
      </div>
    </div>
  );
};

export default MembersView;