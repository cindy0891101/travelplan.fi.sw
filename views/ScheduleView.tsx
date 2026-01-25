import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dbService } from '../firebaseService';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { MOCK_SCHEDULE, MOCK_WEATHER, CATEGORY_COLORS } from '../constants';
import { ScheduleItem, Category, WeatherInfo } from '../types';

// --- 型別定義 ---
interface ExtendedWeatherInfo extends WeatherInfo { feelsLike: number; }
interface ExtendedDayMetadata { locationName: string; forecast: ExtendedWeatherInfo[]; isLive?: boolean; }
interface DayData { items: ScheduleItem[]; metadata: ExtendedDayMetadata; }
interface ScheduleViewProps { isEditMode?: boolean; }

const ScheduleView: React.FC<ScheduleViewProps> = ({ isEditMode }) => {
  // 1. 狀態初始化：增加「防空」邏輯，如果 local 沒資料就抓 MOCK
  const [fullSchedule, setFullSchedule] = useState<Record<string, DayData>>(() => {
    const saved = localStorage.getItem('nordic_full_schedule');
    if (saved && saved !== '{}') return JSON.parse(saved);
    
    // 初始化預設資料 (確保畫面不是白的)
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
  // 2. 雲端同步核心
  // ---------------------------------------------------------
  
  // A. 監聽：從雲端抓資料下來
  useEffect(() => {
    const unsubscribe = dbService.subscribeFullSchedule((cloudData) => {
      if (cloudData && Object.keys(cloudData).length > 0) {
        console.log("收到雲端更新:", cloudData);
        setFullSchedule(cloudData);
      }
    });
    return () => unsubscribe?.();
  }, []);

  // B. 手動同步函式 (用於強制建立 Firestore configs)
  const forceSyncToCloud = async () => {
    try {
      await dbService.saveFullSchedule(fullSchedule);
      alert("✅ 雲端同步成功！請檢查 Firebase Console 的 configs 集合。");
    } catch (err: any) {
      alert("❌ 同步失敗：" + err.message);
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
    const icons = { Transport: 'fa-car', Food: 'fa-utensils', Attraction: 'fa-camera', Accommodation: 'fa-bed', Activity: 'fa-star', Shopping: 'fa-bag-shopping' };
    return icons[category] || 'fa-location-dot';
  };

  return (
    <div className="pb-24 px-4 space-y-6">
      <div className="pt-4 flex justify-between items-