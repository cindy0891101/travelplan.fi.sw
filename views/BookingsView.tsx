
import React, { useState, useEffect, useRef } from 'react';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { Booking, BookingType } from '../types';

interface BookingsViewProps {
  isEditMode?: boolean;
}

const BookingsView: React.FC<BookingsViewProps> = ({ isEditMode }) => {
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('nordic_bookings');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<BookingType>('flight');
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Partial<Booking> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('nordic_bookings', JSON.stringify(bookings));
  }, [bookings]);

  const categories: { id: BookingType; label: string }[] = [
    { id: 'flight', label: '機票' },
    { id: 'hotel', label: '飯店' },
    { id: 'activity', label: '行程' }, 
    { id: 'ticket', label: '交通票' }
  ];

  const filteredBookings = bookings.filter(b => b.type === activeTab);
  const flights = bookings.filter(b => b.type === 'flight');

  useEffect(() => {
    if (activeTab === 'flight' && flights.length > 0 && !expandedFlightId) {
      setExpandedFlightId(flights[0].id);
    }
  }, [activeTab, flights.length]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingBooking) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingBooking({ ...editingBooking, details: { ...editingBooking.details, image: reader.result } });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!editingBooking?.type || !editingBooking?.title) return;
    
    if (editingBooking.id) {
      setBookings(bookings.map(b => b.id === editingBooking.id ? editingBooking as Booking : b));
    } else {
      const newBooking = { ...editingBooking, id: Date.now().toString() } as Booking;
      setBookings([...bookings, newBooking]);
    }
    setShowAddModal(false);
    setEditingBooking(null);
  };

  const deleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    if (expandedFlightId === id) setExpandedFlightId(null);
    if (expandedTicketId === id) setExpandedTicketId(null);
  };

  const renderFlightCard = (flight: Booking, idx: number) => {
    const isExpanded = expandedFlightId === flight.id;
    return (
      <div 
        key={flight.id}
        onClick={() => setExpandedFlightId(isExpanded ? null : flight.id)}
        className={`w-full transition-all duration-500 ease-in-out cursor-pointer relative ${isExpanded ? 'mb-4' : '-mb-40'}`}
        style={{ zIndex: 10 + idx }}
      >
        <div className={`bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-slate transform transition-transform duration-300 ${isExpanded ? 'scale-100 rotate-0' : 'scale-[0.98] hover:translate-y-[-5px]'}`}>
          <div className="bg-sage p-4 text-white flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-80">Boarding Pass</span>
              <span className="text-xs font-bold leading-tight">{flight.title}</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full border border-white/10">
                 <span className="text-[10px] font-bold tracking-widest">{flight.date || '--'}</span>
                 <i className="fa-solid fa-plane -rotate-45 text-[10px] translate-y-[-0.5px]"></i>
               </div>
               {isEditMode && (
                 <div className="flex gap-1">
                   <button onClick={(e) => { e.stopPropagation(); setEditingBooking(flight); setShowAddModal(true); }} className="hover:text-white transition-colors p-1"><i className="fa-solid fa-pen text-[10px]"></i></button>
                   <button onClick={(e) => { e.stopPropagation(); deleteBooking(flight.id); }} className="hover:text-terracotta transition-colors p-1"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                 </div>
               )}
            </div>
          </div>
          <div className={`p-6 bg-white transition-opacity duration-300 ${!isExpanded ? 'opacity-40' : 'opacity-100'}`}>
            <div className="flex justify-between items-center mb-8">
              <div className="text-left">
                <div className="text-3xl font-bold text-sage">{flight.details.from || '---'}</div>
                <div className="text-lg font-bold text-earth-dark/70 mt-1">{flight.details.depTime || '--:--'}</div>
                <div className="text-[8px] text-earth-dark font-bold uppercase tracking-widest mt-1">Departure</div>
              </div>
              <div className="flex-grow flex flex-col items-center px-4 relative">
                <div className="text-[9px] text-earth-dark font-bold mb-2">{flight.details.flightNo || 'FLIGHT'}</div>
                <div className="w-full border-t-2 border-dashed border-slate relative">
                  <i className="fa-solid fa-plane absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-earth text-sm bg-white px-2"></i>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-sage">{flight.details.to || '---'}</div>
                <div className="text-lg font-bold text-earth-dark/70 mt-1">{flight.details.arrTime || '--:--'}</div>
                <div className="text-[8px] text-earth-dark font-bold uppercase tracking-widest mt-1">Arrival</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate/50">
              <div>
                <span className="block text-[8px] font-bold text-earth-dark uppercase opacity-60">Terminal</span>
                <span className="text-sm font-bold text-sage">{flight.details.terminal || '--'}</span>
              </div>
              <div className="text-right">
                <span className="block text-[8px] font-bold text-earth-dark uppercase opacity-60">Class</span>
                <span className="text-sm font-bold text-sage">{flight.details.seat || '--'}</span>
              </div>
            </div>
          </div>
          <div className="absolute left-[-12px] top-[54px] w-6 h-6 rounded-full bg-cream border-r-2 border-slate"></div>
          <div className="absolute right-[-12px] top-[54px] w-6 h-6 rounded-full bg-cream border-l-2 border-slate"></div>
        </div>
      </div>
    );
  };

  const renderPhotoCard = (booking: Booking) => (
    <NordicCard key={booking.id} className="p-0 overflow-hidden group border-none shadow-lg">
      <div className="h-56 overflow-hidden relative">
        <img 
          src={booking.details.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800"} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          alt={booking.title} 
        />
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-full text-[10px] font-bold text-sage shadow-md uppercase tracking-widest">
          {booking.type === 'hotel' ? 'Hotel' : 'Schedule'}
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-sage leading-tight">{booking.title}</h3>
            {booking.details.address ? (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.details.address)}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 text-earth-dark hover:text-sage transition-colors group/link"
              >
                <i className="fa-solid fa-location-dot text-[10px]"></i>
                <p className="text-xs font-medium underline underline-offset-4 decoration-earth/40 group-hover/link:decoration-sage">{booking.details.address}</p>
              </a>
            ) : (
              <div className="flex items-center gap-2 text-earth-dark opacity-40">
                <i className="fa-solid fa-location-dot text-[10px]"></i>
                <p className="text-xs font-medium italic">尚未填寫地址</p>
              </div>
            )}
          </div>
          {isEditMode && (
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); setEditingBooking(booking); setShowAddModal(true); }} className="w-8 h-8 rounded-full bg-sage/10 text-sage flex items-center justify-center active:scale-90 transition-all"><i className="fa-solid fa-pen text-[10px]"></i></button>
              <button onClick={(e) => { e.stopPropagation(); deleteBooking(booking.id); }} className="w-8 h-8 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center active:scale-90 transition-all"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
            </div>
          )}
        </div>
        <div className="flex justify-between items-end pt-4 border-t border-slate/50">
          <div className="flex gap-6">
            <div className="text-xs">
              <span className="text-earth-dark block uppercase font-bold text-[8px] opacity-60 tracking-widest mb-1">{booking.type === 'hotel' ? 'Check-In' : 'Date'}</span>
              <span className="text-sage font-bold text-sm">{booking.date}</span>
            </div>
            {booking.type === 'hotel' && booking.details.checkOut && (
              <div className="text-xs">
                <span className="text-earth-dark block uppercase font-bold text-[8px] opacity-60 tracking-widest mb-1">Check-Out</span>
                <span className="text-sage font-bold text-sm">{booking.details.checkOut}</span>
              </div>
            )}
          </div>
          {booking.details.attachment && (
            <a href={booking.details.attachment} target="_blank" rel="noreferrer" className="bg-sage text-white px-4 py-2 rounded-xl text-[10px] font-bold shadow-sm">查看憑證</a>
          )}
        </div>
        {booking.details.info && (
          <div className="pt-2">
            <p className="text-[10px] font-bold text-earth-dark/40 uppercase tracking-widest mb-1">{booking.type === 'hotel' ? '飯店資訊' : '行程備註'}</p>
            <p className="text-xs text-earth-dark leading-relaxed line-clamp-2">{booking.details.info}</p>
          </div>
        )}
      </div>
    </NordicCard>
  );

  const renderTicketCard = (booking: Booking) => {
    const isExpanded = expandedTicketId === booking.id;
    return (
      <div 
        key={booking.id} 
        onClick={() => setExpandedTicketId(isExpanded ? null : booking.id)}
        className="relative group animate-in slide-in-from-right-4 duration-500 cursor-pointer"
      >
        <div className="bg-white rounded-3xl border-2 border-slate overflow-hidden flex flex-col shadow-sm transition-all duration-300">
          <div className="flex min-h-[140px]">
            <div className="w-20 bg-sage flex flex-col items-center justify-center text-white border-r-2 border-dashed border-slate/40 gap-3 relative">
              <i className="fa-solid fa-train text-2xl"></i>
              <span className="text-[9px] font-bold uppercase rotate-180 tracking-[0.4em]" style={{ writingMode: 'vertical-rl' }}>TRANSIT TICKET</span>
            </div>
            <div className="flex-grow p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-sage text-lg">{booking.title}</h4>
                {isEditMode && (
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setEditingBooking(booking); setShowAddModal(true); }} className="w-8 h-8 rounded-full bg-sage/10 text-sage flex items-center justify-center active:scale-90 transition-all"><i className="fa-solid fa-pen text-[10px]"></i></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteBooking(booking.id); }} className="w-8 h-8 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center active:scale-90 transition-all"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-[8px] text-earth-dark font-bold uppercase opacity-50 mb-1">Departure</div>
                  <div className="text-lg font-bold text-sage">{booking.details.fromTime || '--:--'}</div>
                </div>
                <div className="flex-grow border-t-2 border-dashed border-slate/30 relative flex flex-col items-center">
                  <span className="text-[8px] font-bold text-earth-dark/30 mb-1">TO</span>
                  <i className="fa-solid fa-chevron-right text-[10px] text-earth-dark/40 bg-white px-2"></i>
                </div>
                <div className="text-center">
                  <div className="text-[8px] text-earth-dark font-bold uppercase opacity-50 mb-1">Arrival</div>
                  <div className="text-lg font-bold text-sage">{booking.details.arrTime || '--:--'}</div>
                </div>
              </div>
              <div className="text-[10px] font-bold text-earth-dark tracking-widest flex justify-between pt-2 border-t border-slate/50 mt-2 pt-3">
                <span>{booking.date}</span>
                {booking.details.attachment && (
                  <a href={booking.details.attachment} target="_blank" rel="noreferrer" className="text-[10px] text-sage font-bold flex items-center gap-1 hover:underline" onClick={(e) => e.stopPropagation()}><i className="fa-solid fa-ticket"></i> 查看憑證</a>
                )}
                <span className="opacity-40 uppercase">Seat: {booking.details.seat || '--'}</span>
              </div>
            </div>
          </div>
          {isExpanded && booking.details.info && (
            <div className="bg-slate/10 px-6 py-4 border-t border-slate/50 animate-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] font-bold text-earth-dark uppercase tracking-widest mb-1 opacity-60">乘車備註</p>
              <p className="text-xs text-sage font-medium whitespace-pre-wrap leading-relaxed">{booking.details.info}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-32 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      <div className="pt-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-sage tracking-tight">行程預訂</h1>
          <p className="text-earth-dark mt-1 font-bold">集結所有旅遊憑證與驚喜</p>
        </div>
        {isEditMode && (
          <button 
            onClick={() => {
              setEditingBooking({ type: activeTab, details: {}, date: new Date().toISOString().split('T')[0] });
              setShowAddModal(true);
            }}
            className="w-12 h-12 bg-terracotta text-white rounded-2xl shadow-lg flex items-center justify-center text-xl active:scale-90 transition-all border-2 border-white"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => { setActiveTab(cat.id); setExpandedFlightId(null); setExpandedTicketId(null); }}
            className={`px-8 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold transition-all uppercase tracking-widest ${activeTab === cat.id ? 'bg-sage text-white shadow-md' : 'bg-white text-earth border-2 border-slate hover:border-sage/40'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {activeTab === 'flight' ? (
        <div className="space-y-4">
          {flights.length > 0 ? (
            <>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-earth-dark uppercase tracking-widest">航班卡包 ({flights.length})</span>
                <span className="text-[9px] font-bold text-sage opacity-60">點擊機票展開詳情</span>
              </div>
              <div className={`relative transition-all duration-500 ${expandedFlightId ? 'pb-4' : 'pb-48'}`}>
                {flights.map((flight, idx) => renderFlightCard(flight, idx))}
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-earth-dark/20 border-2 border-dashed border-slate rounded-[2.5rem] bg-white/10 flex flex-col items-center">
              <i className="fa-solid fa-plane text-5xl mb-4 opacity-10"></i>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]">目前尚無航班資訊</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBookings.length > 0 ? (
            filteredBookings.map(booking => {
              if (booking.type === 'ticket') return renderTicketCard(booking);
              return renderPhotoCard(booking);
            })
          ) : (
            <div className="py-24 text-center text-earth-dark/20 border-2 border-dashed border-slate rounded-[2.5rem] bg-white/10 flex flex-col items-center">
              <i className={`fa-solid ${activeTab === 'hotel' ? 'fa-hotel' : activeTab === 'activity' ? 'fa-map-location-dot' : 'fa-train'} text-5xl mb-4 opacity-10`}></i>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]">目前尚無{activeTab === 'hotel' ? '飯店' : activeTab === 'ticket' ? '車票' : '行程'}預訂資訊</p>
            </div>
          )}
        </div>
      )}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingBooking?.id ? "修改預訂資訊" : "新增預訂項目"}>
        {editingBooking && (
          <div className="space-y-5 pb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">預訂類別</label>
              <div className="grid grid-cols-4 gap-2">
                {['flight', 'hotel', 'activity', 'ticket'].map(t => (
                  <button key={t} onClick={() => setEditingBooking({ ...editingBooking, type: t as any, details: {} })} className={`py-3 rounded-2xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${editingBooking.type === t ? 'bg-sage text-white border-sage shadow-md' : 'bg-white text-sage border-slate opacity-60'}`}>{t === 'flight' ? '機票' : t === 'hotel' ? '飯店' : t === 'activity' ? '行程' : '車票'}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">{editingBooking.type === 'hotel' ? '飯店名稱' : editingBooking.type === 'activity' ? '行程名稱' : editingBooking.type === 'ticket' ? '票券名稱 (如: 新幹線)' : '名稱 / 航空公司'}</label>
              <input type="text" value={editingBooking.title || ''} onChange={(e) => setEditingBooking({ ...editingBooking, title: e.target.value })} placeholder={editingBooking.type === 'hotel' ? "飯店名稱" : editingBooking.type === 'activity' ? "行程名稱" : editingBooking.type === 'ticket' ? "如：新幹線 希望號" : "例如：長榮航空 BR198"} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage outline-none" />
            </div>
            {editingBooking.type === 'flight' ? (
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate/20 rounded-3xl space-y-0">
                <div className="col-span-2 text-[9px] font-bold text-earth-dark uppercase tracking-widest mb-1">航班行程</div>
                <div className="col-span-2 space-y-1 mb-2"><input type="date" value={editingBooking.date || ''} onChange={(e) => setEditingBooking({...editingBooking, date: e.target.value})} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" /></div>
                <input placeholder="起飛 (TPE)" value={editingBooking.details?.from || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, from: e.target.value.toUpperCase()}})} className="p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                <input placeholder="抵達 (NRT)" value={editingBooking.details?.to || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, to: e.target.value.toUpperCase()}})} className="p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                <input type="time" placeholder="出發時間" value={editingBooking.details?.depTime || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, depTime: e.target.value}})} className="p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                <input type="time" placeholder="抵達時間" value={editingBooking.details?.arrTime || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, arrTime: e.target.value}})} className="p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                <input placeholder="航班號" value={editingBooking.details?.flightNo || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, flightNo: e.target.value.toUpperCase()}})} className="p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                <input placeholder="艙等 (Class)" value={editingBooking.details?.seat || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, seat: e.target.value}})} className="p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                <input placeholder="航廈 (Terminal)" value={editingBooking.details?.terminal || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, terminal: e.target.value}})} className="col-span-2 p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">{editingBooking.type === 'hotel' ? '入住日期' : '日期'}</label>
                    <input type="date" value={editingBooking.date || ''} onChange={(e) => setEditingBooking({ ...editingBooking, date: e.target.value })} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                  </div>
                  {editingBooking.type === 'hotel' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">退房日期</label>
                      <input type="date" value={editingBooking.details?.checkOut || ''} onChange={(e) => setEditingBooking({ ...editingBooking, details: { ...editingBooking.details, checkOut: e.target.value } })} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                    </div>
                  ) : editingBooking.type === 'ticket' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">出發時間</label>
                      <input type="time" value={editingBooking.details?.fromTime || ''} onChange={(e) => setEditingBooking({ ...editingBooking, details: { ...editingBooking.details, fromTime: e.target.value } })} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                    </div>
                  ) : null}
                </div>
                {editingBooking.type === 'ticket' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">抵達時間</label>
                      <input type="time" value={editingBooking.details?.arrTime || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, arrTime: e.target.value}})} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">座位 / 車廂</label>
                      <input placeholder="如：5車 12A" value={editingBooking.details?.seat || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, seat: e.target.value}})} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                    </div>
                  </div>
                )}
                {(editingBooking.type === 'hotel' || editingBooking.type === 'activity') && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">詳細地址</label>
                    <input placeholder="例如：東京都銀座1-1-1" value={editingBooking.details?.address || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, address: e.target.value}})} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">憑證連結 (網址)</label>
                  <input type="url" placeholder="貼上電子憑證連結..." value={editingBooking.details?.attachment || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, attachment: e.target.value}})} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-earth-dark uppercase tracking-widest pl-1">{editingBooking.type === 'hotel' ? '飯店資訊' : editingBooking.type === 'ticket' ? '乘車備註' : '行程細節'}</label>
                  <textarea placeholder={editingBooking.type === 'hotel' ? "入住須知、早餐時間或房型備註..." : editingBooking.type === 'ticket' ? "轉乘資訊或取票序號..." : "記錄行程的重要筆記..."} value={editingBooking.details?.info || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, info: e.target.value}})} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage text-sm min-h-[100px] outline-none focus:border-sage" />
                </div>
                {editingBooking.type !== 'ticket' && (
                  <>
                    <div onClick={() => fileInputRef.current?.click()} className="h-32 bg-slate/20 rounded-2xl border-2 border-dashed border-slate flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                      {editingBooking.details?.image ? <img src={editingBooking.details.image} className="w-full h-full object-cover" /> : <><i className="fa-solid fa-camera text-earth text-2xl mb-1"></i><span className="text-[10px] font-bold text-earth-dark">點擊上傳相關照片</span></>}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </>
                )}
              </div>
            )}
            <NordicButton onClick={handleSave} className="w-full py-5 bg-sage text-white font-bold mt-4 shadow-xl border-none">儲存預訂資訊</NordicButton>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BookingsView;
