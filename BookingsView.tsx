
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NordicCard, Modal, NordicButton } from '../components/Shared';
import { Booking, BookingType } from '../types';
import { dbService } from '../firebaseService';

interface BookingsViewProps {
  isEditMode?: boolean;
}

const BookingsView: React.FC<BookingsViewProps> = ({ isEditMode }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<BookingType>('flight');
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Partial<Booking> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = dbService.subscribeField('bookings', (data) => {
      setBookings(data || []);
    });
    return () => unsubscribe();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => b.type === activeTab).sort((a, b) => a.date.localeCompare(b.date));
  }, [bookings, activeTab]);

  const updateBookingsCloud = (newBookings: Booking[]) => {
    setBookings(newBookings);
    dbService.updateField('bookings', newBookings);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingBooking) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingBooking({ 
          ...editingBooking, 
          details: { ...editingBooking.details, image: reader.result as string } 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!editingBooking?.title) return;
    
    let next;
    if (editingBooking.id) {
      next = bookings.map(b => b.id === editingBooking.id ? editingBooking as Booking : b);
    } else {
      const newBooking = { 
        ...editingBooking, 
        id: Date.now().toString(), 
        type: activeTab,
        date: editingBooking.date || new Date().toISOString().split('T')[0]
      } as Booking;
      next = [newBooking, ...bookings];
    }
    updateBookingsCloud(next);
    setShowAddModal(false);
    setEditingBooking(null);
  };

  const deleteBooking = (id: string) => {
    updateBookingsCloud(bookings.filter(b => b.id !== id));
    if (expandedFlightId === id) setExpandedFlightId(null);
    if (expandedTicketId === id) setExpandedTicketId(null);
  };

  const openGoogleMaps = (address: string) => {
    if (!address) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const renderWalletFlight = (flight: Booking, idx: number) => {
    const isExpanded = expandedFlightId === flight.id;
    const isAnyExpanded = expandedFlightId !== null;
    
    const headerExposure = 75; 
    let translateY = idx * headerExposure; 
    let opacity = 1;

    if (isAnyExpanded) {
      if (isExpanded) {
        translateY = 0;
      } else {
        translateY = 1000;
        opacity = 0;
      }
    }

    return (
      <div 
        key={flight.id}
        onClick={() => setExpandedFlightId(isExpanded ? null : flight.id)}
        className="absolute w-full left-0 right-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
        style={{ 
          transform: `translateY(${translateY}px)`,
          zIndex: isExpanded ? 50 : 10 + idx,
          opacity: opacity,
        }}
      >
        <div className={`rounded-[2rem] overflow-hidden shadow-xl relative border border-black/5 transition-all duration-500 bg-white`}>
          <div className="bg-[#1A2F2B] px-8 py-3 text-white">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <div className="text-[8px] font-bold tracking-[0.3em] opacity-50 uppercase">BOARDING PASS</div>
                <div className="text-xl font-bold tracking-tight">{flight.title}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 px-3 py-1 rounded-full flex items-center gap-2 border border-white/5">
                  <span className="text-[10px] font-bold tracking-wider">{flight.date}</span>
                  <i className="fa-solid fa-plane text-[8px] -rotate-45"></i>
                </div>
                {isEditMode && (
                  <div className="flex gap-3">
                    <button onClick={(e) => { e.stopPropagation(); setEditingBooking(flight); setShowAddModal(true); }} className="hover:text-paper transition-colors opacity-60"><i className="fa-solid fa-pen text-xs"></i></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteBooking(flight.id); }} className="hover:text-stamp transition-colors opacity-60"><i className="fa-solid fa-trash-can text-xs"></i></button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-10 py-4 relative">
            <div className="absolute left-[-12px] top-[-12px] w-6 h-6 rounded-full bg-cream shadow-inner border border-black/5"></div>
            <div className="absolute right-[-12px] top-[-12px] w-6 h-6 rounded-full bg-cream shadow-inner border border-black/5"></div>
            <div className="flex justify-between items-center">
              <div className="text-left min-w-[80px]">
                <div className="text-3xl font-bold text-ink tracking-tighter leading-none">{flight.details.from || '---'}</div>
                <div className="text-base font-bold text-ink/70 mt-1">{flight.details.depTime || '--:--'}</div>
                <div className="text-[8px] text-ink/40 font-bold uppercase tracking-[0.15em] mt-2">DEPARTURE</div>
              </div>
              <div className="flex-grow flex flex-col items-center justify-center px-6 pt-1">
                <div className="text-[9px] text-ink/20 font-bold mb-2 tracking-widest uppercase">FLIGHT</div>
                <div className="w-full border-t border-dashed border-slate/20 relative flex items-center justify-center">
                  <i className="fa-solid fa-plane text-paper/60 text-base bg-white px-2 -rotate-45 absolute top-[-9px]"></i>
                  {flight.details.voucherUrl && (
                    <a 
                      href={flight.details.voucherUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      onClick={(e) => e.stopPropagation()} 
                      className="absolute top-[12px] text-harbor/60 hover:text-harbor transition-colors"
                      title="查看憑證"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    </a>
                  )}
                </div>
              </div>
              <div className="text-right min-w-[80px]">
                <div className="text-3xl font-bold text-ink tracking-tighter leading-none">{flight.details.to || '---'}</div>
                <div className="text-base font-bold text-ink/70 mt-1">{flight.details.arrTime || '--:--'}</div>
                <div className="text-[8px] text-ink/40 font-bold uppercase tracking-[0.15em] mt-2">ARRIVAL</div>
              </div>
            </div>
            <div className="w-full h-px bg-slate/5 my-3"></div>
            <div className="flex justify-between items-center px-1 pb-1">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-ink/30 uppercase tracking-widest block">TERMINAL</span>
                <span className="text-sm font-bold text-ink/60">{flight.details.terminal || '--'}</span>
              </div>
              <div className="text-right flex flex-col items-center">
                <span className="text-[8px] font-bold text-ink/30 uppercase tracking-widest block">CLASS</span>
                <span className="text-sm font-bold text-ink/60">{flight.details.cabinClass || '--'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWalletTicket = (ticket: Booking, idx: number) => {
    const isExpanded = expandedTicketId === ticket.id;
    const isAnyExpanded = expandedTicketId !== null;
    
    const headerExposure = 110; 
    let translateY = idx * headerExposure; 
    let opacity = 1;

    if (isAnyExpanded) {
      if (isExpanded) {
        translateY = 0;
      } else {
        translateY = 1000;
        opacity = 0;
      }
    }

    return (
      <div 
        key={ticket.id}
        onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
        className="absolute w-full left-0 right-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
        style={{ 
          transform: `translateY(${translateY}px)`,
          zIndex: isExpanded ? 50 : 10 + idx,
          opacity: opacity,
        }}
      >
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-black/5 transition-all duration-500 relative flex flex-col">
          <div className="flex items-stretch min-h-[150px]">
            {/* 左側 Sidebar - 配合扁平化高度 */}
            <div className="w-[85px] bg-harbor flex flex-col items-center justify-center py-6 gap-3 relative border-r border-dashed border-white/30">
              <i className="fa-solid fa-train text-white text-2xl"></i>
              <div className="flex-grow flex items-center justify-center">
                <div className="[writing-mode:vertical-lr] rotate-180 text-white font-bold text-[8px] tracking-[0.3em] opacity-80 uppercase leading-none">
                  TRANSIT TICKET
                </div>
              </div>
            </div>

            {/* 右側內容 - 扁平化 padding 調整 */}
            <div className="flex-grow p-5 flex flex-col justify-between">
              {/* 頂部：標題與動作 */}
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-[#577C8E] tracking-tight leading-none pt-1">{ticket.title}</h3>
                {isEditMode && (
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingBooking(ticket); setShowAddModal(true); }}
                      className="w-7 h-7 rounded-full bg-slate/10 text-slate flex items-center justify-center hover:bg-slate/20 transition-all"
                    >
                      <i className="fa-solid fa-pen text-[9px]"></i>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteBooking(ticket.id); }}
                      className="w-7 h-7 rounded-full bg-stamp/10 text-stamp flex items-center justify-center hover:bg-stamp/20 transition-all"
                    >
                      <i className="fa-solid fa-trash-can text-[9px]"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* 中間：路徑與時間 */}
              <div className="mt-2 flex flex-col">
                <div className="flex justify-between items-end mb-0.5 px-1">
                  <div className="flex flex-col">
                    <span className="text-[6px] font-bold text-earth-dark uppercase tracking-widest opacity-60 mb-0.5">DEPARTURE</span>
                    <span className="text-sm font-bold text-harbor leading-none">{ticket.details.from || '---'}</span>
                  </div>
                  <div className="flex flex-col text-right items-end">
                    <span className="text-[6px] font-bold text-earth-dark uppercase tracking-widest opacity-60 mb-0.5">ARRIVAL</span>
                    <span className="text-sm font-bold text-harbor leading-none">{ticket.details.to || '---'}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                   <div className="text-xl font-bold text-ink">{ticket.details.depTime || '--:--'}</div>
                   
                   <div className="flex-grow mx-3 flex flex-col items-center justify-center">
                      <div className="w-full flex items-center gap-1">
                         <div className="flex-grow h-px border-t border-dashed border-slate/30"></div>
                         <i className="fa-solid fa-chevron-right text-slate/30 text-[7px]"></i>
                         <div className="flex-grow h-px border-t border-dashed border-slate/30"></div>
                      </div>
                   </div>

                   <div className="text-xl font-bold text-ink">{ticket.details.arrTime || '--:--'}</div>
                </div>
              </div>

              {/* 底部：日期與座位 */}
              <div className="pt-2 border-t border-black/5 flex justify-between items-center mt-2 px-0.5">
                <span className="text-[10px] font-bold text-earth-dark">{ticket.date}</span>
                <span className="text-[8px] font-bold text-earth-dark uppercase tracking-widest">
                  SEAT: {ticket.details.seat || '--'}
                </span>
              </div>
            </div>
          </div>

          {/* 展開區塊 (乘車備註) */}
          <div className={`overflow-hidden transition-all duration-500 bg-white ${isExpanded ? 'max-h-[300px] border-t border-black/5' : 'max-h-0'}`}>
            <div className="p-6">
              <div className="bg-cream/10 p-5 rounded-3xl border border-paper/10">
                <span className="text-[8px] font-bold text-earth-dark uppercase tracking-widest block mb-2 opacity-60">乘車備註</span>
                <p className="text-sm text-ink/70 font-bold leading-relaxed">
                  {ticket.details.info || '尚未輸入詳細乘車資訊'}
                </p>
                
                <div className="mt-4">
                  {ticket.details.voucherUrl && (
                    <div className="pt-3">
                      <a 
                        href={ticket.details.voucherUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[9px] font-bold text-harbor border border-harbor/20 px-4 py-2 rounded-full hover:bg-harbor hover:text-white transition-all inline-flex items-center gap-2 shadow-sm"
                      >
                        <i className="fa-solid fa-file-invoice"></i>
                        查看車票憑證
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGenericCard = (booking: Booking) => {
    const typeLabel = booking.type === 'hotel' ? 'HOTEL' : 'ACTIVITY';
    const dateLabel = booking.type === 'hotel' ? 'CHECK-IN' : 'DATE';

    return (
      <div key={booking.id} className="bg-white rounded-[2rem] overflow-hidden shadow-lg mb-6 border border-paper/20 animate-in fade-in slide-in-from-bottom-2 flex flex-col">
        <div className="h-36 relative overflow-hidden group">
          <img 
            src={booking.details.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800"} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={booking.title} 
          />
          <div className="absolute top-4 left-4 bg-ink/80 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] text-white shadow-lg border border-white/10">
            {typeLabel}
          </div>
          {isEditMode && (
            <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={() => { setEditingBooking(booking); setShowAddModal(true); }}
                className="w-8 h-8 rounded-full bg-white/90 text-ink flex items-center justify-center hover:bg-white transition-all shadow-md"
              >
                <i className="fa-solid fa-pen text-[10px]"></i>
              </button>
              <button 
                onClick={() => deleteBooking(booking.id)}
                className="w-8 h-8 rounded-full bg-stamp/90 text-white flex items-center justify-center hover:bg-stamp transition-all shadow-md"
              >
                <i className="fa-solid fa-trash-can text-[10px]"></i>
              </button>
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-grow">
              <h3 className="text-xl font-bold text-ink tracking-tight mb-1 line-clamp-1">{booking.title}</h3>
              {booking.details.address && (
                <div 
                  onClick={() => openGoogleMaps(booking.details.address!)}
                  className="flex items-center gap-1.5 text-ink/50 text-[11px] font-bold cursor-pointer hover:text-harbor transition-colors"
                >
                  <i className="fa-solid fa-location-dot text-[9px]"></i>
                  <span className="truncate border-b border-transparent hover:border-harbor/30">{booking.details.address}</span>
                </div>
              )}
            </div>
            {booking.details.voucherUrl && (
              <a 
                href={booking.details.voucherUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex-shrink-0 text-[10px] font-bold text-ink border border-ink/20 px-3 py-1.5 rounded-full hover:bg-ink hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
              >
                查看憑證
                <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
              </a>
            )}
          </div>

          <div className="flex items-center justify-between bg-cream/30 p-3 rounded-2xl border border-paper/10">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-earth-dark uppercase tracking-widest opacity-60 mb-0.5">{dateLabel}</span>
              <span className="text-sm font-bold text-ink">{booking.date}</span>
            </div>
            {booking.type === 'activity' && booking.details.time && (
              <div className="flex flex-col text-right">
                <span className="text-[8px] font-bold text-earth-dark uppercase tracking-widest opacity-60 mb-0.5">TIME</span>
                <span className="text-sm font-bold text-ink">{booking.details.time}</span>
              </div>
            )}
            {booking.type === 'hotel' && booking.details.checkIn && (
              <div className="flex flex-col text-right">
                <span className="text-[8px] font-bold text-earth-dark uppercase tracking-widest opacity-60 mb-0.5">CHECK-IN</span>
                <span className="text-sm font-bold text-ink">{booking.details.checkIn}</span>
              </div>
            )}
          </div>

          {booking.details.info && (
            <div className="px-1">
              <p className="text-[11px] text-ink/60 font-medium leading-relaxed line-clamp-2 italic">
                {booking.details.info}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-36 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      <div className="pt-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">行程預訂</h1>
          <p className="text-earth-dark mt-1 font-bold italic">集結所有旅遊憑證與驚喜</p>
        </div>
        {isEditMode && (
          <button 
            onClick={() => {
              setEditingBooking({ details: {}, date: new Date().toISOString().split('T')[0] });
              setShowAddModal(true);
            }}
            className="w-14 h-14 bg-stamp text-white rounded-[1.75rem] shadow-xl flex items-center justify-center text-2xl active:scale-90 transition-all border-4 border-white"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
        {(['flight', 'hotel', 'activity', 'ticket'] as BookingType[]).map(id => (
          <button 
            key={id}
            onClick={() => { setActiveTab(id); setExpandedFlightId(null); setExpandedTicketId(null); }}
            className={`px-7 py-3 rounded-full whitespace-nowrap text-[11px] font-bold transition-all uppercase tracking-widest ${activeTab === id ? 'bg-harbor text-white shadow-lg' : 'bg-white text-ink border-2 border-slate'}`}
          >
            {id === 'flight' ? '機票' : id === 'hotel' ? '飯店' : id === 'activity' ? '行程' : '交通票'}
          </button>
        ))}
      </div>

      <div className="min-h-[500px] relative">
        {activeTab === 'flight' ? (
          <div className="relative" style={{ height: filteredBookings.length > 0 ? `${Math.max(450, filteredBookings.length * 75 + 200)}px` : '400px' }}>
            {filteredBookings.length > 0 ? (
              filteredBookings.map((flight, idx) => renderWalletFlight(flight, idx))
            ) : (
              <div className="py-24 text-center text-earth-dark/20 border-2 border-dashed border-slate rounded-[2.5rem] bg-white/10">
                <i className="fa-solid fa-plane-departure text-6xl mb-4 opacity-10"></i>
                <p className="text-xs font-bold uppercase tracking-widest">目前尚無航班記錄</p>
              </div>
            )}
          </div>
        ) : activeTab === 'ticket' ? (
          <div className="relative" style={{ height: filteredBookings.length > 0 ? `${Math.max(450, filteredBookings.length * 110 + 350)}px` : '400px' }}>
             {filteredBookings.length > 0 ? (
                filteredBookings.map((ticket, idx) => renderWalletTicket(ticket, idx))
             ) : (
                <div className="py-24 text-center text-earth-dark/20 border-2 border-dashed border-slate rounded-[2.5rem] bg-white/10">
                  <i className="fa-solid fa-train text-6xl mb-4 opacity-10"></i>
                  <p className="text-xs font-bold uppercase tracking-widest">目前尚無交通票記錄</p>
                </div>
             )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.length > 0 ? (
              filteredBookings.map(renderGenericCard)
            ) : (
              <div className="py-24 text-center text-earth-dark/20 border-2 border-dashed border-slate rounded-[2.5rem] bg-white/10">
                <i className="fa-solid fa-box-open text-6xl mb-4 opacity-10"></i>
                <p className="text-xs font-bold uppercase tracking-widest">目前尚無預訂記錄</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={`新增${activeTab === 'flight' ? '機票' : activeTab === 'hotel' ? '飯店' : activeTab === 'activity' ? '行程' : '交通票'}`}>
        {editingBooking && (
          <div className="space-y-3 pb-6">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">
                {activeTab === 'flight' ? '航空公司/航班' : activeTab === 'hotel' ? '飯店名稱' : activeTab === 'activity' ? '活動/景點名稱' : '交通名稱'}
              </label>
              <input 
                type="text" 
                value={editingBooking.title || ''}
                onChange={(e) => setEditingBooking({ ...editingBooking, title: e.target.value })}
                className="w-full h-[56px] p-4 bg-white border-2 border-slate rounded-2xl font-bold text-ink outline-none shadow-sm"
                placeholder="輸入名稱 (如：新幹線、特急號)..."
              />
            </div>

            {activeTab === 'ticket' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">日期</label>
                  <input 
                    type="date" 
                    value={editingBooking.date || ''}
                    onChange={(e) => setEditingBooking({ ...editingBooking, date: e.target.value })}
                    className="w-full h-[48px] p-4 bg-white border-2 border-slate rounded-2xl font-bold text-ink"
                  />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">出發時間</label>
                    <input 
                      type="time" 
                      value={editingBooking.details?.depTime || ''} 
                      onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, depTime: e.target.value}})} 
                      className="w-full h-[48px] p-4 bg-white border-2 border-slate rounded-2xl font-bold text-ink" 
                    />
                </div>
              </div>
            ) : activeTab === 'activity' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">日期</label>
                  <input 
                    type="date" 
                    value={editingBooking.date || ''}
                    onChange={(e) => setEditingBooking({ ...editingBooking, date: e.target.value })}
                    className="w-full h-[56px] p-4 bg-white border-2 border-slate rounded-2xl font-bold text-ink"
                  />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">行程時間</label>
                    <input 
                      type="time" 
                      value={editingBooking.details?.time || ''} 
                      onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, time: e.target.value}})} 
                      className="w-full h-[56px] p-4 bg-white border-2 border-slate rounded-2xl font-bold text-ink" 
                    />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">日期</label>
                <input 
                  type="date" 
                  value={editingBooking.date || ''}
                  onChange={(e) => setEditingBooking({ ...editingBooking, date: e.target.value })}
                  className="w-full h-[56px] p-4 bg-white border-2 border-slate rounded-2xl font-bold text-ink"
                />
              </div>
            )}

            {activeTab === 'flight' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">出發地</label>
                   <input placeholder="TPE" value={editingBooking.details?.from || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, from: e.target.value.toUpperCase()}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">目的地</label>
                   <input placeholder="NRT" value={editingBooking.details?.to || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, to: e.target.value.toUpperCase()}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">起飛</label>
                   <input type="time" value={editingBooking.details?.depTime || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, depTime: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">抵達</label>
                   <input type="time" value={editingBooking.details?.arrTime || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, arrTime: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">航班號</label>
                   <input placeholder="JL802" value={editingBooking.details?.flightNo || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, flightNo: e.target.value.toUpperCase()}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">艙等</label>
                   <input placeholder="經濟" value={editingBooking.details?.cabinClass || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, cabinClass: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">憑證連結 (網址 / PDF)</label>
                  <input placeholder="https://..." value={editingBooking.details?.voucherUrl || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, voucherUrl: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
              </div>
            )}

            {activeTab === 'hotel' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">入住時間</label>
                    <input type="time" value={editingBooking.details?.checkIn || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, checkIn: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">退房時間</label>
                    <input type="time" value={editingBooking.details?.checkOut || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, checkOut: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">飯店地址 (Google Map)</label>
                  <input placeholder="輸入地址..." value={editingBooking.details?.address || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, address: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">憑證連結 (網址)</label>
                  <input placeholder="https://..." value={editingBooking.details?.voucherUrl || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, voucherUrl: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">飯店資訊 / 備註</label>
                  <textarea placeholder="房型、聯絡電話等..." value={editingBooking.details?.info || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, info: e.target.value}})} className="w-full p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm min-h-[80px]" />
                </div>
              </>
            )}

            {activeTab === 'activity' && (
              <>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">集合/活動地點 (Google Map)</label>
                  <input placeholder="輸入集合地點..." value={editingBooking.details?.address || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, address: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">憑證連結 (網址)</label>
                  <input placeholder="https://..." value={editingBooking.details?.voucherUrl || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, voucherUrl: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">行程細節 / 備註</label>
                  <textarea placeholder="詳細行程資訊..." value={editingBooking.details?.info || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, info: e.target.value}})} className="w-full p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm min-h-[80px]" />
                </div>
              </>
            )}

            {activeTab === 'ticket' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">出發站</label>
                    <input placeholder="如：東京" value={editingBooking.details?.from || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, from: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">抵達站</label>
                    <input placeholder="如：京都" value={editingBooking.details?.to || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, to: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">抵達時間</label>
                    <input type="time" value={editingBooking.details?.arrTime || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, arrTime: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">車次 / 座位</label>
                    <input placeholder="如：2車12A" value={editingBooking.details?.seat || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, seat: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">憑證連結 (網址)</label>
                  <input placeholder="https://..." value={editingBooking.details?.voucherUrl || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, voucherUrl: e.target.value}})} className="w-full h-[48px] p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-earth-dark uppercase pl-1">乘車備註 / 詳細資訊</label>
                  <textarea placeholder="轉乘資訊、乘車提醒等..." value={editingBooking.details?.info || ''} onChange={(e) => setEditingBooking({...editingBooking, details: {...editingBooking.details, info: e.target.value}})} className="w-full p-3 bg-white border-2 border-slate rounded-2xl font-bold text-ink text-sm min-h-[80px]" />
                </div>
              </>
            )}

            {(activeTab === 'hotel' || activeTab === 'activity') && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-earth-dark uppercase tracking-widest pl-1">照片上傳</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 bg-white border-2 border-dashed border-slate rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate/10 transition-all overflow-hidden shadow-inner"
                >
                  {editingBooking.details?.image ? (
                    <img src={editingBooking.details.image} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <i className="fa-solid fa-camera text-xl text-slate mb-1"></i>
                      <span className="text-[8px] font-bold text-slate uppercase tracking-widest">點擊上傳</span>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              </div>
            )}

            <NordicButton onClick={handleSave} className="w-full py-4 bg-harbor text-white font-bold mt-2 shadow-xl border-none tracking-widest uppercase text-xs">
              儲存預訂資訊
            </NordicButton>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BookingsView;
