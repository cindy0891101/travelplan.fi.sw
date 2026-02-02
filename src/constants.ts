
import type { Member, ScheduleItem, WeatherInfo } from './types';

export const CATEGORY_COLORS: Record<string, string> = {
  Attraction: 'bg-harbor', // Harbor Blue
  Food: 'bg-paper',      // Aged Paper
  Transport: 'bg-steel',  // Faded Steel
  Accommodation: 'bg-ink', // Ink Charcoal
  Activity: 'bg-harbor',  // Harbor Blue (Variation)
  Shopping: 'bg-stamp'    // Stamp Red
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