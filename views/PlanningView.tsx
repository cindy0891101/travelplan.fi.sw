
import React, { useState, useEffect, useRef } from 'react';
import { NordicButton, NordicCard, Modal } from '../components/Shared';
import { TodoItem, ChecklistItem, Member, PackingCategory } from '../types';

type ListCategory = 'packing' | 'shopping' | 'info';

interface TravelInfo {
  id: string;
  text: string;
  authorId: string; // 新增欄位：記錄者 ID
  imageUrl?: string;
  createdAt: number;
}

const PACKING_CATS: { id: PackingCategory, label: string, icon: string }[] = [
  { id: 'Essential', label: '必帶物品', icon: 'fa-passport' },
  { id: 'Gadgets', label: '3C用品', icon: 'fa-laptop' },
  { id: 'Clothing', label: '服飾用品', icon: 'fa-shirt' },
  { id: 'Beauty', label: '美妝保養', icon: 'fa-sparkles' },
  { id: 'Others', label: '其他', icon: 'fa-ellipsis' }
];

interface PlanningViewProps {
  members: Member[];
}

const PlanningView: React.FC<PlanningViewProps> = ({ members }) => {
  const [activeTab, setActiveTab] = useState<'todo' | ListCategory>('todo');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 待辦事項
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem('nordic_todos');
    return saved ? JSON.parse(saved) : [
      { id: 't1', text: '申請日本簽證', completed: true, assignedTo: 'ALL' },
      { id: 't2', text: '訂購機場接送', completed: false, assignedTo: '1' }
    ];
  });

  // 物品數據儲存結構
  const [listData, setListData] = useState<Record<string, Record<'packing' | 'shopping', ChecklistItem[]>>>(() => {
    const saved = localStorage.getItem('nordic_list_data');
    return saved ? JSON.parse(saved) : {};
  });

  // 旅行資訊數據
  const [travelInfos, setTravelInfos] = useState<TravelInfo[]>(() => {
    const saved = localStorage.getItem('nordic_travel_infos');
    return saved ? JSON.parse(saved) : [];
  });

  // 類別展開狀態
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    Essential: true, Gadgets: true, Clothing: true, Beauty: true, Others: true
  });

  // 彈窗與編輯臨時狀態
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newInfoText, setNewInfoText] = useState('');
  const [newInfoImage, setNewInfoImage] = useState<string | null>(null);
  const [newInfoAuthorId, setNewInfoAuthorId] = useState<string>(members[0]?.id || '1');
  
  const [newItem, setNewItem] = useState<{ text: string, category: PackingCategory }>({
    text: '',
    category: 'Essential'
  });

  useEffect(() => {
    localStorage.setItem('nordic_todos', JSON.stringify(todos));
    localStorage.setItem('nordic_list_data', JSON.stringify(listData));
    localStorage.setItem('nordic_travel_infos', JSON.stringify(travelInfos));
  }, [todos, listData, travelInfos]);

  const handleAddItem = () => {
    if (!selectedMemberId || !newItem.text.trim()) return;
    
    const item: ChecklistItem = {
      id: Date.now().toString(),
      text: newItem.text,
      completed: false,
      ownerId: selectedMemberId,
      category: activeTab === 'packing' ? newItem.category : undefined
    };

    const targetTab = activeTab as 'packing' | 'shopping';
    setListData(prev => ({
      ...prev,
      [selectedMemberId]: {
        ...(prev[selectedMemberId] || { packing: [], shopping: [] }),
        [targetTab]: [...(prev[selectedMemberId]?.[targetTab] || []), item]
      }
    }));
    
    setNewItem({ ...newItem, text: '' });
    setShowAddItemModal(false);
  };

  const handleToggleItem = (cat: 'packing' | 'shopping', itemId: string) => {
    if (!selectedMemberId) return;
    setListData(prev => ({
      ...prev,
      [selectedMemberId]: {
        ...prev[selectedMemberId],
        [cat]: prev[selectedMemberId][cat].map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
        )
      }
    }));
  };

  const handleDeleteItem = (cat: 'packing' | 'shopping', itemId: string) => {
    if (!selectedMemberId) return;
    setListData(prev => ({
      ...prev,
      [selectedMemberId]: {
        ...prev[selectedMemberId],
        [cat]: prev[selectedMemberId][cat].filter(item => item.id !== itemId)
      }
    }));
  };

  const handleDeleteTodo = (todoId: string) => {
    setTodos(prev => prev.filter(t => t.id !== todoId));
  };

  const handleAddTravelInfo = () => {
    if (!newInfoText.trim() && !newInfoImage) return;
    const info: TravelInfo = {
      id: Date.now().toString(),
      text: newInfoText,
      authorId: newInfoAuthorId,
      imageUrl: newInfoImage || undefined,
      createdAt: Date.now()
    };
    setTravelInfos([info, ...travelInfos]);
    setNewInfoText('');
    setNewInfoImage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewInfoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCat = (catId: string) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const currentItems = selectedMemberId && (activeTab === 'packing' || activeTab === 'shopping')
    ? (listData[selectedMemberId]?.[activeTab as 'packing' | 'shopping'] || []) 
    : [];

  return (
    <div className="pb-24 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      <div className="pt-6">
        <h1 className="text-3xl font-bold text-sage tracking-tight">事前準備</h1>
        <p className="text-earth-dark mt-1 font-bold">個人與團隊準備清單</p>
      </div>

      <div className="flex bg-white/50 p-1 rounded-2xl border border-slate shadow-inner overflow-x-auto no-scrollbar">
        {(['todo', 'packing', 'shopping', 'info'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); setSelectedMemberId(null); }}
            className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest ${activeTab === t ? 'bg-sage text-white shadow-sm' : 'text-earth hover:text-sage/60'}`}
          >
            {t === 'todo' ? '團隊待辦' : t === 'packing' ? '行李清單' : t === 'shopping' ? '採買清單' : '旅行資訊'}
          </button>
        ))}
      </div>

      {/* 團隊待辦 Tab */}
      {activeTab === 'todo' && (
        <div className="space-y-4">
          <NordicButton onClick={() => setShowAddTodo(true)} className="w-full h-14 bg-terracotta border-none">
            <i className="fa-solid fa-plus"></i> 新增團隊待辦
          </NordicButton>
          <div className="space-y-3">
            {todos.length > 0 ? todos.map(item => (
              <div 
                key={item.id} 
                className="bg-white p-4 rounded-3xl border border-slate flex items-center gap-4 hover:shadow-md transition-all group animate-in fade-in zoom-in-95 duration-200"
              >
                <div 
                  onClick={() => setTodos(todos.map(t => t.id === item.id ? { ...t, completed: !t.completed } : t))}
                  className="flex items-center gap-4 flex-grow cursor-pointer"
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${item.completed ? 'bg-sage border-sage' : 'border-slate'}`}>
                    {item.completed && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                  </div>
                  <div className="flex-grow">
                    <div className={`font-bold text-sm ${item.completed ? 'text-earth line-through opacity-50' : 'text-sage'}`}>{item.text}</div>
                    <div className="text-[9px] font-bold uppercase text-earth-dark tracking-widest mt-0.5 opacity-80">
                      負責：{item.assignedTo === 'ALL' ? '全體' : members.find(m => m.id === item.assignedTo)?.name || '未知成員'}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteTodo(item.id); }} 
                  className="p-3 text-earth hover:text-terracotta transition-all active:scale-125"
                >
                  <i className="fa-solid fa-trash-can text-sm"></i>
                </button>
              </div>
            )) : (
              <div className="py-20 text-center text-earth-dark/40 italic text-xs font-bold tracking-widest uppercase">
                目前沒有待辦事項
              </div>
            )}
          </div>
        </div>
      )}

      {/* 旅行資訊 Tab */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          <NordicCard className="p-4 space-y-4">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">記錄者</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {members.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setNewInfoAuthorId(m.id)}
                    className={`flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all p-0.5 ${newInfoAuthorId === m.id ? 'border-sage shadow-md scale-110' : 'border-white opacity-40'}`}
                  >
                    <img src={m.avatar} className="w-full h-full rounded-full object-cover" alt={m.name} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">新增旅行筆記</label>
              <textarea 
                value={newInfoText}
                onChange={(e) => setNewInfoText(e.target.value)}
                placeholder="在此輸入重要的資訊..."
                className="w-full p-4 bg-cream/50 border-2 border-slate rounded-2xl text-sm text-sage outline-none min-h-[100px] focus:border-sage transition-all"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-2xl bg-slate/30 text-sage flex items-center justify-center active:scale-90 transition-all border-2 border-white"
                >
                  <i className="fa-solid fa-camera"></i>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                {newInfoImage && (
                  <div className="relative w-12 h-12">
                    <img src={newInfoImage} className="w-full h-full object-cover rounded-2xl border-2 border-sage" />
                    <button 
                      onClick={() => setNewInfoImage(null)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-terracotta text-white rounded-full flex items-center justify-center text-[10px] shadow-sm"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
              <NordicButton 
                onClick={handleAddTravelInfo}
                className="bg-sage text-white px-8 py-3 rounded-2xl font-bold text-xs"
              >
                儲存資訊
              </NordicButton>
            </div>
          </NordicCard>

          <div className="space-y-8 pt-4">
            {travelInfos.length > 0 ? travelInfos.map(info => (
              <div key={info.id} className="relative group animate-in fade-in zoom-in-95 duration-300">
                {/* 左上角作者頭像 */}
                <div className="absolute -top-4 -left-2 z-20">
                  <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-white">
                    <img 
                      src={members.find(m => m.id === info.authorId)?.avatar || members[0]?.avatar} 
                      className="w-full h-full object-cover" 
                      alt="author" 
                    />
                  </div>
                </div>

                <NordicCard className="overflow-hidden p-0">
                  <div className="p-6 pt-8 flex justify-between items-start">
                    <div className="flex-grow space-y-3">
                      <p className="text-sage text-sm font-medium leading-relaxed whitespace-pre-wrap">{info.text}</p>
                      {info.imageUrl && (
                        <div className="rounded-3xl overflow-hidden border-2 border-slate/40">
                          <img src={info.imageUrl} className="w-full h-auto max-h-64 object-cover" />
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate/30">
                        <div className="text-[9px] font-bold text-earth-dark uppercase tracking-widest opacity-80">
                          記錄：{members.find(m => m.id === info.authorId)?.name || members[0]?.name}
                        </div>
                        <div className="text-[9px] font-bold text-earth-dark uppercase tracking-widest opacity-40">
                          {new Date(info.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </NordicCard>
                
                <button 
                  onClick={() => setTravelInfos(travelInfos.filter(i => i.id !== info.id))}
                  className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-white border border-slate text-earth hover:text-terracotta shadow-md flex items-center justify-center transition-all active:scale-125 z-10"
                >
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            )) : (
              <div className="py-20 text-center text-earth-dark/40 italic text-xs font-bold tracking-widest uppercase">
                尚未新增任何旅行資訊
              </div>
            )}
          </div>
        </div>
      )}

      {/* 行李/採買清單成員選取 */}
      {(activeTab === 'packing' || activeTab === 'shopping') && !selectedMemberId && (
        <div className="grid grid-cols-2 gap-4">
          {members.map(member => (
            <NordicCard key={member.id} onClick={() => setSelectedMemberId(member.id)} className="flex flex-col items-center py-8 text-center">
              <img src={member.avatar} className="w-16 h-16 rounded-full border-4 border-slate/30 shadow-sm mb-3" />
              <div className="font-bold text-sage">{member.name}</div>
              <div className="text-[9px] font-bold text-earth-dark uppercase tracking-widest mt-1">
                {listData[member.id]?.[activeTab as 'packing' | 'shopping']?.length || 0} 個準備項
              </div>
            </NordicCard>
          ))}
        </div>
      )}

      {/* 行李/採買清單詳細視圖 */}
      {(activeTab === 'packing' || activeTab === 'shopping') && selectedMemberId && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <button onClick={() => setSelectedMemberId(null)} className="w-10 h-10 rounded-full bg-white border border-slate flex items-center justify-center text-earth shadow-sm transition-all active:scale-90"><i className="fa-solid fa-chevron-left"></i></button>
            <h3 className="font-bold text-sage text-lg">{members.find(m => m.id === selectedMemberId)?.name} 的{activeTab === 'packing' ? '行李箱' : '購物清單'}</h3>
          </div>

          {activeTab === 'packing' ? (
            <div className="space-y-4">
              {PACKING_CATS.map(cat => {
                const itemsInCat = currentItems.filter(i => i.category === cat.id);
                const completedCount = itemsInCat.filter(i => i.completed).length;
                const isExpanded = expandedCats[cat.id];

                return (
                  <div key={cat.id} className="space-y-2">
                    <button 
                      onClick={() => toggleCat(cat.id)}
                      className="w-full flex items-center justify-between p-4 bg-slate/30 rounded-2xl hover:bg-slate/50 transition-all border border-slate"
                    >
                      <div className="flex items-center gap-3">
                        <i className={`fa-solid ${cat.icon} text-sage w-5`}></i>
                        <span className="font-bold text-sage text-sm">{cat.label}</span>
                        <span className="text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded-full text-earth-dark">
                          {completedCount}/{itemsInCat.length}
                        </span>
                      </div>
                      <i className={`fa-solid fa-chevron-down text-[10px] text-earth-dark transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pl-2 animate-in slide-in-from-top-2 duration-300">
                        {itemsInCat.length > 0 ? itemsInCat.map(item => (
                          <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate flex items-center justify-between group animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-4 flex-grow cursor-pointer" onClick={() => handleToggleItem('packing', item.id)}>
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-sage border-sage' : 'border-slate'}`}>
                                {item.completed && <i className="fa-solid fa-check text-white text-[8px]"></i>}
                              </div>
                              <span className={`text-sm font-bold ${item.completed ? 'text-earth line-through opacity-50' : 'text-sage'}`}>{item.text}</span>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteItem('packing', item.id); }} 
                              className="p-3 text-earth hover:text-terracotta transition-all active:scale-125"
                            >
                              <i className="fa-solid fa-trash-can text-sm"></i>
                            </button>
                          </div>
                        )) : (
                          <div className="py-4 text-center text-[10px] font-bold text-earth-dark/30 uppercase tracking-widest italic">尚無項目</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {currentItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate flex items-center justify-between group animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-4 flex-grow cursor-pointer" onClick={() => handleToggleItem('shopping', item.id)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-sage border-sage' : 'border-slate'}`}>
                      {item.completed && <i className="fa-solid fa-check text-white text-[8px]"></i>}
                    </div>
                    <span className={`text-sm font-bold ${item.completed ? 'text-earth line-through opacity-50' : 'text-sage'}`}>{item.text}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem('shopping', item.id); }} 
                    className="p-3 text-earth hover:text-terracotta transition-all active:scale-125"
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button 
            onClick={() => setShowAddItemModal(true)}
            className="w-full h-16 border-2 border-dashed border-earth-dark rounded-3xl bg-white/30 flex items-center justify-center gap-2 text-earth-dark font-bold active:scale-95 transition-all mt-8 shadow-sm hover:bg-white/50 text-sm tracking-widest uppercase"
          >
            <i className="fa-solid fa-plus-circle"></i> {currentItems.length === 0 ? '開始規畫第一項物品' : `新增${activeTab === 'packing' ? '行李' : '清單'}項目`}
          </button>
        </div>
      )}

      {/* --- Modals --- */}

      {/* 新增物品 Modal */}
      <Modal isOpen={showAddItemModal} onClose={() => setShowAddItemModal(false)} title={`新增${activeTab === 'packing' ? '行李' : '採買'}項目`}>
        <div className="space-y-6 pb-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">物品名稱</label>
            <input 
              type="text" 
              placeholder="例如：牙刷、行動電源..." 
              value={newItem.text}
              onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage outline-none shadow-inner"
              autoFocus
            />
          </div>

          {activeTab === 'packing' && (
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">選擇類別</label>
              <div className="grid grid-cols-3 gap-2">
                {PACKING_CATS.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setNewItem({ ...newItem, category: cat.id })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${newItem.category === cat.id ? 'border-sage bg-sage text-white shadow-md' : 'border-slate bg-white text-sage opacity-60'}`}
                  >
                    <i className={`fa-solid ${cat.icon} text-sm`}></i>
                    <span className="text-[9px] font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <NordicButton onClick={handleAddItem} className="w-full py-4.5 bg-sage text-white font-bold tracking-widest uppercase text-xs">
            加入清單
          </NordicButton>
        </div>
      </Modal>

      {/* 新增團隊待辦 Modal */}
      <Modal isOpen={showAddTodo} onClose={() => setShowAddTodo(false)} title="新增團隊待辦">
        <div className="space-y-4 pb-4">
          <input 
            type="text" 
            placeholder="任務名稱..." 
            value={newItem.text} 
            onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const select = document.getElementById('todoPayer') as HTMLSelectElement;
                if(!newItem.text) return;
                setTodos([{ id: Date.now().toString(), text: newItem.text, completed: false, assignedTo: select?.value || 'ALL' }, ...todos]);
                setNewItem({ ...newItem, text: '' });
                setShowAddTodo(false);
              }
            }}
            className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage outline-none shadow-inner" 
          />
          <select 
            id="todoPayer"
            defaultValue="ALL"
            className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage outline-none shadow-inner"
          >
            <option value="ALL">指派給全體</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <NordicButton onClick={() => {
            const select = document.getElementById('todoPayer') as HTMLSelectElement;
            if(!newItem.text) return;
            setTodos([{ id: Date.now().toString(), text: newItem.text, completed: false, assignedTo: select.value }, ...todos]);
            setNewItem({ ...newItem, text: '' });
            setShowAddTodo(false);
          }} className="w-full py-4.5 bg-sage text-white font-bold">確認新增</NordicButton>
        </div>
      </Modal>
    </div>
  );
};

export default PlanningView;
