
export type Category = 'Attraction' | 'Food' | 'Transport' | 'Accommodation' | 'Activity' | 'Shopping';
export type BookingType = 'flight' | 'hotel' | 'activity' | 'ticket';
export type PackingCategory = 'Essential' | 'Gadgets' | 'Clothing' | 'Beauty' | 'Daily' | 'Others';

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
  details: {
    // 飛行資訊
    from?: string;
    to?: string;
    depTime?: string;
    arrTime?: string;
    flightNo?: string;
    terminal?: string;
    cabinClass?: string; // 艙等 (經濟、商務...)
    
    // 飯店/活動/交通票共通
    address?: string;
    checkIn?: string;
    checkOut?: string;
    time?: string;
    voucherUrl?: string;
    info?: string;
    image?: string;
    seat?: string;
    attachment?: string;
  };
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
  title?: string; // 新增：稱號
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  assignedTo: string; // Member ID or 'ALL'
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  ownerId: string;
  category?: PackingCategory;
}