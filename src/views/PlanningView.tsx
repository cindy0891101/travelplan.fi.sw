import React, { useState, useEffect, useRef } from 'react';
import { NordicButton, NordicCard, Modal } from '../components/Shared';
import type{ TodoItem, ChecklistItem, Member, PackingCategory } from '../types';
import { dbService } from '../firebaseService';

type ListCategory = 'packing' | 'shopping' | 'info';

interface TravelInfo {
  id: string;
  text: string;
  authorId: string;
  imageUrl?: string;
  createdAt: number;
}

const PACKING_CATS: { id: PackingCategory, label: string, icon: string }[] = [
  { id: 'Essential', label: '必帶物品', icon: 'fa-passport' },
  { id: 'Gadgets', label: '3C用品', icon: 'fa-laptop' },
  { id: 'Clothing', label: '服飾衣著', icon: 'fa-shirt' },
  { id: 'Beauty', label: '美妝保養', icon: 'fa-bottle-droplet' },
  { id: 'Daily', label: '生活小物', icon: 'fa-soap' },
  { id: 'Others', label: '其他', icon: 'fa-ellipsis' }
];

interface PlanningViewProps {
  members: Member[];
}

const PlanningView: React.FC<PlanningViewProps> = ({ members }) => {
  const [activeTab, setActiveTab] = useState<'todo' | ListCategory>('todo');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<PackingCategory>>(new Set(PACKING_CATS.map(c => c.id)));
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [listData, setListData] = useState<Record<string, Record<'packing' | 'shopping', ChecklistItem[]>>>({});
  const [travelInfos, setTravelInfos] = useState<TravelInfo[]>([]);

  const [infoText, setInfoText] = useState('');
  const [infoImage, setInfoImage] = useState<string | null>(null);
  const [currentAuthorId, setCurrentAuthorId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (members.length > 0 && !currentAuthorId) {
      setCurrentAuthorId(members[0].id);
    }
  }, [members, currentAuthorId]);

  useEffect(() => {
    const unsubTodo = dbService.subscribeField('todos', (data) => setTodos(data || []));
    const unsubList = dbService.subscribeField('listData', (data) => setListData(data || {}));
    const unsubInfo = dbService.subscribeField('travelInfos', (data) => setTravelInfos(data || []));
    return () => { unsubTodo(); unsubList(); unsubInfo(); };
  }, []);

  const updatePlanningCloud = (field: string, value: any) => dbService.updateField(field, value);

  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [todoInput, setTodoInput] = useState({ text: '', assignedTo: 'ALL' });
  const [newItem, setNewItem] = useState<{ text: string, category: PackingCategory }>({ text: '', category: 'Essential' });

  const toggleCategory = (catId: PackingCategory) => {
    const next = new Set(expandedCats);
    if (next.has(catId)) next.delete(catId);
    else next.add(catId);
    setExpandedCats(next);
  };

  const handlePostInfo = () => {
    const trimmedText = infoText.trim();
    if (!trimmedText && !infoImage) return;
    if (!currentAuthorId) {
      alert("請先前往『成員』分頁新增旅伴");
      return;
    }

    const newInfo: TravelInfo = {
      id: Date.now().toString(),
      text: trimmedText,
      authorId: currentAuthorId,
      createdAt: Date.now()
    };
    
    // 修正：Firestore 不支援 undefined，僅在有值時添加屬性
    if (infoImage) {
      newInfo.imageUrl = infoImage;
    }

    const next = [newInfo, ...travelInfos];
    updatePlanningCloud('travelInfos', next);
    setInfoText('');
    setInfoImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInfoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInfoImage(reader.result as string);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteInfo = (id: string) => {
    updatePlanningCloud('travelInfos', travelInfos.filter(i => i.id !== id));
  };

  const handleAddTodo = () => {
    const trimmedText = todoInput.text.trim();
    if (!trimmedText) return;
    const next = [{ id: Date.now().toString(), text: trimmedText, completed: false, assignedTo: todoInput.assignedTo }, ...todos];
    updatePlanningCloud('todos', next);
    setShowAddTodo(false);
    setTodoInput({ text: '', assignedTo: 'ALL' });
  };

  const deleteTodo = (id: string) => {
    updatePlanningCloud('todos', todos.filter(t => t.id !== id));
  };

  const handleAddItem = () => {
    const trimmedText = newItem.text.trim();
    if (!selectedMemberId || !trimmedText) return;
    
    const targetTab = activeTab as 'packing' | 'shopping';
    
    // 修正：Firestore 不支援屬性值為 undefined
    const item: ChecklistItem = { 
      id: Date.now().toString(), 
      text: trimmedText, 
      completed: false, 
      ownerId: selectedMemberId
    };

    if (activeTab === 'packing') {
      item.category = newItem.category;
    }

    const currentMemberData = listData[selectedMemberId] || { packing: [], shopping: [] };
    const next = { 
      ...listData, 
      [selectedMemberId]: { 
        ...currentMemberData, 
        [targetTab]: [...(currentMemberData[targetTab] || []), item] 
      } 
    };
    
    updatePlanningCloud('listData', next);
    setShowAddItemModal(false);
    setNewItem({ ...newItem, text: '' });
  };

  const toggleItem = (itemId: string) => {
    if (!selectedMemberId) return;
    const targetTab = activeTab as 'packing' | 'shopping';
    const currentList = listData[selectedMemberId]?.[targetTab] || [];
    const nextList = currentList.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item);
    const next = {
      ...listData,
      [selectedMemberId]: {
        ...(listData[selectedMemberId] || { packing: [], shopping: [] }),
        [targetTab]: nextList
      }
    };
    updatePlanningCloud('listData', next);
  };

  const deleteItem = (itemId: string) => {
    if (!selectedMemberId) return;
    const targetTab = activeTab as 'packing' | 'shopping';
    const nextList = (listData[selectedMemberId]?.[targetTab] || []).filter(item => item.id !== itemId);
    const next = {
      ...listData,
      [selectedMemberId]: {
        ...(listData[selectedMemberId] || { packing: [], shopping: [] }),
        [targetTab]: nextList
      }
    };
    updatePlanningCloud('listData', next);
  };

  const renderMemberSelect = () => (
    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {members.length === 0 ? (
        <div className="col-span-2 py-24 text-center border-2 border-dashed border-paper/30 rounded-[3rem] bg-white/10">
          <p className="text-xs text-earth-dark/40 font-bold uppercase tracking-[0.2em] italic">請先前往『成員』分頁新增旅伴</p>
        </div>
      ) : (
        members.map(member => (
          <NordicCard key={member.id} onClick={() => setSelectedMemberId(member.id)} className="flex flex-col items-center py-5 hover:border-sage shadow-sm border-2 border-paper/30">
            <img src={member.avatar} className="w-14 h-14 rounded-full border-[3px] border-slate mb-2 object-cover shadow-inner" alt={member.name} />
            <span className="text-sm font-bold text-sage">{member.name}</span>
            <span className="text-[8px] text-earth-dark/60 font-bold uppercase tracking-[0.15em] mt-0.5">View List</span>
          </NordicCard>
        ))
      )}
    </div>
  );

  const renderChecklist = () => {
    const targetTab = activeTab as 'packing' | 'shopping';
    const member = members.find(m => m.id === selectedMemberId);
    const items = listData[selectedMemberId!]?.[targetTab] || [];

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-3 mb-2 px-1">
          <button onClick={() => setSelectedMemberId(null)} className="w-10 h-10 rounded-full bg-white/80 border border-paper shadow-sm flex items-center justify-center text-sage active:scale-90 transition-all">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-sage text-2xl tracking-tight">
              {member?.name} 的{activeTab === 'packing' ? '行李箱' : '採買清單'}
            </h2>
          </div>
        </div>
        {activeTab === 'packing' ? (
          <div className="space-y-3">
            {PACKING_CATS.map(cat => {
              const catItems = items.filter(i => i.category === cat.id);
              const completedCount = catItems.filter(i => i.completed).length;
              const isExpanded = expandedCats.has(cat.id);
              return (
                <div key={cat.id} className="space-y-3">
                  <div onClick={() => toggleCategory(cat.id)} className="flex items-center justify-between py-3 px-5 bg-[#DDD3C9]/40 border border-[#D2C2B2]/50 rounded-full cursor-pointer active:opacity-80 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-sage/10 text-sage flex items-center justify-center"><i className={`fa-solid ${cat.icon} text-xs`}></i></div>
                      <span className="text-sm font-bold text-sage tracking-tight">{cat.label}</span>
                      <span className="bg-white/60 text-[9px] font-bold text-earth-dark/70 px-2.5 py-0.5 rounded-full border border-paper">{completedCount}/{catItems.length}</span>
                    </div>
                    <i className={`fa-solid fa-chevron-down text-[10px] text-earth-dark transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                  </div>
                  {isExpanded && (
                    <div className="space-y-2 px-1 pb-2">
                      {catItems.length > 0 ? catItems.map(item => (
                        <div key={item.id} className="bg-white py-2.5 px-5 rounded-[1.25rem] border border-paper/30 flex items-center justify-between shadow-sm group/item animate-in fade-in slide-in-from-top-1 duration-300">
                          <div onClick={() => toggleItem(item.id)} className="flex items-center gap-4 flex-grow cursor-pointer">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-sage border-sage' : 'border-paper/60'}`}>{item.completed && <i className="fa-solid fa-check text-white text-[10px]"></i>}</div>
                            <span className={`text-sm font-bold transition-all ${item.completed ? 'line-through opacity-40 text-sage' : 'text-sage'}`}>{item.text}</span>
                          </div>
                          <button onClick={() => deleteItem(item.id)} className="text-earth-dark/30 hover:text-stamp transition-colors w-8 h-8 flex items-center justify-center"><i className="fa-solid fa-trash-can text-xs"></i></button>
                        </div>
                      )) : <div className="py-4 text-center"><p className="text-[10px] font-bold text-earth-dark/30 italic uppercase tracking-[0.2em]">尚無項目</p></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {items.length > 0 ? items.map(item => (
              <div key={item.id} className="bg-white py-2.5 px-5 rounded-[1.25rem] border border-paper/30 flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                <div onClick={() => toggleItem(item.id)} className="flex items-center gap-4 flex-grow cursor-pointer">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-sage border-sage' : 'border-paper/60'}`}>{item.completed && <i className="fa-solid fa-check text-white text-[10px]"></i>}</div>
                  <span className={`text-sm font-bold transition-all ${item.completed ? 'line-through opacity-40 text-sage' : 'text-sage'}`}>{item.text}</span>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-earth-dark/30 hover:text-stamp transition-colors w-8 h-8 flex items-center justify-center"><i className="fa-solid fa-trash-can text-xs"></i></button>
              </div>
            )) : <div className="py-24 text-center"><p className="text-xs font-bold text-earth-dark/30 italic uppercase tracking-[0.2em]">尚無採買項目</p></div>}
          </div>
        )}
        <button onClick={() => setShowAddItemModal(true)} className="w-full h-12 border-2 border-dashed border-sage/20 rounded-full bg-white/40 flex items-center justify-center gap-2 text-sage font-bold active:scale-95 transition-all text-sm shadow-md hover:bg-white hover:border-sage mt-6"><i className="fa-solid fa-plus-circle"></i> 新增項目</button>
      </div>
    );
  };

  return (
    <div className="pb-36 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      <div className="pt-2">
        <h1 className="text-3xl font-bold text-sage tracking-tight">事前準備</h1>
        <p className="text-earth-dark mt-1 font-bold text-xs italic">同步所有人的準備進度</p>
      </div>

      <div className="flex bg-white/60 p-1.5 rounded-full border border-paper/40 shadow-inner">
        {(['todo', 'packing', 'shopping', 'info'] as const).map((t) => (
          <button key={t} onClick={() => { setActiveTab(t); setSelectedMemberId(null); }} className={`flex-1 py-2.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-widest ${activeTab === t ? 'bg-sage text-white shadow-lg' : 'text-earth-dark/60 hover:bg-white/30'}`}>
            {t === 'todo' ? '團隊待辦' : t === 'packing' ? '行李' : t === 'shopping' ? '採買' : '資訊'}
          </button>
        ))}
      </div>

      {activeTab === 'todo' && (
        <div className="space-y-4">
          <NordicButton onClick={() => setShowAddTodo(true)} className="w-full h-14 bg-stamp border-none text-xs uppercase tracking-[0.2em] font-bold shadow-xl"><i className="fa-solid fa-plus mr-2"></i> 新增團隊待辦</NordicButton>
          <div className="space-y-3">
            {todos.length > 0 ? todos.map(item => (
              <div key={item.id} className="bg-white py-3 px-5 rounded-[1.5rem] border border-paper/30 flex items-center justify-between shadow-md animate-in fade-in slide-in-from-left-2 duration-300">
                <div onClick={() => updatePlanningCloud('todos', todos.map(t => t.id === item.id ? {...t, completed: !t.completed} : t))} className="flex items-center gap-4 flex-grow cursor-pointer">
                  <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.completed ? 'bg-sage border-sage' : 'border-paper/60'}`}>{item.completed && <i className="fa-solid fa-check text-white text-xs"></i>}</div>
                  <div className="flex flex-col">
                    <span className={`font-bold text-base tracking-tight ${item.completed ? 'line-through opacity-40 text-sage' : 'text-sage'}`}>{item.text}</span>
                    <span className="text-[9px] font-bold text-earth-dark/50 uppercase tracking-[0.15em] mt-1">{item.assignedTo === 'ALL' ? '全體成員' : (members.find(m => m.id === item.assignedTo)?.name || '未知')}</span>
                  </div>
                </div>
                <button onClick={() => deleteTodo(item.id)} className="w-10 h-10 flex items-center justify-center text-earth-dark/20 hover:text-stamp transition-all"><i className="fa-solid fa-trash-can text-sm"></i></button>
              </div>
            )) : <div className="py-24 text-center border-2 border-dashed border-paper/30 rounded-[3rem] bg-white/10"><p className="text-xs text-earth-dark/20 font-bold uppercase tracking-[0.2em] italic">目前尚無待辦事項</p></div>}
          </div>
        </div>
      )}

      {(activeTab === 'packing' || activeTab === 'shopping') && (selectedMemberId ? renderChecklist() : renderMemberSelect())}

      {activeTab === 'info' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <NordicCard className="p-6 bg-white/80 backdrop-blur-md rounded-[2.5rem] border-paper/20">
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-[10px] font-bold text-earth-dark uppercase tracking-widest">發布新資訊</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-sage">發布身分：</span>
                <select value={currentAuthorId} onChange={(e) => setCurrentAuthorId(e.target.value)} className="bg-white border-2 border-paper/30 rounded-full text-[10px] px-3 py-1 outline-none font-bold text-sage shadow-sm">
                  {members.length === 0 && <option value="">無成員</option>}
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <textarea value={infoText} onChange={(e) => setInfoText(e.target.value)} placeholder="分享關於旅程的資訊、連結 or 心情..." className="w-full min-h-[120px] p-5 bg-white border-2 border-paper/30 rounded-[2rem] text-sm font-bold text-sage outline-none resize-none shadow-inner" />
            {infoImage && (
              <div className="mt-4 relative inline-block">
                <img src={infoImage} className="w-28 h-28 object-cover rounded-[2rem] border-4 border-white shadow-xl" alt="Preview" />
                <button onClick={() => setInfoImage(null)} className="absolute -top-2 -right-2 w-7 h-7 bg-stamp text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white"><i className="fa-solid fa-xmark text-xs"></i></button>
              </div>
            )}
            <div className="flex justify-between items-center mt-5">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-[1.5rem] bg-white border-2 border-paper/30 text-sage flex items-center justify-center active:scale-90 transition-all hover:border-sage shadow-md"><i className="fa-solid fa-camera text-xl"></i></button>
              <input type="file" ref={fileInputRef} onChange={handleInfoImageUpload} accept="image/*" className="hidden" />
              <NordicButton onClick={handlePostInfo} className="px-10 bg-sage border-none h-14 rounded-full text-xs uppercase tracking-widest shadow-xl">發布資訊</NordicButton>
            </div>
          </NordicCard>
          <div className="space-y-6">
            {travelInfos.length > 0 ? travelInfos.map(info => {
              const author = members.find(m => m.id === info.authorId);
              return (
                <div key={info.id} className="relative group animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <div className="absolute -top-4 -right-2 z-10"><img src={author?.avatar || 'https://picsum.photos/seed/unknown/100/100'} className="w-12 h-12 rounded-full border-4 border-white shadow-xl object-cover" alt="" /></div>
                  <NordicCard className="p-7 bg-white rounded-[2.5rem] border-paper/20">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-earth-dark/40 uppercase tracking-widest">{new Date(info.createdAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <button onClick={() => deleteInfo(info.id)} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-stamp transition-opacity p-1"><i className="fa-solid fa-trash-can text-sm"></i></button>
                    </div>
                    <p className="text-sage font-bold text-base leading-relaxed whitespace-pre-wrap tracking-tight">{info.text}</p>
                    {info.imageUrl && <div className="mt-5 rounded-[2rem] overflow-hidden border border-paper/20 shadow-lg"><img src={info.imageUrl} className="w-full max-h-80 object-cover" alt="Info" /></div>}
                  </NordicCard>
                </div>
              );
            }) : <div className="py-24 text-center border-2 border-dashed border-paper/30 rounded-[3rem] bg-white/10"><i className="fa-solid fa-comment-dots text-5xl text-earth-dark/5 mb-4"></i><p className="text-xs text-earth-dark/20 font-bold uppercase tracking-[0.2em] italic">目前尚無共享資訊</p></div>}
          </div>
        </div>
      )}

      <Modal isOpen={showAddTodo} onClose={() => setShowAddTodo(false)} title="新增團隊待辦">
        <div className="space-y-6 pb-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">任務描述</label>
            <input type="text" placeholder="例如：訂購機場接送..." value={todoInput.text} onChange={(e) => setTodoInput({ ...todoInput, text: e.target.value })} className="w-full p-3.5 bg-white border-2 border-paper/30 rounded-[1.75rem] font-bold text-sage outline-none shadow-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">負責人</label>
            <select value={todoInput.assignedTo} onChange={(e) => setTodoInput({ ...todoInput, assignedTo: e.target.value })} className="w-full p-3.5 bg-white border-2 border-paper/30 rounded-[1.75rem] font-bold text-sage outline-none shadow-sm appearance-none">
              <option value="ALL">全體成員 (Everyone)</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <NordicButton onClick={handleAddTodo} className="w-full h-14 bg-sage text-white font-bold mt-2 shadow-xl border-none uppercase tracking-widest">確定新增任務</NordicButton>
        </div>
      </Modal>

      <Modal isOpen={showAddItemModal} onClose={() => setShowAddItemModal(false)} title={`新增${activeTab === 'packing' ? '行李' : '採買'}項目`}>
        <div className="space-y-6 pb-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">項目名稱</label>
            <input type="text" placeholder="輸入名稱..." value={newItem.text} onChange={(e) => setNewItem({ ...newItem, text: e.target.value })} className="w-full p-3.5 bg-white border-2 border-paper/30 rounded-[1.75rem] font-bold text-sage outline-none shadow-sm" />
          </div>
          {activeTab === 'packing' && (
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">分類類別</label>
              <div className="grid grid-cols-2 gap-3">
                {PACKING_CATS.map(cat => (
                  <button key={cat.id} onClick={() => setNewItem({ ...newItem, category: cat.id })} className={`py-2.5 px-3 rounded-2xl text-[11px] font-bold transition-all border-2 flex items-center gap-3 ${newItem.category === cat.id ? 'bg-sage text-white border-sage shadow-lg' : 'bg-white text-earth-dark/60 border-paper/20'}`}>
                    <i className={`fa-solid ${cat.icon} text-xs`}></i>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <NordicButton onClick={handleAddItem} className="w-full h-14 bg-sage text-white font-bold mt-4 shadow-xl border-none uppercase tracking-widest">加入清單</NordicButton>
        </div>
      </Modal>
    </div>
  );
};

export default PlanningView;