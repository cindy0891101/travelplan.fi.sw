import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dbService } from '../firebaseService';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { MOCK_SCHEDULE, MOCK_WEATHER } from '../constants';
import { ScheduleItem, Category, WeatherInfo } from '../types';

// --- 內部常數定義 (防止 import 失敗) ---
const CATEGORY_COLORS_MAP: Record<string, string> = {
  Transport: 'bg-blue-400',
  Food: 'bg-orange-400',
  Attraction: 'bg-green-400',
  Accommodation: 'bg-indigo-400',
  Activity: 'bg-purple-400',
  Shopping: 'bg-pink-400'
};

// --- 型別與輔助函式 ---
interface ExtendedWeatherInfo extends WeatherInfo { feelsLike: number; }
interface ExtendedDayMetadata { locationName: string; forecast: ExtendedWeatherInfo[]; isLive?: boolean; }
interface DayData { items: ScheduleItem[]; metadata: ExtendedDayMetadata; }
interface ScheduleViewProps { isEditMode?: boolean; }

const ScheduleView: React.FC<ScheduleViewProps> = ({ isEditMode = true }) => {
  // 1. 狀態初始化
  const [fullSchedule, setFullSchedule] = useState<Record<string, DayData>>(() => {
    try {
      const saved = localStorage.getItem('nordic_full_schedule');
      if (saved && saved !== '{}') return JSON.parse(saved);
    } catch (e) { console.error("Local storage read error", e); }
    
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
  
  // UI 狀態
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [newDateInput, setNewDateInput] = useState('');

  // ---------------------------------------------------------
  // 2. 核心功能：雲端同步與監聽
  // ---------------------------------------------------------
  
  useEffect(() => {
    const unsubscribe = dbService.subscribeFullSchedule((cloudData) => {
      if (cloudData && Object.keys(cloudData).length > 0) {
        setFullSchedule(cloudData);
      }
    });
    return () => unsubscribe?.();
  }, []);

  const forceSyncToCloud = async () => {
    try {
      await dbService.saveFullSchedule(fullSchedule);
      alert("✅ 雲端同步成功！");
    } catch (err: any) {
      alert("❌ 同bs失敗：" + err.message);
    }
  };

  // ---------------------------------------------------------

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
          <button onClick={forceSyncToCloud} className="mt-2 text-[10px] bg-terracotta text-white px-3 py-1 rounded-full shadow-md">
            <i className="fa-solid fa-cloud-arrow-up mr-1"></i> 強制同步
          </button>