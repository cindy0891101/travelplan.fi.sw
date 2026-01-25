import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dbService } from '../firebaseService';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { MOCK_SCHEDULE, MOCK_WEATHER, CATEGORY_COLORS } from '../constants';
import { ScheduleItem, Category, WeatherInfo } from '../types';

// --- 型別定義與輔助函式 (必須放在元件外部) ---
interface ExtendedWeatherInfo extends WeatherInfo {
  feelsLike: number;
}
interface ExtendedDayMetadata {
  locationName: string;
  forecast: ExtendedWeatherInfo[];
  isLive?: boolean;
}
interface DayData {
  items: ScheduleItem[];
  metadata: ExtendedDayMetadata;
}
interface ScheduleViewProps {
  isEditMode?: boolean;
}

const shiftTimeStr = (timeStr: string, minutes: number): string => {
  const [hours, mins] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const T_CHINESE_MAP: Record<string, string> = {
  '韩国': '韓國', '首尔': '首爾', '东京': '東京', '大阪': '大阪',
  '关西': '關西', '京都': '京都', '台北': '臺北', '台中': '臺中',
  '台南': '臺南', '高雄': '高雄', '中国': '中國', '日本': '日本'
};

const fixToTraditional = (text: string) => {
  let fixed = text;
  Object.keys(T_CHINESE_MAP).forEach(key => {
    fixed = fixed.replace(new RegExp(key, 'g'), T_CHINESE_MAP[key]);
  });
  return fixed;
};

// --- 主元件 ---
const ScheduleView: React.FC<ScheduleViewProps> = ({ isEditMode }) => {
  // 1. 狀態初始化
  const [fullSchedule, setFullSchedule] = useState<Record<string, DayData>>(() => {
    const saved = localStorage.getItem('nordic_full_schedule');
    if (saved) return JSON.parse(saved);
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
  const [timeLeft, setTimeLeft] = useState('');
  
  // UI 狀態
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showManageDatesModal, setShowManageDatesModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showTimeShiftModal, setShowTimeShiftModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [newDateInput, setNewDateInput] = useState('');
  const [tempMetadata, setTempMetadata] = useState<ExtendedDayMetadata | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [dateToEdit, setDateToEdit] = useState<string | null>(null);
  const [dateRenameInput, setDateRenameInput] = useState('');
  const [shiftValue, setShiftValue] = useState(30);

  // ---------------------------------------------------------
  // 2. 雲端同步核心 (確保 isEditMode 傳入時能正常運作)
  // ---------------------------------------------------------
  
  // 監聽雲端更新
  useEffect(() => {
    const unsubscribe = dbService.subscribeFullSchedule((cloudData) => {
      if (cloudData) {
        setFullSchedule(cloudData);
      }
    });
    return () => unsubscribe?.();
  }, []);

  // 自動上傳 (當資料變動且在編輯模式時)
  useEffect(() => {
    if (isEditMode) {
      dbService.saveFullSchedule(fullSchedule);
      localStorage.setItem('nordic_full_schedule', JSON.stringify(fullSchedule));
    }
  }, [fullSchedule, isEditMode]);

  // ---------------------------------------------------------

  useEffect(() => {
    if (dates.length > 0 && !selectedDate) setSelectedDate(dates[0]);
  }, [dates, selectedDate]);

  useEffect(() => {
    if (dates.length === 0) return;
    const updateTimeLeft = () => {
      const tripDate = new Date(dates[0]).getTime();
      const now = new Date().getTime();
      const diff = tripDate - now;
      if (diff < 0) setTimeLeft('旅程進行中');
      else setTimeLeft(`距離出發還有 ${Math.floor(diff / (1000 * 60 * 60 * 24))} 天`);
    };
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [dates]);

  const fetchWeatherForLocationAndDate = useCallback(async (location: string, targetDate: string, isAutoUpgrade: boolean = false) => {
    const queryStr = location.trim();
    if (!queryStr || !targetDate) return;
    if (!isAutoUpgrade) setIsFetchingWeather(true);
    
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryStr)}&count=5&format=json&language=zh-Hant`);
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        setIsFetchingWeather(false); return;
      }
      const { latitude, longitude, name: officialName, country } = geoData.results[0];
      const fixedName = fixToTraditional(officialName);
      const displayLocation = country ? `${fixedName}, ${fixToTraditional(country)}` : fixedName;
      
      const params = "hourly=temperature_2m,apparent_temperature,weathercode&timezone=auto";
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&start_date=${targetDate}&end_date=${targetDate}&${params}`);
      const weatherData = await weatherRes.json();

      const { time, temperature_2m, apparent_temperature, weathercode } = weatherData.hourly;
      const newForecast: ExtendedWeatherInfo[] = [];
      for (let i = 0; i < 24; i += 3) {
        newForecast.push({
          hour: time[i].split('T')[1].substring(0, 5),
          temp: Math.round(temperature_2m[i]),
          feelsLike: Math.round(apparent_temperature[i]),
          condition: weathercode[i] === 0 ? 'sunny' : (weathercode[i] <= 3 ? 'cloudy' : 'rainy')
        });
      }
      const meta = { locationName: displayLocation, forecast: newForecast, isLive: true };
      if (isAutoUpgrade) setFullSchedule(prev => ({ ...prev, [targetDate]: { ...prev[targetDate], metadata: meta } }));
      else setTempMetadata(meta);
    } catch (e) { console.error(e); } finally { setIsFetchingWeather(false); }
  }, []);

  const handleTimeShift = (minutes: number) => {
    setFullSchedule(prev => {
      const dayData = prev[selectedDate];
      if (!dayData) return prev;
      const updatedItems = dayData.items.map(item => ({
        ...item,
        time: shiftTimeStr(item.time, minutes)
      })).sort((a, b) => a.time.localeCompare(b.time));
      return { ...prev, [selectedDate]: { ...dayData, items: updatedItems } };
    });
    setShowTimeShiftModal(false);
  };

  const handleDeleteDate = (dateToDelete: string) => {
    if (dates.length <= 1) return;
    setFullSchedule(prev => { const next = { ...prev }; delete next[dateToDelete]; return next; });
  };

  const handleRenameDate = (oldDate: string, newDate: string) => {
    if (!newDate || oldDate === newDate || fullSchedule[newDate]) { setDateToEdit(null); return; }
    setFullSchedule(prev => { 
      const next = { ...prev };
      next[newDate] = next[oldDate];
      delete next[oldDate];
      return next; 
    });
    if (selectedDate === oldDate) setSelectedDate(newDate);
    setDateToEdit(null);
  };

  const currentDayData = fullSchedule[selectedDate] || { items: [], metadata: { locationName: '未設定', forecast: [], isLive: false } };
  const categoryList: Category[] = ['Attraction', 'Food', 'Transport', 'Accommodation', 'Activity', 'Shopping'];
  const getCategoryIcon = (category: Category) => {
    const icons = { Transport: 'fa-car', Food: 'fa-utensils', Attraction: 'fa-camera', Accommodation: 'fa-bed', Activity: 'fa-star', Shopping: 'fa-bag-shopping' };
    return icons[category] || 'fa-location-dot';
  };

  return (
    <div className="pb-24 px-4 space-y-6">
      <div className="pt-4 flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold text-sage">行程日誌</h1>
          <p className="text-earth-dark mt-1 font-bold">{timeLeft}</p>
        </div>
        <div className="text-sm font-bold text-sage bg-white/60 px-5 py-2 rounded-full border border-slate">
          {currentDayData.metadata.locationName}
        </div>
      </div>

      {/* 氣象展示區 */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1">
        {currentDayData.metadata.forecast.map((w, idx) => (
          <div key={idx} className="bg-white/90 p-4 rounded-3xl min-w-[105px] text-center border-2 border-slate/40 shadow-sm">
            <span className="text-[10px] font-bold block mb-2">{w.hour}</span>
            <div className="text-sm font-bold text-sage">{w.temp}°C</div>
          </div>
        ))}
      </div>

      {/* 日期選擇 */}
      <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar">
        {dates.map((date) => (
          <div key={date} onClick={() => setSelectedDate(date)} className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center cursor-pointer border-2 ${selectedDate === date ? 'bg-sage text-white border-white' : 'bg-white text-earth border-slate'}`}>
            <span className="text-xl font-bold">{new Date(date).getDate()}</span>
          </div>
        ))}
      </div>

      {/* 行程內容 */}
      <div className="space-y-5">
        {currentDayData.items.map((item) => (
          <NordicCard key={item.id} className="py-6 px-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-earth-dark">{item.time}</div>
                <h4 className="text-xl font-bold text-sage">{item.location}</h4>
              </div>
              <i className={`fa-solid ${getCategoryIcon(item.category)} text-earth/30 text-2xl`}></i>
            </div>
          </NordicCard>
        ))}
      </div>
      
      {/* 編輯按鈕 (僅在編輯模式顯示) */}
      {isEditMode && (
        <div className="fixed bottom-24 right-6 flex flex-col gap-3">
          <button onClick={() => setShowDateModal(true)} className="w-14 h-14 bg-terracotta text-white rounded-full shadow-lg flex items-center justify-center"><i className="fa-solid fa-calendar-plus"></i></button>
          <button onClick={() => { setEditingItem({ id: Date.now().toString(), time: '12:00', location: '', category: 'Attraction', note: '' }); setShowEditModal(true); }} className="w-14 h-14 bg-sage text-white rounded-full shadow-lg flex items-center justify-center"><i className="fa-solid fa-plus"></i></button>
        </div>
      )}

      {/* 彈窗：新增日期 */}
      <Modal isOpen={showDateModal} onClose={() => setShowDateModal(false)} title="新增日期">
        <div className="space-y-4 p-4">
          <input type="date" value={newDateInput} onChange={(e) => setNewDateInput(e.target.value)} className="w-full p-4 border-2 border-slate rounded-2xl" />
          <NordicButton onClick={() => {
            if (!newDateInput || fullSchedule[newDateInput]) return;
            setFullSchedule(prev => ({...prev, [newDateInput]: { items: [], metadata: { locationName: '新目的地', forecast: [], isLive: false } } }));
            setSelectedDate(newDateInput); setShowDateModal(false);
          }} className="w-full">確定新增</NordicButton>
        </div>
      </Modal>

      {/* 彈窗：編輯行程 */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="行程設定">
        {editingItem && (
          <div className="space-y-4 p-4">
            <input type="text" value={editingItem.location} onChange={(e) => setEditingItem({...editingItem, location: e.target.value})} placeholder="地點" className="w-full p-4 border-2 border-slate rounded-2xl" />
            <input type="time" value={editingItem.time} onChange={(e) => setEditingItem({...editingItem, time: e.target.value})} className="w-full p-4 border-2 border-slate rounded-2xl" />
            <NordicButton onClick={() => {
              setFullSchedule(prev => {
                const next = { ...prev };
                next[selectedDate].items = [...next[selectedDate].items.filter(i => i.id !== editingItem.id), editingItem].sort((a,b) => a.time.localeCompare(b.time));
                return next;
              });
              setShowEditModal(false);
            }} className="w-full">儲存</NordicButton>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleView;