export type Category = 'Attraction' | 'Food' | 'Transport' | 'Accommodation' | 'Activity' | 'Shopping';
export type BookingType = 'flight' | 'hotel' | 'activity' | 'ticket';
export type PackingCategory = 'Essential' | 'Gadgets' | 'Clothing' | 'Beauty' | 'Others';

export interface ScheduleItem {
  id: string;
  time: string;
  location: string;
  category: Category;
  note?: string;
  mapUrl?: string;
  bookingRef?: string;
}

export interface WeatherInfo {
  hour: string;
  temp: number;
  condition: 'sunny' | 'rainy' | 'cloudy' | 'snowy';
}

export interface DayMetadata {
  locationName: string;
  forecast: WeatherInfo[];
}

export interface Booking {
  id: string;
  type: BookingType;
  title: string;
  date: string;
  details: any;
  price: number;
  currency: string;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  payerId: string;
  splitWith: string[];
  addedBy: string;
  date: string;
  note: string;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  assignedTo: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  ownerId: string;
  category?: PackingCategory;
}