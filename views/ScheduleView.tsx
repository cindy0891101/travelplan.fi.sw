import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dbService } from '../firebaseService';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { MOCK_SCHEDULE, MOCK_WEATHER, CATEGORY_COLORS } from '../constants';
import { ScheduleItem, Category, WeatherInfo } from '../types';

// --- 型別與輔助函式 ---
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
  '台南': '臺南', '高雄': '高雄', '中国': '中國', '日本': '日本',
  '泰国': '泰國', '越南': '越南', '新加坡': '新加坡'
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
  // 1. 狀態初始化 (預設先抓本地緩存，避免閃爍)
  const [fullSchedule, setFullSchedule] = useState<Record<string, DayData>>(() => {
    const saved = localStorage.getItem('nordic_full_schedule');
    if (saved) return JSON.parse(saved);
    
    // 若無緩存，初始化預設資料
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
  // 2. 核心雲端同步邏輯
  // ---------------------------------------------------------
  
  // A. 監聽雲端更新 (即時同步手機與電腦)
  useEffect(() => {
    const unsubscribe = dbService.subscribeFullSchedule((cloudData) => {
      if (cloudData) {
        setFullSchedule(cloudData);
        // 如果當前選取的日期消失了，跳回第一天
        if (selectedDate && !cloudData[selectedDate]) {
          const newDates = Object.keys(cloudData).sort();
          if (newDates.length > 0) setSelectedDate(newDates[0]);
        }
      }
    });
    return () => unsubscribe?.();
  }, [selectedDate]);

  // B. 編輯模式下，任何變動自動存入雲端
  useEffect(() => {
    if (isEditMode) {
      localStorage.setItem('nordic_full_schedule', JSON.stringify(fullSchedule));
      dbService.saveFullSchedule(fullSchedule);
    }
  }, [fullSchedule, isEditMode]);

  // ---------------------------------------------------------

  useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
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
    const query = location.trim();
    if (!query || !targetDate) return;
    if (!isAutoUpgrade) setIsFetchingWeather(true);
    
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&format=json&language=zh-Hant`);
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        if (!isAutoUpgrade) alert(`找不到地點「${query}」`);
        setIsFetchingWeather(false); return;
      }
      
      const { latitude, longitude, name: officialName, country } = geoData.results[0];
      const fixedName = fixToTraditional(officialName);
      const fixedCountry = country ? fixToTraditional(country) : '';
      const displayLocation = fixedCountry ? `${fixedName}, ${fixedCountry}` : fixedName;
      
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(targetDate); target.setHours(0,0,0,0);
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 16 || diffDays < -1) {
        const meta = { locationName: displayLocation, forecast: MOCK_WEATHER.map(w => ({ ...w, feelsLike: w.temp - 2 })), isLive: false };
        if (isAutoUpgrade) setFullSchedule(prev => ({ ...prev, [targetDate]: { ...prev[targetDate], metadata: meta } }));
        else setTempMetadata(meta);
        setIsFetchingWeather(false); return;
      }

      const params = "hourly=temperature_2m,apparent_temperature,weathercode&timezone=auto";
      let apiUrl = diffDays < 0 
        ? `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${targetDate}&end_date=${targetDate}&${params}`
        : `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&start_date=${targetDate}&end_date=${targetDate}&${params}`;

      const weatherRes = await fetch(apiUrl);
      const weatherData = await weatherRes.json();
      if (!weatherData.hourly) throw new Error("No data");

      const { time, temperature_2m, apparent_temperature, weathercode } = weatherData.hourly;
      const newForecast: ExtendedWeatherInfo[] = [];
      for (let i = 0; i < time.length && i < 24; i += 3) {
        newForecast.push({
          hour: time[i].split('T')[1].substring(0, 5),
          temp: Math.round(temperature_2m[i]),
          feelsLike: Math.round(apparent_temperature[i]),
          condition: (code => {
            if (code === 0) return 'sunny';
            if (code <= 3) return 'cloudy';
            if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
            return 'cloudy';
          })(weathercode[i])
        });
      }

      const meta = { locationName: displayLocation, forecast: newForecast, isLive: true };
      if (isAutoUpgrade) setFullSchedule(prev => ({ ...prev, [targetDate]: { ...prev[targetDate], metadata: meta } }));
      else setTempMetadata(meta);
    } catch (e) {
      console.error(e);
    } finally { setIsFetchingWeather(false); }
  }, []);

  useEffect(() => {
    const dayData = fullSchedule[selectedDate];
    if (!dayData) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(selectedDate); target.setHours(0,0,0,0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 16 && diffDays >= -1 && !dayData.metadata.isLive && dayData.metadata.locationName !== '未設定') {
      fetchWeatherForLocationAndDate(dayData.metadata.locationName, selectedDate, true);
    }
  }, [selectedDate, fullSchedule, fetchWeatherForLocationAndDate]);

  // 操作處理
  const handleTimeShift = (minutes: number) => {
    setFullSchedule(prev => {
      const dayData = prev[selectedDate];
      if (!dayData) return prev;
      const updatedItems = dayData.items.map(item => ({
        ...item,
        time: shiftTimeStr(item.time, minutes)
      })).sort((a, b) => a.time.compareLocale ? a.time.localeCompare(b.time) : (a.time > b.time ? 1 : -1));
      return { ...prev, [selectedDate]: { ...dayData, items: updatedItems } };
    });
    setShowTimeShiftModal(false);
  };

  const handleDeleteDate = (dateToDelete: string) => {
    if (dates.length <= 1) { alert("行程至少需保留一天。"); return; }
    setFullSchedule(prev => { const next = { ...prev }; delete next[dateToDelete]; return { ...next }; });
  };

  const handleRenameDate = (oldDate: string, newDate: string) => {
    if (!newDate || oldDate === newDate) { setDateToEdit(null); return; }
    if (fullSchedule[newDate]) { alert("此日期已存在"); return; }
    setFullSchedule(prev => { 
      const next = { ...prev };
      next[newDate] = next[oldDate];
      delete next[oldDate];
      return { ...next }; 
    });
    if (selectedDate === oldDate) setSelectedDate(newDate);
    setDateToEdit(null);
  };

  const handleDeleteItem = (date: string, itemId: string) => {
    setFullSchedule(prev => ({
      ...prev,
      [date]: { ...prev[date], items: prev[date].items.filter(i => i.id !== itemId) }
    }));
  };

  const currentDayData = fullSchedule[selectedDate] || { items: [], metadata: { locationName: '未設定', forecast: [], isLive: false } };

  const getCategoryIcon = (category: Category) => {
    switch(category) {
      case 'Transport': return 'fa-car'; 
      case 'Food': return 'fa-utensils';
      case 'Attraction': return 'fa-camera';
      case 'Accommodation': return 'fa-bed';
      case 'Activity': return 'fa-star'; 
      case 'Shopping': return 'fa-bag-shopping'; 
      default: return 'fa-location-dot';
    }
  };

  const getWeatherDisplay = (condition: string, hour: string) => {
    const h = parseInt(hour.split(':')[0]);
    const isNight = h < 6 || h >= 18;
    switch(condition) {
      case 'sunny': return isNight ? 'fa-moon text-indigo-300' : 'fa-sun text-yellow-400';
      case 'rainy': return 'fa-cloud-showers-heavy text-blue-400';
      case 'snowy': return 'fa-snowflake text-blue-200';
      default: return isNight ? 'fa-cloud-moon text-slate-400' : 'fa-cloud text-slate-400';
    }
  };

  const categoryList: Category[] = ['Attraction', 'Food', 'Transport', 'Accommodation', 'Activity', 'Shopping'];

  return (
    <div className="pb-24 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      {/* 頁首 */}
      <div className="pt-4 flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold text-sage tracking-tight">行程日誌</h1>
          <p className="text-earth-dark mt-1 font-bold">{timeLeft}</p>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-[10px] font-bold text-earth-dark uppercase tracking-[0.15em]">目的地</span>
           <div className="text-sm font-bold text-sage bg-white/60 px-5 py-2 rounded-full border border-slate shadow-sm min-w-[120px] text-center">
             {currentDayData.metadata.locationName}
           </div>
        </div>
      </div>

      {/* 氣象卡片 */}
      <div className="space-y-2 overflow-x-hidden px-1">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-earth-dark uppercase tracking-widest">當日預報</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${currentDayData.metadata.isLive ? 'bg-sage/20 text-sage' : 'bg-terracotta/20 text-terracotta'}`}>
              {currentDayData.metadata.isLive ? '實時預報' : '規畫預覽'}
            </span>
          </div>
          {isEditMode && (
            <button onClick={() => { setTempMetadata({ ...currentDayData.metadata, locationName: '' }); setShowWeatherModal(true); }} className="text-[10px] font-bold text-sage hover:underline flex items-center gap-1 opacity-80">
              <i className="fa-solid fa-location-dot"></i> 修改目的地
            </button>
          )}
        </div>
        {currentDayData.metadata.forecast.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1 snap-x">
            {currentDayData.metadata.forecast.map((w, idx) => (
              <div key={idx} className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl min-w-[105px] text-center border-2 border-slate/40 nordic-shadow flex-shrink-0 snap-start">
                <span className="text-[10px] font-bold text-earth-dark block mb-2">{w.hour}</span>
                <div className="h-8 flex items-center justify-center mb-1"><i className={`fa-solid ${getWeatherDisplay(w.condition, w.hour)} text-xl`}></i></div>
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-sage block">{w.temp}°C</span>
                  <span className="text-[9px] font-bold text-earth-dark block opacity-70">體感 {w.feelsLike}°</span>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="bg-white/50 rounded-3xl p-10 text-center border-2 border-dashed border-slate opacity-60 text-xs">尚未設定地點氣象</div>}
      </div>

      {/* 日期選擇器 */}
      <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar items-center px-2 snap-x">
        {dates.map((date) => (
          <div key={date} onClick={() => setSelectedDate(date)} className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer snap-start ${selectedDate === date ? 'bg-sage text-white scale-110 shadow-lg border-2 border-white' : 'bg-white text-earth border-2 border-slate'}`}>
            <span className="text-[10px] font-bold">{new Date(date).getMonth() + 1}月</span>
            <span className="text-xl font-bold">{new Date(date).getDate()}</span>
          </div>
        ))}
        {isEditMode && (
          <div className="flex gap-2 items-center pl-2">
            <button onClick={() => setShowDateModal(true)} className="w-14 h-14 rounded-3xl border-2 border-dashed border-earth bg-white/20 flex items-center justify-center text-earth shadow-sm"><i className="fa-solid fa-plus text-xs"></i></button>
            <button onClick={() => setShowManageDatesModal(true)} className="w-14 h-14 rounded-3xl border-2 border-slate bg-white/20 flex items-center justify-center text-sage shadow-sm"><i className="fa-solid fa-gear text-xs"></i></button>
          </div>
        )}
      </div>

      {/* 行程列表 */}
      <div className="space-y-5 px-1 relative">
        {isEditMode && currentDayData.items.length > 0 && (
          <div className="flex justify-end mb-2 pr-1">
            <button onClick={() => setShowTimeShiftModal(true)} className="text-[10px] font-bold text-terracotta bg-terracotta/10 px-4 py-2 rounded-full border border-terracotta/20 flex items-center gap-2 shadow-sm">
              <i className="fa-solid fa-clock-rotate-left"></i> 時程快速調整
            </button>
          </div>
        )}
        
        {currentDayData.items.length > 0 ? currentDayData.items.map((item, index) => (
          <div key={item.id} className="relative pl-16 pr-4 animate-in fade-in slide-in-from-left-2 duration-300">
            {index < currentDayData.items.length - 1 && <div className="absolute left-[21px] top-1/2 h-[calc(100%+1.25rem)] border-l-2 border-dashed border-earth/60 z-0"></div>}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-[1.25rem] border-[3px] border-white nordic-shadow z-10 flex items-center justify-center ${CATEGORY_COLORS[item.category]}`}>
              <i className={`text-white text-xl fa-solid ${getCategoryIcon(item.category)}`}></i>
            </div>
            <NordicCard onClick={() => isEditMode && (setEditingItem(item), setShowEditModal(true))} className={`${isEditMode ? 'hover:border-sage' : ''} flex justify-between items-center pr-3 py-6`}>
              <div className="flex-grow space-y-1.5 pl-2">
                <div className="text-base text-earth-dark">{item.time}</div>
                <h4 className="text-xl font-bold text-sage leading-tight">{item.location}</h4>
                {item.note && <p className="text-sm text-earth-dark italic mt-2 border-l-2 border-earth/30 pl-3">{item.note}</p>}
              </div>
              {isEditMode && (
                <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(selectedDate, item.id); }} className="w-10 h-10 flex items-center justify-center text-earth/60 hover:text-terracotta ml-2"><i className="fa-solid fa-trash-can text-sm"></i></button>
              )}
            </NordicCard>
          </div>
        )) : <div className="py-20 text-center text-earth-dark/40 italic text-xs font-bold tracking-widest uppercase">本日尚無計畫項目</div>}
        
        {isEditMode && (
          <button onClick={() => { setEditingItem({ id: Date.now().toString(), time: '12:00', location: '', category: 'Attraction', note: '' }); setShowEditModal(true); }} className="w-full h-14 border-2 border-dashed border-earth-dark rounded-3xl bg-white/20 flex items-center justify-center gap-2 text-earth-dark font-bold active:scale-95 transition-all mt-4 text-xs shadow-sm"><i className="fa-solid fa-plus-circle"></i> 新增行程項目</button>
        )}
      </div>

      {/* --- 所有彈窗 (Modals) --- */}
      
      {/* 批量時間調整 */}
      <Modal isOpen={showTimeShiftModal} onClose={() => setShowTimeShiftModal(false)} title="批量調整時間">
        <div className="space-y-6 px-1 pb-4">
          <p className="text-xs text-earth-dark font-bold">一次將本日所有行程提前或延後。</p>
          <div className="flex items-center justify-center gap-4 bg-white p-6 rounded-4xl border-2 border-slate shadow-inner">
             <button onClick={() => setShiftValue(Math.max(5, shiftValue - 5))} className="w-10 h-10 rounded-full bg-slate text-sage"><i className="fa-solid fa-minus"></i></button>
             <div className="text-center min-w-[100px]"><span className="text-4xl font-bold text-sage">{shiftValue}</span><span className="text-xs block font-bold">分鐘</span></div>
             <button onClick={() => setShiftValue(shiftValue + 5)} className="w-10 h-10 rounded-full bg-slate text-sage"><i className="fa-solid fa-plus"></i></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NordicButton onClick={() => handleTimeShift(-shiftValue)} variant="secondary" className="flex-col py-6"><i className="fa-solid fa-angles-left mb-1"></i><span>提前 {shiftValue}m</span></NordicButton>
            <NordicButton onClick={() => handleTimeShift(shiftValue)} className="flex-col py-6 bg-terracotta border-none text-white"><i className="fa-solid fa-angles-right mb-1"></i><span>延後 {shiftValue}m</span></NordicButton>
          </div>
        </div>
      </Modal>

      {/* 目的地與氣象設定 */}
      <Modal isOpen={showWeatherModal} onClose={() => setShowWeatherModal(false)} title="目的地設定">
        {tempMetadata && (
          <div className="space-y-6 pb-4">
            <div className="bg-white p-1 rounded-full border-2 border-slate shadow-sm flex items-center gap-2">
              <input type="text" value={tempMetadata.locationName} onChange={(e) => setTempMetadata({...tempMetadata, locationName: e.target.value})} placeholder="搜尋城市 (如: 東京)..." className="flex-grow p-4 bg-transparent font-bold text-sage text-sm outline-none pl-4" />
              <button onClick={() => fetchWeatherForLocationAndDate(tempMetadata.locationName, selectedDate)} disabled={isFetchingWeather} className="w-12 h-12 bg-sage text-white rounded-full flex items-center justify-center shadow-md mr-1">{isFetchingWeather ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}</button>
            </div>
            {tempMetadata.forecast.length > 0 && (
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 snap-x">
                {tempMetadata.forecast.map((w, idx) => (
                  <div key={idx} className="bg-white/80 p-3 rounded-2xl min-w-[85px] text-center border border-slate shadow-inner snap-start">
                    <span className="text-[9px] font-bold block mb-1">{w.hour}</span>
                    <i className={`fa-solid ${getWeatherDisplay(w.condition, w.hour)} text-lg block mb-1`}></i>
                    <div className="text-xs font-bold text-sage">{w.temp}°</div>
                  </div>
                ))}
              </div>
            )}
            <NordicButton onClick={() => { if (!tempMetadata.locationName) return; setFullSchedule(prev => ({ ...prev, [selectedDate]: { ...prev[selectedDate], metadata: tempMetadata } })); setShowWeatherModal(false); }} className={`w-full py-4 nordic-shadow font-bold ${!tempMetadata.locationName || isFetchingWeather ? 'opacity-50 pointer-events-none' : ''}`}>儲存目的地設定</NordicButton>
          </div>
        )}
      </Modal>

      {/* 管理行程日期 */}
      <Modal isOpen={showManageDatesModal} onClose={() => {setShowManageDatesModal(false); setDateToEdit(null);}} title="管理行程日期">
        <div className="space-y-4">
          <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar">
            {dates.map(date => (
              <div key={date} className="bg-white p-4 rounded-3xl border-2 border-slate flex items-center justify-between shadow-sm">
                {dateToEdit === date ? (
                  <div className="flex gap-2 w-full"><input type="date" defaultValue={date} onChange={(e) => setDateRenameInput(e.target.value)} className="w-full p-3 bg-cream border-2 border-slate rounded-2xl font-bold text-xs" /><button onClick={() => handleRenameDate(date, dateRenameInput || date)} className="w-11 h-11 bg-sage text-white rounded-2xl flex items-center justify-center shadow-md"><i className="fa-solid fa-check"></i></button></div>
                ) : (
                  <>
                    <div className="flex flex-col pl-2"><span className="text-base font-bold text-sage">{date}</span><span className="text-[10px] text-earth-dark font-bold opacity-70">{fullSchedule[date]?.items.length || 0} 行程項目</span></div>
                    <div className="flex gap-2"><button onClick={() => { setDateToEdit(date); setDateRenameInput(date); }} className="w-10 h-10 rounded-xl bg-slate text-sage"><i className="fa-solid fa-pen"></i></button><button onClick={() => handleDeleteDate(date)} className="w-10 h-10 rounded-xl bg-terracotta/10 text-terracotta"><i className="fa-solid fa-trash-can"></i></button></div>
                  </>
                )}
              </div>
            ))}
          </div>
          <NordicButton onClick={() => setShowManageDatesModal(false)} className="w-full py-4 font-bold">完成並返回</NordicButton>
        </div>
      </Modal>

      {/* 新增日期 */}
      <Modal isOpen={showDateModal} onClose={() => setShowDateModal(false)} title="新增日期">
        <div className="space-y-4 px-1 pb-4">
          <input type="date" value={newDateInput} onChange={(e) => setNewDateInput(e.target.value)} className="w-full p-6 bg-white border-2 border-slate rounded-3xl font-bold text-sage text-center" />
          <NordicButton onClick={() => { 
            if (!newDateInput || fullSchedule[newDateInput]) return;
            setFullSchedule(prev => ({...prev, [newDateInput]: { items: [], metadata: { locationName: '新目的地', forecast: MOCK_WEATHER.map(w => ({ ...w, feelsLike: w.temp - 2 })), isLive: false } } })); 
            setSelectedDate(newDateInput); setShowDateModal(false); setNewDateInput(''); 
          }} className="w-full py-5 bg-terracotta text-white nordic-shadow font-bold uppercase tracking-widest">確定新增日期</NordicButton>
        </div>
      </Modal>

      {/* 行程編輯彈窗 */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="行程細節設定">
        {editingItem && (
          <div className="space-y-6 px-1 pb-6">
            <div className="space-y-2"><label className="text-[10px] font-bold text-earth-dark uppercase pl-1">目的地名稱</label><input type="text" value={editingItem.location} onChange={(e) => setEditingItem({...editingItem, location: e.target.value})} className="w-full p-5 bg-white border-2 border-slate rounded-3xl font-bold text-sage" /></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-earth-dark uppercase pl-1">預計時間</label><input type="time" value={editingItem.time} onChange={(e) => setEditingItem({...editingItem, time: e.target.value})} className="w-full p-5 bg-white border-2 border-slate rounded-3xl font-bold text-sage text-center" /></div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-earth-dark uppercase pl-1">行程類別</label>
              <div className="grid grid-cols-6 gap-2 p-2 bg-white border-2 border-slate rounded-2xl shadow-sm">
                {categoryList.map(cat => (<button key={cat} onClick={() => setEditingItem({...editingItem, category: cat})} className={`aspect-square rounded-xl flex items-center justify-center transition-all ${editingItem.category === cat ? `${CATEGORY_COLORS[cat]} text-white shadow-md` : 'text-earth/50'}`}><i className={`fa-solid ${getCategoryIcon(cat)} text-sm`}></i></button>))}
              </div>
            </div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-earth-dark uppercase pl-1">行程備註細節</label><textarea value={editingItem.note} onChange={(e) => setEditingItem({...editingItem, note: e.target.value})} className="w-full p-5 bg-white border-2 border-slate rounded-3xl text-sm text-sage min-h-[80px]" /></div>
            <div className="pt-2 space-y-3">
              <NordicButton onClick={() => { setFullSchedule(prev => { const next = { ...prev }; Object.keys(next).forEach(d => { next[d].items = next[d].items.filter(i => i.id !== editingItem.id); }); next[selectedDate].items = [...next[selectedDate].items, editingItem].sort((a, b) => a.time.localeCompare(b.