
import { Member, ScheduleItem, WeatherInfo } from './types';

export const MOCK_MEMBERS: Member[] = [
  { id: '1', name: '小明', avatar: 'https://picsum.photos/seed/m1/100/100' },
  { id: '2', name: '小紅', avatar: 'https://picsum.photos/seed/m2/100/100' },
  { id: '3', name: '阿強', avatar: 'https://picsum.photos/seed/m3/100/100' }
];

export const CATEGORY_COLORS: Record<string, string> = {
  Attraction: 'bg-morandi-blue',
  Food: 'bg-morandi-pink',
  Transport: 'bg-sage',
  Accommodation: 'bg-terracotta',
  Activity: 'bg-[#9BA4B5]',
  Shopping: 'bg-[#B4846C]'
};

export const MOCK_SCHEDULE: Record<string, ScheduleItem[]> = {
  '2025-05-20': [
    { id: 's1', time: '10:00', location: '桃園國際機場', category: 'Transport', note: '提早2小時報到' },
    { id: 's2', time: '14:30', location: '東京羽田機場', category: 'Transport', note: '購買西瓜卡' },
    { id: 's3', time: '18:00', location: '銀座敘敘苑燒肉', category: 'Food', note: '已預約，需準時' }
  ],
  '2025-05-21': [
    { id: 's4', time: '09:00', location: '淺草寺', category: 'Attraction', note: '穿和服體驗' },
    { id: 's5', time: '12:00', location: '仲見世商店街', category: 'Food', note: '邊走邊吃美食' }
  ]
};

export const MOCK_WEATHER: WeatherInfo[] = [
  { hour: '08:00', temp: 18, condition: 'sunny' },
  { hour: '11:00', temp: 22, condition: 'cloudy' },
  { hour: '14:00', temp: 24, condition: 'sunny' },
  { hour: '17:00', temp: 20, condition: 'cloudy' },
  { hour: '20:00', temp: 16, condition: 'rainy' }
];

export const CURRENCIES = {
  TWD: 1,
  EUR: 35.1
};
