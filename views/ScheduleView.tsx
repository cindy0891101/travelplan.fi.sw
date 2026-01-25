import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dbService } from '../firebaseService';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { MOCK_SCHEDULE, MOCK_WEATHER } from '../constants';
import { ScheduleItem, Category, WeatherInfo } from '../types';

// --- 內部定義防止導出錯誤 ---
const CATEGORY_COLORS_MAP: Record<string, string> = {
  Transport: 'bg-blue-400',
  Food: 'bg-orange-400',
  Attraction: 'bg-green-400',
  Accommodation: 'bg-indigo-400',
  Activity: 'bg-purple-400',
  Shopping: 'bg-pink-400'
};

interface ExtendedWeatherInfo extends WeatherInfo { feelsLike: number; }
interface ExtendedDayMetadata { locationName: string; forecast: ExtendedWeatherInfo[]; isLive?: boolean; }
interface DayData { items: ScheduleItem[]; metadata: ExtendedDayMetadata; }
interface ScheduleViewProps { isEditMode?: boolean; }

const ScheduleView: React.FC<ScheduleViewProps> = ({ isEditMode = true }) => {
  const [fullSchedule, setFullSchedule] = useState<Record<string, DayData>>(() => {
    try {
      const saved = localStorage.getItem('nordic_full_schedule');
      if (saved && saved !== '{}') return JSON.parse(saved);
    } catch (e) { console.error(e); }
    
    const initial: Record<string, DayData> = {};
    Object.keys(MOCK_SCHEDULE).forEach(date => {
      initial[date] = {
        items: MOCK_SCHEDULE[date],
        metadata: {
          locationName: '東京, 日本',
          forecast: MOCK_WEATHER.map(w => ({ ...w, feelsLike: w.temp - 2 })),
          isLive: false
        }
      };
    });
    return initial;
  });

  const dates = useMemo(() => Object.keys(fullSchedule).sort(), [fullSchedule]);
  const [selectedDate, setSelectedDate] = useState(dates[0] || '');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [newDateInput, setNewDateInput] = useState('');

  // 監聽雲端資料
  useEffect(() => {
    const unsubscribe = dbService.subscribeFullSchedule((cloudData) => {
      if (cloudData && Object.keys(cloudData).length > 0) {
        setFullSchedule(cloudData);
      }
    });
    return () => unsubscribe?.();
  }, []);

  // 手動同步功能
  const forceSyncToCloud = async () => {
    try {
      await dbService.saveFullSchedule(fullSchedule);
      alert("✅ 雲端同步成功！請檢查 Firebase。");
    } catch (err: any) {
      alert("❌ 同步失敗：" + err.message);
    }
  };

  useEffect(() => {
    if (dates.length > 0 && (!selectedDate || !fullSchedule[selectedDate])) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate, fullSchedule]);

  const currentDayData = fullSchedule[selectedDate] || { items: [], metadata: { locationName: '未設定', forecast: [], isLive: false } };
  const getCategoryIcon = (category: Category) => {
    const icons: Record<string, string> = { 
      Transport: 'fa-car', Food: 'fa-utensils', Attraction: 'fa-camera', 
      Accommodation: 'fa-bed', Activity: 'fa-star', Shopping: 'fa-bag-shopping' 
    };
    return icons[category] || 'fa-location-dot';
  };

  return (
    <div className="pb-24 px-4 space-y-6">
      <div className="pt-4 flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold text-sage">行程日誌</h1>
          <button onClick={forceSyncToCloud} className="mt-2 text-[10px] bg-terracotta text-white px-3 py-1 rounded-full shadow-md active:scale-95 transition-transform">
            <i className="fa-solid fa-cloud-arrow-up mr-1"></i> 強制同步
          </button>
        </div>
        <div className="text-xs font-bold text-sage bg-white/80 px-4 py-2 rounded-full border border-slate shadow-sm">
          {currentDayData.metadata.locationName}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar">
        {dates.map((date) => (
          <button 
            key={date} 
            onClick={() => setSelectedDate(date)} 
            className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center border-2 transition-all ${selectedDate === date ? 'bg-sage text-white border-white scale-105 shadow-md' : 'bg-white text-earth border-slate'}`}
          >
            <span className="text-xl font-bold">{new Date(date).getDate()}</span>
            <span className="text-[10px]">{new Date(date).getMonth() + 1}月</span>
          </button>
        ))}
        {isEditMode && (
          <button onClick={() => setShowDateModal(true)} className="flex-shrink-0 w-16 h-20 rounded-3xl border-2 border-dashed border-slate flex items-center justify-center text-sage bg-white/30">
            <i className="fa-solid fa-plus"></i>
          </button>
        )}
      </div>

      <div className="space-y-5">
        {currentDayData.items.length > 0 ? currentDayData.items.map((item) => (
          <NordicCard key={item.id} onClick={() => isEditMode && (setEditingItem(item), setShowEditModal(true))} className="py-6 px-4 cursor-pointer hover:bg-sage/5 transition-colors">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-sm text-earth-dark font-bold opacity-70">{item.time}</div>
                <h4 className="text-xl font-bold text-sage">{item.location}</h4>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${CATEGORY_COLORS_MAP[item.category] || 'bg-slate-400'} text-white shadow-sm`}>
                <i className={`fa-solid ${getCategoryIcon(item.category)} text-xl`}></i>
              </div>
            </div>
          </NordicCard>
        )) : (
          <div className="py-20 text-center text-earth/40 italic text-sm">今日尚無規劃行程</div>
        )}
      </div>
      
      {isEditMode && (
        <button 
          onClick={() => {
            setEditingItem({ id: Date.now().toString(), time: '12:00', location: '', category: 'Attraction', note: '' });
            setShowEditModal(true);
          }} 
          className="w-full py-4 border-2 border-dashed border-sage rounded-3xl text-sage font-bold flex items-center justify-center gap-2 bg-white/40 active:bg-white/60"
        >
          <i className="fa-solid fa-plus-circle"></i> 新增行程項目
        </button>
      )}

      <Modal isOpen={showDateModal} onClose={() => setShowDateModal(false)} title="新增行程日期">
        <div className="space-y-4 p-4">
          <input type="date" value={newDateInput} onChange={(e) => setNewDateInput(e.target.value)} className="w-full p-4 border-2 border-slate rounded-2xl font-bold" />
          <NordicButton onClick={() => {
            if (!newDateInput || fullSchedule[newDateInput]) return;
            setFullSchedule(prev => ({...prev, [newDateInput]: { items: [], metadata: { locationName: '新目的地', forecast: [], isLive: false } } }));
            setSelectedDate(newDateInput); setShowDateModal(false);
          }} className="w-full">確定新增</NordicButton>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="行程設定">
        {editingItem && (
          <div className="space-y-4 p-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-dark">地點名稱</label>
              <input type="text" value={editingItem.location} onChange={(e) => setEditingItem({...editingItem, location: e.target.value})} className="w-full p-4 border-2 border-slate rounded-2xl" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-dark">時間</label>
              <input type="time" value={editingItem.time} onChange={(e) => setEditingItem({...editingItem, time: e.target.value})} className="w-full p-4 border-2 border-slate rounded-2xl" />
            </div>
            <NordicButton onClick={() => {
              setFullSchedule(prev => {
                const next = { ...prev };
                const filtered = next[selectedDate].items.filter(i => i.id !== editingItem.id);
                next[selectedDate].items = [...filtered, editingItem].sort((a,b) => a.time.localeCompare(b.time));
                return next;
              });
              setShowEditModal(false);
            }} className="w-full">儲存修改</NordicButton>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleView;