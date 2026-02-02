
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { MOCK_WEATHER, CATEGORY_COLORS } from '../constants';
import type{ ScheduleItem, Category, WeatherInfo } from '../types';
import { dbService } from '../firebaseService';

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
  onToggleLock?: () => void;
}

const shiftTimeStr = (timeStr: string, minutes: number): string => {
  if (!timeStr) return "12:00";
  const [hours, mins] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, mins || 0, 0, 0);
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
  let fixed = text || "";
  Object.keys(T_CHINESE_MAP).forEach(key => {
    fixed = fixed.replace(new RegExp(key, 'g'), T_CHINESE_MAP[key]);
  });
  return fixed;
};

const ScheduleView: React.FC<ScheduleViewProps> = ({ isEditMode, onToggleLock }) => {
  const [fullSchedule, setFullSchedule] = useState<Record<string, DayData>>({});

  useEffect(() => {
    const unsubscribe = dbService.subscribeField('schedule', (data) => {
      if (data && typeof data === 'object') {
        setFullSchedule(data);
      } else if (data === undefined) {
        setFullSchedule({});
      }
    });

    return () => unsubscribe();
  }, []);

  const dates = useMemo(() => Object.keys(fullSchedule || {}).sort(), [fullSchedule]);
  const [selectedDate, setSelectedDate] = useState(dates[0] || '');
  const [timeLeft, setTimeLeft] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showManageDatesModal, setShowManageDatesModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showTimeShiftModal, setShowTimeShiftModal] = useState(false);

  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [newDateInput, setNewDateInput] = useState('');
  const [tempMetadata, setTempMetadata] = useState<ExtendedDayMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [dateToEdit, setDateToEdit] = useState<string | null>(null);
  const [dateRenameInput, setDateRenameInput] = useState('');
  const [shiftValue, setShiftValue] = useState(30);

  useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    } else if (dates.length === 0) {
      setSelectedDate('');
    }
  }, [dates, selectedDate]);

  useEffect(() => {
    if (!dates || dates.length === 0) {
      setTimeLeft('尚未設定行程日期');
      return;
    }
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

  const updateScheduleCloud = (newData: Record<string, DayData>) => {
    setFullSchedule(newData);
    dbService.updateField('schedule', newData);
  };

  const fetchWeatherForLocationAndDate = useCallback(async (location: string, targetDate: string, isAutoUpgrade: boolean = false) => {
    const query = (location || "").trim();
    if (!query || !targetDate) return;
    if (!isAutoUpgrade) setIsFetchingWeather(true);
    
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&format=json&language=zh-Hant`);
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        if (!isAutoUpgrade) alert(`找不到地點「${query}」`);
        setIsFetchingWeather(false);
        return;
      }
      const { latitude, longitude, name: officialName, country } = geoData.results[0];
      const fixedName = fixToTraditional(officialName);
      const fixedCountry = country ? fixToTraditional(country) : '';
      const displayLocation = fixedCountry ? `${fixedName}, ${fixedCountry}` : fixedName;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const params = "hourly=temperature_2m,apparent_temperature,weathercode&timezone=auto";
      let apiUrl = (diffDays > 16 || diffDays < -1)
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
            if (code >= 71 && code <= 77) return 'snowy';
            if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
            return 'cloudy';
          })(weathercode[i])
        });
      }
      const meta = { locationName: displayLocation, forecast: newForecast, isLive: true };
      if (isAutoUpgrade) {
          updateScheduleCloud({ ...fullSchedule, [targetDate]: { ...fullSchedule[targetDate], metadata: meta } });
      } else {
        setTempMetadata(meta);
      }
    } catch (e) { 
      console.error(e);
      if (!isAutoUpgrade) {
        setTempMetadata(prev => ({ 
          locationName: query || (prev?.locationName || '未知地點'), 
          forecast: MOCK_WEATHER.map(w => ({ ...w, feelsLike: w.temp - 2 })),
          isLive: false
        }));
      }
    } finally { 
      setIsFetchingWeather(false); 
    }
  }, [fullSchedule]);

  useEffect(() => {
    if (!selectedDate) return;
    const dayData = fullSchedule[selectedDate];
    if (!dayData || !dayData.metadata) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(selectedDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 16 && diffDays >= -1 && !dayData.metadata.isLive && dayData.metadata.locationName !== '未設定') {
      fetchWeatherForLocationAndDate(dayData.metadata.locationName, selectedDate, true);
    }
  }, [selectedDate, fullSchedule, fetchWeatherForLocationAndDate]);

  const handleTimeShift = (minutes: number) => {
    if (!selectedDate) return;
    const dayData = fullSchedule[selectedDate];
    if (!dayData || !dayData.items) return;
    const updatedItems = [...dayData.items].map(item => ({
      ...item,
      time: shiftTimeStr(item.time, minutes)
    })).sort((a, b) => a.time.localeCompare(b.time));
    updateScheduleCloud({ ...fullSchedule, [selectedDate]: { ...dayData, items: updatedItems } });
    setShowTimeShiftModal(false);
  };

  const currentDayData = selectedDate ? (fullSchedule[selectedDate] || { items: [], metadata: { locationName: '未設定', forecast: [], isLive: false } }) : null;

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

  const getWeatherDisplay = (condition: string, hour: string, temp: number) => {
    if (temp < 0) return 'fa-snowflake text-blue-400 drop-shadow-md';
    const h = parseInt((hour || "00:00").split(':')[0]);
    const isNight = h < 6 || h >= 18;
    switch(condition) {
      case 'sunny': return isNight ? 'fa-moon text-indigo-300' : 'fa-sun text-yellow-400';
      case 'rainy': return 'fa-cloud-showers-heavy text-blue-400';
      case 'snowy': return 'fa-snowflake text-blue-400';
      case 'cloudy': return isNight ? 'fa-cloud-moon text-slate-400' : 'fa-cloud text-white drop-shadow-md';
      default: return isNight ? 'fa-cloud-moon text-slate-400' : 'fa-cloud text-white drop-shadow-md';
    }
  };

  const categoryList: Category[] = ['Attraction', 'Food', 'Transport', 'Accommodation', 'Activity', 'Shopping'];

  return (
    <div className="pb-24 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      <div className="pt-2 flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-ink tracking-tight">行程日誌</h1>
          {onToggleLock && (
            <button 
              onClick={onToggleLock}
              className="opacity-0 hover:opacity-100 active:opacity-100 focus:opacity-100 transition-opacity p-2 -ml-1"
              title={isEditMode ? "鎖定視圖" : "開啟編輯"}
            >
              <i className={`fa-solid ${isEditMode ? 'fa-lock-open text-stamp' : 'fa-lock text-ink/20'}`}></i>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => isEditMode && selectedDate && (setTempMetadata({...currentDayData!.metadata}), setSearchQuery(''), setShowWeatherModal(true))}
             disabled={!selectedDate && isEditMode}
             className={`text-sm font-bold text-ink bg-white/60 px-5 py-2 rounded-full border border-paper shadow-sm text-center min-w-[120px] tracking-tight flex items-center justify-center gap-2 ${isEditMode && selectedDate ? 'hover:bg-white active:scale-95 transition-all cursor-pointer' : 'opacity-50'}`}
           >
             {currentDayData?.metadata?.locationName || '未設定'}
             {isEditMode && selectedDate && <i className="fa-solid fa-pen text-[9px] opacity-40"></i>}
           </button>
        </div>
      </div>
      
      <div className="px-1 -mt-4">
        <p className="text-earth-dark font-bold text-xs">{timeLeft}</p>
      </div>

      <div className="space-y-2 overflow-x-hidden px-1">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-earth-dark uppercase tracking-widest">當日預報</span>
          </div>
        </div>
        {currentDayData?.metadata?.forecast?.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1 snap-x snap-mandatory">
            {currentDayData.metadata.forecast.map((w, idx) => (
              <div key={idx} className="bg-white/95 backdrop-blur-sm p-4 rounded-3xl min-w-[105px] text-center border-2 border-paper/40 shadow-xl flex-shrink-0 snap-start animate-in fade-in duration-500">
                <span className="text-[10px] font-bold text-earth-dark block mb-2">{w.hour}</span>
                <div className="h-8 flex items-center justify-center mb-1">
                  <i className={`fa-solid ${getWeatherDisplay(w.condition, w.hour, w.temp)} text-xl`}></i>
                </div>
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-ink block">{w.temp}°C</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center border-2 border-dashed border-paper rounded-[2.5rem] bg-white/10 opacity-60">
            <p className="text-xs font-bold text-earth-dark italic">尚未設定目的地或地點</p>
          </div>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto py-4 no-scrollbar items-center px-2 snap-x snap-mandatory">
        {dates.map((date) => (
          <div key={date} onClick={() => setSelectedDate(date)} className={`flex-shrink-0 w-16 h-20 rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer snap-start ${selectedDate === date ? 'bg-ink text-white scale-110 shadow-xl border-2 border-white' : 'bg-white text-ink border-2 border-paper/40 hover:border-harbor/40'}`}>
            <span className="text-[10px] font-bold">{new Date(date).getMonth() + 1}月</span>
            <span className="text-xl font-bold">{new Date(date).getDate()}</span>
          </div>
        ))}
        {isEditMode && (
          <div className="flex gap-2 items-center pl-2">
            <button onClick={() => setShowDateModal(true)} className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-dashed border-paper bg-white/20 flex items-center justify-center text-ink active:scale-90 transition-all shadow-sm"><i className="fa-solid fa-plus text-xs"></i></button>
            {dates.length > 0 && (
              <button onClick={() => setShowManageDatesModal(true)} className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-paper bg-white/20 flex items-center justify-center text-ink active:scale-90 transition-all shadow-sm"><i className="fa-solid fa-gear text-xs"></i></button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6 overflow-x-hidden relative px-1">
        {isEditMode && (currentDayData?.items?.length || 0) > 0 && (
          <div className="flex justify-end mb-2 pr-1">
            <button onClick={() => setShowTimeShiftModal(true)} className="text-[10px] font-bold text-stamp bg-stamp/10 px-4 py-2 rounded-full border border-stamp/20 flex items-center gap-2 hover:bg-stamp/20 transition-all shadow-sm"><i className="fa-solid fa-clock-rotate-left"></i> 時程調整</button>
          </div>
        )}
        {currentDayData?.items?.length > 0 ? currentDayData.items.map((item, index) => (
          <div key={item.id} className="relative pl-16 pr-4 animate-in fade-in slide-in-from-left-2 duration-300 group">
            {index < currentDayData.items.length - 1 && <div className="absolute left-[21px] top-1/2 h-[calc(100%+1.5rem)] border-l-2 border-dashed border-paper/60 z-0"></div>}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-[1.5rem] border-[3px] border-white shadow-lg z-10 flex items-center justify-center ${CATEGORY_COLORS[item.category] || 'bg-ink'}`}><i className={`text-white text-xl fa-solid ${getCategoryIcon(item.category)}`}></i></div>
            <div 
              onClick={() => isEditMode && (setEditingItem(item), setShowEditModal(true))}
              className={`bg-white rounded-[2rem] p-6 shadow-md border-2 border-paper/30 ${isEditMode ? 'hover:border-harbor/40 cursor-pointer' : ''} transition-all flex justify-between items-center`}
            >
              <div className="flex-grow space-y-1 pl-2">
                <div className="text-sm font-bold text-earth-dark tracking-wide">{item.time}</div>
                <h4 className="text-xl font-bold text-ink leading-tight">{item.location}</h4>
                {item.note && <p className="text-xs text-earth-dark font-normal mt-2 italic">{item.note}</p>}
              </div>
              {isEditMode && (
                <button 
                  onClick={(e) => { e.stopPropagation(); updateScheduleCloud({ ...fullSchedule, [selectedDate]: { ...currentDayData!, items: currentDayData!.items.filter(i => i.id !== item.id) } }); }}
                  className="w-10 h-10 rounded-full bg-stamp/10 text-stamp flex items-center justify-center active:scale-90 transition-all"
                >
                  <i className="fa-solid fa-trash-can text-sm"></i>
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="py-20 text-center text-earth-dark/40 italic text-xs font-bold tracking-widest uppercase border-2 border-dashed border-paper/20 rounded-[3rem]">
            {dates.length === 0 ? "請先點擊上方 + 號新增旅遊日期" : "本日尚無計畫"}
          </div>
        )}
        {isEditMode && selectedDate && (
          <div className="px-1">
            <button onClick={() => { setEditingItem({ id: Date.now().toString(), time: '12:00', location: '', category: 'Attraction', note: '' }); setShowEditModal(true); }} className="w-full h-16 border-2 border-dashed border-paper rounded-[2rem] bg-white/40 flex items-center justify-center gap-2 text-ink font-bold active:scale-95 transition-all mt-4 text-xs shadow-md hover:bg-white hover:border-paper"><i className="fa-solid fa-plus-circle"></i> 新增行程項目</button>
          </div>
        )}
      </div>

      <Modal isOpen={showWeatherModal} onClose={() => setShowWeatherModal(false)} title="目的地設定">
        {tempMetadata && (
          <div className="space-y-6 overflow-x-hidden pb-4">
            <div className="px-1 pt-1">
              <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1 block mb-2">搜尋目的地 (城市或地標)</label>
              <div className="bg-white p-1 rounded-full border-2 border-paper shadow-sm flex items-center gap-2">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="搜尋目的地 (例如：北海道)..." 
                  className="min-w-0 flex-grow h-[56px] p-4 bg-transparent font-bold text-ink text-sm outline-none pl-4" 
                />
                <button 
                  onClick={() => fetchWeatherForLocationAndDate(searchQuery, selectedDate)} 
                  disabled={isFetchingWeather} 
                  className="w-12 h-12 min-w-[48px] bg-ink text-white rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-all shadow-md mr-1 disabled:opacity-50"
                >
                  {isFetchingWeather ? <i className="fa-solid fa-spinner animate-spin text-sm"></i> : <i className="fa-solid fa-magnifying-glass text-sm"></i>}
                </button>
              </div>
            </div>

            <div className="px-1 animate-in fade-in slide-in-from-top-2 duration-300">
              {tempMetadata.forecast && tempMetadata.forecast.length > 0 && tempMetadata.isLive ? (
                <div className="bg-white p-6 rounded-4xl border-2 border-paper shadow-lg flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-earth-dark uppercase tracking-widest block mb-1">搜尋結果</span>
                      <p className="text-lg font-bold text-harbor leading-tight">{tempMetadata.locationName}</p>
                      <div className="flex items-center gap-2 mt-2">
                         <span className="text-2xl font-bold text-ink">{tempMetadata.forecast[4]?.temp ?? '--'}°C</span>
                         <span className="text-[10px] text-earth-dark font-bold">體感 {tempMetadata.forecast[4]?.feelsLike ?? '--'}°</span>
                      </div>
                   </div>
                   <div className="w-16 h-16 bg-paper/10 rounded-full flex items-center justify-center shadow-inner border border-paper/20">
                      <i className={`fa-solid ${getWeatherDisplay(tempMetadata.forecast[4]?.condition || 'cloudy', '12:00', tempMetadata.forecast[4]?.temp || 20)} text-3xl`}></i>
                   </div>
                </div>
              ) : (
                <div className="bg-white/50 p-6 rounded-4xl border-2 border-paper shadow-inner text-center">
                   <p className="text-[10px] text-earth-dark font-bold opacity-60 italic">輸入地點並點擊放大鏡以查看預覽</p>
                </div>
              )}
            </div>

            <div className="px-1">
              <NordicButton 
                onClick={() => { 
                  if (!tempMetadata?.locationName) return; 
                  updateScheduleCloud({ ...fullSchedule, [selectedDate]: { ...fullSchedule[selectedDate], metadata: tempMetadata } }); 
                  setShowWeatherModal(false); 
                }} 
                className={`w-full py-4.5 text-sm font-bold ${!tempMetadata?.locationName || isFetchingWeather ? 'opacity-50 pointer-events-none' : ''}`}
              >
                儲存目的地並套用氣象
              </NordicButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showTimeShiftModal} onClose={() => setShowTimeShiftModal(false)} title="批量調整時間">
        <div className="space-y-6 px-1 pb-4">
          <p className="text-xs text-ink font-bold leading-relaxed">一次將本日所有行程提前或延後。</p>
          <div className="flex items-center justify-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-paper shadow-inner">
             <button onClick={() => setShiftValue(Math.max(5, shiftValue - 5))} className="w-10 h-10 rounded-full bg-paper text-ink flex items-center justify-center"><i className="fa-solid fa-minus"></i></button>
             <div className="text-center min-w-[100px]"><span className="text-4xl font-bold text-ink">{shiftValue}</span><span className="text-xs font-bold text-earth-dark block">分鐘</span></div>
             <button onClick={() => setShiftValue(shiftValue + 5)} className="w-10 h-10 rounded-full bg-paper text-ink flex items-center justify-center"><i className="fa-solid fa-plus"></i></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NordicButton onClick={() => handleTimeShift(-shiftValue)} variant="secondary" className="flex-col py-6"><i className="fa-solid fa-angles-left mb-1"></i><span>提前 {shiftValue}m</span></NordicButton>
            <NordicButton onClick={() => handleTimeShift(shiftValue)} className="flex-col py-6 bg-stamp border-none"><i className="fa-solid fa-angles-right mb-1"></i><span>延後 {shiftValue}m</span></NordicButton>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showManageDatesModal} onClose={() => {setShowManageDatesModal(false); setDateToEdit(null);}} title="管理行程日期">
        <div className="space-y-4 overflow-x-hidden">
          <div className="space-y-3 max-h-[55vh] overflow-y-auto no-scrollbar pr-1 pb-2">
            {dates.map(date => (
              <div key={date} className="bg-white p-4 rounded-[2rem] border-2 border-paper flex items-center justify-between shadow-sm hover:border-harbor/50 transition-all">
                {dateToEdit === date ? (
                  <div className="flex gap-2 w-full items-center min-w-0">
                    <input type="date" value={dateRenameInput} onChange={(e) => setDateRenameInput(e.target.value)} className="w-full h-[56px] p-3 bg-cream border-2 border-paper rounded-2xl font-bold text-ink text-xs outline-none" />
                    <button 
                      onClick={() => { 
                        if (!dateRenameInput) { setDateToEdit(null); return; }
                        // 如果日期沒變，直接退出
                        if (dateRenameInput === date) { setDateToEdit(null); return; }
                        // 如果目標日期已存在，提示不可修改
                        if (fullSchedule[dateRenameInput]) { alert("該日期已存在"); return; }
                        
                        // 建立全新複本並重新分配
                        const next = { ...fullSchedule }; 
                        next[dateRenameInput] = { ...next[date] }; 
                        delete next[date]; 
                        updateScheduleCloud(next); 
                        setDateToEdit(null); 
                      }} 
                      className="w-11 h-11 bg-ink text-white rounded-2xl flex items-center justify-center shadow-md active:scale-90"
                    >
                      <i className="fa-solid fa-check text-sm"></i>
                    </button>
                  </div>
                ) : (
                  <><div className="flex flex-col pl-2"><span className="text-base font-bold text-ink tracking-tight">{date}</span><span className="text-[10px] text-earth-dark font-bold uppercase mt-0.5 opacity-70">{(fullSchedule[date]?.items?.length || 0)} 項目</span></div><div className="flex gap-2"><button onClick={() => { setDateToEdit(date); setDateRenameInput(date); }} className="w-11 h-11 rounded-xl bg-paper/40 text-ink flex items-center justify-center shadow-sm"><i className="fa-solid fa-pen text-xs"></i></button><button onClick={() => { if (dates.length > 1) { const next = { ...fullSchedule }; delete next[date]; updateScheduleCloud(next); } }} className="w-11 h-11 rounded-xl bg-stamp/10 text-stamp flex items-center justify-center shadow-sm"><i className="fa-solid fa-trash-can text-xs"></i></button></div></>
                )}
              </div>
            ))}
          </div>
          <NordicButton onClick={() => setShowManageDatesModal(false)} className="w-full py-4.5 text-sm font-bold">完成並返回</NordicButton>
        </div>
      </Modal>

      <Modal isOpen={showDateModal} onClose={() => setShowDateModal(false)} title="新增日期">
        <div className="space-y-4 overflow-x-hidden px-1 pb-4">
          <input type="date" value={newDateInput} onChange={(e) => setNewDateInput(e.target.value)} className="w-full h-[56px] p-6 bg-white border-2 border-paper rounded-[2rem] font-bold text-ink text-center" />
          <NordicButton onClick={() => { if (!newDateInput || fullSchedule[newDateInput]) return; updateScheduleCloud({...fullSchedule, [newDateInput]: { items: [], metadata: { locationName: '新目的地', forecast: MOCK_WEATHER.map(w => ({ ...w, feelsLike: w.temp - 2 })), isLive: false } } }); setSelectedDate(newDateInput); setShowDateModal(false); setNewDateInput(''); }} className="w-full py-5 bg-stamp text-white text-sm font-bold uppercase tracking-widest">確定新增日期</NordicButton>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="行程細節設定">
        {editingItem && (
          <div className="space-y-6 px-1 pb-6 overflow-x-hidden">
            <div className="space-y-2"><label className="text-[10px] font-bold text-earth-dark uppercase pl-1">項目名稱</label><input type="text" value={editingItem.location} onChange={(e) => setEditingItem({...editingItem, location: e.target.value})} className="w-full h-[56px] p-5 bg-white border-2 border-paper rounded-[2rem] font-bold text-ink shadow-sm" /></div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-earth-dark uppercase pl-1">預計時間</label><input type="time" value={editingItem.time} onChange={(e) => setEditingItem({...editingItem, time: e.target.value})} className="w-full h-[56px] p-5 bg-white border-2 border-paper rounded-[2rem] font-bold text-ink shadow-sm text-center" /></div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-earth-dark uppercase pl-1">行程類別</label>
              <div className="grid grid-cols-6 gap-2 p-2 bg-white border-2 border-paper rounded-[1.5rem] shadow-sm">
                {categoryList.map(cat => (<button key={cat} onClick={() => setEditingItem({...editingItem, category: cat})} className={`aspect-square rounded-xl flex items-center justify-center transition-all ${editingItem.category === cat ? `${CATEGORY_COLORS[cat] || 'bg-ink'} text-white shadow-md` : 'text-earth/50'}`}><i className={`fa-solid ${getCategoryIcon(cat)} text-sm`}></i></button>))}
              </div>
            </div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-earth-dark uppercase pl-1">行程備註細節</label><textarea value={editingItem.note} onChange={(e) => setEditingItem({...editingItem, note: e.target.value})} className="w-full p-5 bg-white border-2 border-paper rounded-[2rem] text-sm text-ink min-h-[100px] shadow-sm" /></div>
            <div className="pt-2 space-y-3">
              <NordicButton onClick={() => { const next = { ...fullSchedule }; Object.keys(next).forEach(d => { if (next[d]?.items) next[d].items = next[d].items.filter(i => i.id !== editingItem.id); }); if (next[selectedDate]) next[selectedDate].items = [...(next[selectedDate].items || []), editingItem].sort((a, b) => a.time.localeCompare(b.time)); updateScheduleCloud(next); setShowEditModal(false); }} className="w-full py-5 bg-ink text-white font-bold">儲存行程細節</NordicButton>
              <button onClick={() => { updateScheduleCloud({ ...fullSchedule, [selectedDate]: { ...currentDayData!, items: (currentDayData!.items || []).filter(i => i.id !== editingItem.id) } }); setShowEditModal(false); }} className="w-full py-3 text-stamp font-bold text-xs uppercase hover:underline"><i className="fa-solid fa-trash-can mr-2"></i> 刪除此項行程</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleView;