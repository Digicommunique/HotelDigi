
import React, { useState, useMemo, useEffect } from 'react';
import { Room, RoomStatus, Guest, Booking, HostelSettings, Transaction, GroupProfile, UserRole, Supervisor, Quotation, BanquetHall } from './types.ts';
import { INITIAL_ROOMS, STATUS_COLORS } from './constants.tsx';
import { db, exportDatabase } from './services/db.ts';
import { pullFromCloud } from './services/supabase.ts';
import GuestCheckin from './components/GuestCheckin.tsx';
import StayManagement from './components/StayManagement.tsx';
import Reports from './components/Reports.tsx';
import Accounting from './components/Accounting.tsx';
import Settings from './components/Settings.tsx';
import RoomActionModal from './components/RoomActionModal.tsx';
import GroupModule from './components/GroupModule.tsx';
import Login from './components/Login.tsx';
import ReservationEntry from './components/ReservationEntry.tsx';
import ReservationPipeline from './components/ReservationPipeline.tsx';
import GlobalBillArchive from './components/GlobalBillArchive.tsx';
import GuestPortal from './components/GuestPortal.tsx';

// --- MODULES ---
import BanquetModule from './components/BanquetModule.tsx';
import DiningModule from './components/DiningModule.tsx';
import FacilityModule from './components/FacilityModule.tsx';
import InventoryModule from './components/InventoryModule.tsx';
import TravelModule from './components/TravelModule.tsx';

const GUEST_THEMES = [
  { border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-900', status: 'text-rose-600 border-rose-600', name: 'text-rose-600' },
  { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-900', status: 'text-emerald-600 border-emerald-600', name: 'text-emerald-600' },
  { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-900', status: 'text-amber-600 border-amber-600', name: 'text-amber-600' },
  { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-900', status: 'text-indigo-600 border-indigo-600', name: 'text-indigo-600' },
  { border: 'border-blue-600', bg: 'bg-blue-50', text: 'text-blue-900', status: 'text-blue-600 border-blue-600', name: 'text-blue-600' },
];

const getGuestTheme = (name: string) => {
  let hash = 0;
  const safeName = name || 'Guest';
  for (let i = 0; i < safeName.length; i++) hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  return GUEST_THEMES[Math.abs(hash) % GUEST_THEMES.length];
};

type AppTab = 'DASHBOARD' | 'BANQUET' | 'DINING' | 'FACILITY' | 'TRAVEL' | 'GROUP' | 'INVENTORY' | 'ACCOUNTING' | 'REPORTS' | 'SETTINGS' | 'GUEST_PORTAL';
type BlockType = 'ALL' | 'AYODHYA' | 'MITHILA';

const App: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<GroupProfile[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [blockFilter, setBlockFilter] = useState<BlockType>('ALL');
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  
  const [settings, setSettings] = useState<HostelSettings>({
    name: 'Hotel Sphere Pro',
    address: 'Powered by Digital Communique',
    agents: [{ name: 'Direct', commission: 0 }],
    roomTypes: ['DELUXE ROOM', 'BUDGET ROOM', 'STANDARD ROOM', 'AC FAMILY ROOM'],
    taxRate: 12,
    wifiPassword: 'hotelsphere123',
    receptionPhone: '9',
    roomServicePhone: '8',
    blocks: ['AYODHYA', 'MITHILA']
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuestPortal, setIsGuestPortal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('RECEPTIONIST');
  const [activeTab, setActiveTab] = useState<AppTab>('DASHBOARD');
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showReservationPipeline, setShowReservationPipeline] = useState(false);
  const [showRoomActions, setShowRoomActions] = useState(false);
  const [showGlobalArchive, setShowGlobalArchive] = useState(false);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());

  const fetchCloudData = async () => {
    setIsCloudSyncing(true);
    const tables = [
      'rooms', 'guests', 'bookings', 'transactions', 'groups', 'supervisors', 'settings', 
      'banquetHalls', 'eventBookings', 'cateringMenu', 'restaurants', 'menuItems', 
      'diningTables', 'diningBills', 'inventory', 'vendors', 'facilityUsage', 
      'travelBookings', 'stockReceipts', 'shiftLogs', 'cleaningLogs', 'quotations'
    ];
    
    for (const table of tables) {
      try {
        const cloudData = await pullFromCloud(table);
        if (cloudData && cloudData.length > 0) {
          const validData = cloudData.filter((item: any) => item.id);
          if (validData.length > 0) {
            await (db as any)[table].bulkPut(validData);
          }
        }
      } catch (err) {
        console.warn(`Sync failed for ${table}:`, err);
      }
    }
    
    // Refresh local states
    setRooms(await db.rooms.toArray());
    setGuests(await db.guests.toArray());
    setBookings(await db.bookings.toArray());
    setTransactions(await db.transactions.toArray());
    setGroups(await db.groups.toArray());
    setSupervisors(await db.supervisors.toArray());
    setQuotations(await db.quotations.toArray());
    
    const s = await db.settings.get('primary');
    if (s) setSettings(s);
    
    setIsCloudSyncing(false);
    alert("Multi-device synchronization complete!");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') === 'guest') {
       setIsGuestPortal(true);
    }

    const init = async () => {
      try {
        let r = await db.rooms.toArray();
        // If local is empty, try a full cloud pull
        if (r.length === 0) {
          await fetchCloudData();
          r = await db.rooms.toArray();
        }

        // If still empty (fresh install with no cloud data), populate defaults
        if (r.length === 0) {
          await db.rooms.bulkPut(INITIAL_ROOMS);
          r = INITIAL_ROOMS;
          const banquets: BanquetHall[] = [
            { id: 'raghunandan', name: 'Raghunandan Banquet', capacity: 2000, basePrice: 150000, type: 'HALL' },
            { id: 'diya', name: 'Diya The Banquet', capacity: 500, basePrice: 45000, type: 'HALL' }
          ];
          await db.banquetHalls.bulkPut(banquets);
        }

        setRooms(r);
        setGuests(await db.guests.toArray());
        setBookings(await db.bookings.toArray());
        setTransactions(await db.transactions.toArray());
        setGroups(await db.groups.toArray());
        setSupervisors(await db.supervisors.toArray());
        setQuotations(await db.quotations.toArray());
        
        const s = await db.settings.get('primary');
        if (s) setSettings(s);
        else await db.settings.put({ ...settings, id: 'primary' });
        
      } catch (e) { 
        console.error("Initialization error:", e);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const handleLogin = (role: UserRole, supervisor?: Supervisor) => {
    setCurrentUserRole(role);
    setIsLoggedIn(true);
    if (role === 'CHEF' || role === 'WAITER') setActiveTab('DINING');
    else if (role === 'ACCOUNTANT') setActiveTab('ACCOUNTING');
    else setActiveTab('DASHBOARD');
  };

  const navItems = useMemo(() => {
    const allItems: { tab: AppTab, label: string }[] = [
      { tab: 'DASHBOARD', label: 'Front Desk' },
      { tab: 'DINING', label: 'Dining POS' },
      { tab: 'BANQUET', label: 'Banquets' },
      { tab: 'FACILITY', label: 'Facilities' },
      { tab: 'TRAVEL', label: 'Transport' },
      { tab: 'GROUP', label: 'Groups' },
      { tab: 'INVENTORY', label: 'Inventory' },
      { tab: 'ACCOUNTING', label: 'Accounts/Billing' },
      { tab: 'REPORTS', label: 'Reports' },
      { tab: 'SETTINGS', label: 'System' },
    ];
    if (currentUserRole === 'CHEF' || currentUserRole === 'WAITER') return allItems.filter(i => i.tab === 'DINING');
    if (currentUserRole === 'ACCOUNTANT') return allItems.filter(i => ['ACCOUNTING', 'REPORTS'].includes(i.tab));
    return allItems;
  }, [currentUserRole]);

  const filteredRooms = useMemo(() => {
    let result = rooms;
    if (blockFilter !== 'ALL') {
      result = result.filter(r => r.block === blockFilter);
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(r => {
        const activeB = bookings.find(b => b.roomId === r.id && b.status === 'ACTIVE');
        const effectiveStatus = activeB ? RoomStatus.OCCUPIED : r.status;
        return effectiveStatus === statusFilter;
      });
    }
    return result;
  }, [rooms, blockFilter, statusFilter, bookings]);

  const roomsByBlockAndFloor = useMemo(() => {
    const structure: Record<string, Record<string, Room[]>> = {};
    filteredRooms.forEach(room => {
      const blockKey = room.block || 'Main';
      const floorKey = room.floor.toString();
      if (!structure[blockKey]) structure[blockKey] = {};
      if (!structure[blockKey][floorKey]) structure[blockKey][floorKey] = [];
      structure[blockKey][floorKey].push(room);
    });
    return structure;
  }, [filteredRooms]);

  const toggleRoomSelection = (roomId: string) => {
    const newSet = new Set(selectedRoomIds);
    if (newSet.has(roomId)) newSet.delete(roomId);
    else newSet.add(roomId);
    setSelectedRoomIds(newSet);
  };

  const handleShiftRoom = async (bookingId: string, oldRoomId: string, newRoomId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const updatedBooking = { ...booking, roomId: newRoomId };
    await db.bookings.put(updatedBooking);
    const updatedRooms = rooms.map(r => {
      if (r.id === oldRoomId) return { ...r, status: RoomStatus.DIRTY, currentBookingId: undefined };
      if (r.id === newRoomId) return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: bookingId };
      return r;
    });
    await db.rooms.bulkPut(updatedRooms.filter(x => x.id));
    setRooms(updatedRooms);
    setBookings(bookings.map(b => b.id === bookingId ? updatedBooking : b));
  };

  const handleReservationCheckIn = async (b: Booking) => {
    const now = new Date();
    const updatedBooking: Booking = { 
      ...b, 
      status: 'ACTIVE', 
      checkInDate: now.toISOString().split('T')[0],
      checkInTime: now.toTimeString().split(' ')[0].substring(0, 5)
    };
    await db.bookings.put(updatedBooking);
    const updatedRooms = rooms.map(r => r.id === b.roomId ? { ...r, status: RoomStatus.OCCUPIED, currentBookingId: b.id } : r);
    await db.rooms.bulkPut(updatedRooms.filter(x => x.id));
    setRooms(updatedRooms);
    setBookings(bookings.map(book => book.id === b.id ? updatedBooking : book));
    setShowReservationPipeline(false);
    setActiveBookingId(b.id);
  };

  const handleCancelReservation = async (id: string) => {
    await db.bookings.delete(id);
    setBookings(bookings.filter(b => b.id !== id));
  };

  const renderContent = () => {
    if (activeBookingId) {
      const b = bookings.find(x => x.id === activeBookingId);
      if (!b) { setActiveBookingId(null); return null; }
      const g = guests.find(x => x.id === b.guestId) || { id: 'unknown', name: 'Unknown Guest', phone: '', documents: {} } as Guest;
      const r = rooms.find(x => x.id === b.roomId);
      if (!r) { setActiveBookingId(null); return null; }
      return <StayManagement booking={b} guest={g} room={r} allRooms={rooms} allBookings={bookings} settings={settings} 
        onUpdate={async (bu) => { 
          await db.bookings.put(bu); 
          setBookings(bookings.map(x => x.id === bu.id ? bu : x)); 
          if (bu.status === 'COMPLETED') {
             const rs = rooms.map(rm => rm.id === bu.roomId ? { ...rm, status: RoomStatus.DIRTY, currentBookingId: undefined } : rm);
             await db.rooms.bulkPut(rs.filter(x => x.id));
             setRooms(rs);
          }
        }} 
        onAddPayment={async (bid, p) => { 
          const bOrig = bookings.find(x => x.id === bid);
          if (bOrig) {
            const bu = { ...bOrig, payments: [...(bOrig.payments || []), p] };
            await db.bookings.put(bu);
            setBookings(bookings.map(x => x.id === bu.id ? bu : x));
          }
        }} 
        onUpdateGuest={async (gu) => { 
          if (gu.id && gu.id !== 'unknown') {
            await db.guests.put(gu); 
            setGuests(guests.map(x => x.id === gu.id ? gu : x)); 
          }
        }}
        onShiftRoom={(newRid) => handleShiftRoom(b.id, r.id, newRid)} 
        onClose={() => setActiveBookingId(null)} />;
    }

    if (showCheckinForm) {
      const initialRoomIds = Array.from(selectedRoomIds);
      const initialRoom = selectedRoom || rooms.find(r => r.id === initialRoomIds[0]) || rooms.find(r => r.status === RoomStatus.VACANT);
      if (!initialRoom) { setShowCheckinForm(false); return null; }
      return <GuestCheckin 
        room={initialRoom} 
        allRooms={rooms} 
        existingGuests={guests} 
        initialSelectedRoomIds={initialRoomIds}
        onClose={() => { setShowCheckinForm(false); setSelectedRoom(null); setSelectedRoomIds(new Set()); setIsSelectionMode(false); }} 
        onSave={async (data) => {
          const gId = data.guest.id || `G-${Date.now()}`;
          await db.guests.put({ ...data.guest, id: gId } as Guest);
          const bks = data.bookings.map(b => ({ ...b, id: `B-${Math.random().toString(36).substr(2, 5)}`, guestId: gId }));
          await db.bookings.bulkPut(bks);
          const updatedRooms = rooms.map(r => {
            const b = bks.find(bk => bk.roomId === r.id);
            return b ? { ...r, status: RoomStatus.OCCUPIED, currentBookingId: b.id } : r;
          });
          await db.rooms.bulkPut(updatedRooms);
          setGuests(await db.guests.toArray());
          setBookings(await db.bookings.toArray());
          setRooms(updatedRooms);
          setShowCheckinForm(false);
          setSelectedRoom(null);
          setSelectedRoomIds(new Set());
          setIsSelectionMode(false);
        }} settings={settings} />;
    }

    switch (activeTab) {
      case 'BANQUET': return <BanquetModule settings={settings} guests={guests} rooms={rooms} roomBookings={bookings} onUpdateBooking={async (bu) => { await db.bookings.put(bu); setBookings(bookings.map(b => b.id === bu.id ? bu : b)); }} />;
      case 'DINING': return <DiningModule rooms={rooms} bookings={bookings} guests={guests} settings={settings} userRole={currentUserRole} onUpdateBooking={async (bu) => { await db.bookings.put(bu); setBookings(bookings.map(b => b.id === bu.id ? bu : b)); }} />;
      case 'FACILITY': return <FacilityModule guests={guests} bookings={bookings} rooms={rooms} settings={settings} onUpdateBooking={async (bu) => { await db.bookings.put(bu); setBookings(bookings.map(b => b.id === bu.id ? bu : b)); }} />;
      case 'TRAVEL': return <TravelModule guests={guests} bookings={bookings} rooms={rooms} settings={settings} onUpdateBooking={async (bu) => { await db.bookings.put(bu); setBookings(bookings.map(b => b.id === bu.id ? bu : b)); }} />;
      case 'GROUP': return <GroupModule groups={groups} setGroups={async (gs) => { setGroups(gs); await db.groups.bulkPut(gs.filter(x => x.id)); }} rooms={rooms} bookings={bookings} setBookings={async (bks) => { setBookings(bks); await db.bookings.bulkPut(bks.filter(x => x.id)); }} guests={guests} setGuests={setGuests} setRooms={async (rs) => { setRooms(rs); await db.rooms.bulkPut(rs.filter(x => x.id)); }} onAddTransaction={(tx) => { setTransactions([...transactions, tx]); db.transactions.put(tx); }} onGroupPayment={() => {}} settings={settings} />;
      case 'INVENTORY': return <InventoryModule settings={settings} />;
      case 'ACCOUNTING': return <Accounting transactions={transactions} setTransactions={async (txs) => { setTransactions(txs); await db.transactions.bulkPut(txs.filter(x => x.id)); }} guests={guests} bookings={bookings} quotations={quotations} setQuotations={async (qs) => { setQuotations(qs); await db.quotations.bulkPut(qs.filter(x => x.id)); }} settings={settings} rooms={rooms} />;
      case 'REPORTS': return <Reports bookings={bookings} guests={guests} rooms={rooms} settings={settings} transactions={transactions} shiftLogs={[]} cleaningLogs={[]} quotations={quotations} />;
      case 'SETTINGS': return <Settings settings={settings} setSettings={async (s)=>{await db.settings.put({...s, id:'primary'}); setSettings(s);}} rooms={rooms} setRooms={async (rs)=>{setRooms(rs); await db.rooms.bulkPut(rs.filter(x => x.id));}} supervisors={supervisors} setSupervisors={async (sups) => { setSupervisors(sups); await db.supervisors.bulkPut(sups.filter(x => x.id)); }} />;
      default:
        return (
          <div className="p-4 md:p-8 pb-40 relative animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white p-8 rounded-[2.5rem] border shadow-xl">
               <div className="flex flex-col gap-1">
                 <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Property Status</h1>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Front Desk Control</p>
               </div>
               <div className="flex flex-col items-center md:items-end gap-4">
                  <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                    <button onClick={() => setBlockFilter('ALL')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${blockFilter === 'ALL' ? 'bg-blue-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>All Blocks</button>
                    <button onClick={() => setBlockFilter('MITHILA')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${blockFilter === 'MITHILA' ? 'bg-blue-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Mithila</button>
                    <button onClick={() => setBlockFilter('AYODHYA')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${blockFilter === 'AYODHYA' ? 'bg-blue-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Ayodhya</button>
                  </div>
                  <div className="flex gap-4 flex-wrap justify-center">
                    <button onClick={() => setShowReservationPipeline(true)} className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg hover:bg-black transition-all">Reservation Registry</button>
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedRoomIds(new Set()); }} className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg transition-all border-2 ${isSelectionMode ? 'bg-orange-600 border-orange-600 text-white animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-200'}`}>
                      {isSelectionMode ? 'CANCEL SELECTION' : 'MULTI-CHECKIN'}
                    </button>
                    <button onClick={() => setShowReservationForm(true)} className="bg-blue-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase shadow-2xl hover:bg-black transition-all">+ New Booking</button>
                  </div>
               </div>
            </div>

            {Object.entries(roomsByBlockAndFloor).sort().map(([blockName, floors]) => (
              <div key={blockName} className="mb-16 last:mb-0">
                <div className="flex items-center gap-6 mb-8 border-b-4 border-slate-900 pb-6">
                  <div className="w-16 h-16 bg-blue-900 text-white rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-xl">
                    {blockName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase text-slate-900 tracking-tighter leading-none">{blockName} BLOCK</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Section Overview</p>
                  </div>
                </div>

                {Object.entries(floors).sort().map(([floor, floorRooms]) => (
                  <div key={floor} className="mb-12 last:mb-0">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest border-b-2 border-slate-100 pb-2 flex items-center gap-4">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      Level {floor === '0' ? 'Ground' : floor === '1' ? 'First' : floor === '2' ? 'Second' : floor === '3' ? 'Third' : floor} Inventory
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
                      {floorRooms.map(room => {
                        const today = new Date().toISOString().split('T')[0];
                        const activeB = bookings.find(b => b.roomId === room.id && b.status === 'ACTIVE');
                        const reservedToday = bookings.find(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate === today);
                        const guestObj = (activeB || reservedToday) ? guests.find(g => g.id === (activeB || reservedToday)!.guestId) : null;
                        const effectiveStatus = activeB ? RoomStatus.OCCUPIED : reservedToday ? RoomStatus.RESERVED : room.status;
                        const theme = guestObj ? getGuestTheme(guestObj.name) : null;
                        const isSelected = selectedRoomIds.has(room.id);

                        return (
                          <button 
                            key={room.id} 
                            onClick={() => {
                              if (isSelectionMode) {
                                if (effectiveStatus === RoomStatus.VACANT || effectiveStatus === RoomStatus.DIRTY) toggleRoomSelection(room.id);
                                else alert("Only vacant or laundry units can be selected for check-in.");
                              } else {
                                if (activeB || reservedToday) setActiveBookingId((activeB || reservedToday)!.id);
                                else { setSelectedRoom(room); setShowRoomActions(true); }
                              }
                            }} 
                            className={`min-h-[160px] border-2 rounded-[2.5rem] p-6 flex flex-col items-center justify-between transition-all shadow-md relative ${isSelected ? 'border-blue-600 ring-8 ring-blue-100 scale-105 z-10 bg-blue-50' : theme ? `${theme.bg} ${theme.border} ${theme.text}` : STATUS_COLORS[effectiveStatus]} hover:shadow-2xl hover:scale-[1.02]`}
                          >
                            {isSelected && <div className="absolute top-2 right-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-lg animate-in zoom-in">✓</div>}
                            <span className="text-3xl font-black tracking-tighter uppercase leading-none">{room.number}</span>
                            <div className="text-center w-full">
                               <div className={`text-[10px] font-black uppercase mb-1 opacity-80 truncate ${theme ? theme.status.split(' ')[0] : ''}`}>
                                 {guestObj ? guestObj.name : room.type}
                               </div>
                               <div className={`text-[9px] font-bold uppercase py-1.5 px-5 rounded-full border-2 border-current inline-block ${theme ? theme.status : ''}`}>{effectiveStatus}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            
            {isSelectionMode && selectedRoomIds.size > 0 && (
              <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10">
                <button 
                  onClick={() => setShowCheckinForm(true)}
                  className="bg-emerald-600 text-white px-12 py-6 rounded-full font-black uppercase text-sm shadow-[0_20px_50px_rgba(5,150,105,0.4)] flex items-center gap-4 hover:scale-110 active:scale-95 transition-all"
                >
                  <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">{selectedRoomIds.size}</span>
                  Check-in Selected Rooms
                </button>
              </div>
            )}
          </div>
        );
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#001a33] flex flex-col items-center justify-center text-white gap-4">
    <div className="w-16 h-16 bg-blue-700 rounded-3xl animate-bounce flex items-center justify-center text-2xl font-black shadow-[0_0_50px_rgba(29,78,216,0.5)]">HS</div>
    <p className="font-black uppercase tracking-[0.5em] text-xs opacity-50">Initializing Core...</p>
  </div>;

  if (isGuestPortal) return <GuestPortal settings={settings} allRooms={rooms} onCheckinComplete={() => {
    db.rooms.toArray().then(setRooms);
    db.bookings.toArray().then(setBookings);
    db.guests.toArray().then(setGuests);
  }} />;

  if (!isLoggedIn) return <Login onLogin={handleLogin} settings={settings} supervisors={supervisors} />;

  const blockRooms = blockFilter === 'ALL' ? rooms : rooms.filter(r => r.block === blockFilter);
  const vacantCount = blockRooms.filter(r => r.status === RoomStatus.VACANT && !bookings.some(b => b.roomId === r.id && b.status === 'ACTIVE')).length;
  const occupiedCount = blockRooms.filter(r => bookings.some(b => b.roomId === r.id && b.status === 'ACTIVE')).length;
  const laundryCount = blockRooms.filter(r => r.status === RoomStatus.DIRTY).length;
  const repairCount = blockRooms.filter(r => r.status === RoomStatus.REPAIR).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#001a33] transition-all duration-500">
      <nav className="bg-[#001a33] text-white px-8 py-5 flex items-center justify-between shadow-2xl sticky top-0 z-50 no-print border-b border-white/10 shrink-0">
        <div className="flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setActiveTab('DASHBOARD')}>
            <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">HS</div>
            <div className="hidden lg:block">
              <span className="text-2xl font-black tracking-tighter uppercase block leading-none">Hotel Sphere Pro</span>
              <span className="text-[8px] font-black uppercase text-blue-400 tracking-[0.4em]">Enterprise Edition</span>
            </div>
          </div>
          <div className="flex gap-2">
            {navItems.map(item => (
              <NavBtn key={item.tab} label={item.label} active={activeTab === item.tab} onClick={() => setActiveTab(item.tab)} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
              <div className={`w-2 h-2 rounded-full ${isCloudSyncing ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-[9px] font-black uppercase text-white/50">{isCloudSyncing ? 'Syncing...' : 'Cloud Ready'}</span>
           </div>
           <button onClick={() => window.open(window.location.origin + '?portal=guest', '_blank')} className="text-[10px] font-black uppercase bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl">Guest Link</button>
           <button onClick={() => setIsLoggedIn(false)} className="text-[10px] font-black uppercase bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl">EXIT</button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto custom-scrollbar no-print bg-[#f8f9fa]">{renderContent()}</main>

      <footer className="bg-white border-t px-8 py-5 flex flex-col md:flex-row justify-between items-center z-40 shadow-2xl no-print shrink-0">
        <div className="flex gap-6 md:gap-8 items-center flex-wrap">
          <Stat label={`${blockFilter} Total`} count={blockRooms.length} color="text-slate-400" onClick={() => setStatusFilter('ALL')} active={statusFilter === 'ALL'} />
          <Stat label="Vacant" count={vacantCount} color="text-emerald-600" onClick={() => setStatusFilter(RoomStatus.VACANT)} active={statusFilter === RoomStatus.VACANT} />
          <Stat label="Occupied" count={occupiedCount} color="text-blue-700" onClick={() => setStatusFilter(RoomStatus.OCCUPIED)} active={statusFilter === RoomStatus.OCCUPIED} />
          <Stat label="Laundry" count={laundryCount} color="text-rose-600" onClick={() => setStatusFilter(RoomStatus.DIRTY)} active={statusFilter === RoomStatus.DIRTY} />
          <Stat label="Repair" count={repairCount} color="text-amber-800" onClick={() => setStatusFilter(RoomStatus.REPAIR)} active={statusFilter === RoomStatus.REPAIR} />
          <div className="h-8 w-px bg-slate-100 hidden md:block mx-2"></div>
          <FooterBtn label="Bill Archive" onClick={() => setShowGlobalArchive(true)} icon="📄" />
          <FooterBtn label="Cloud Pull" onClick={fetchCloudData} icon="🔄" />
          <FooterBtn label="Backup" onClick={exportDatabase} icon="☁️" />
        </div>
      </footer>

      {showRoomActions && selectedRoom && (
        <RoomActionModal room={selectedRoom} onClose={() => setShowRoomActions(false)} onCheckIn={() => { setShowRoomActions(false); setShowCheckinForm(true); }} 
          onStatusUpdate={async (s) => {
            const rs = rooms.map(r => r.id === selectedRoom.id ? { ...r, status: s } : r);
            await db.rooms.put({ ...selectedRoom, status: s });
            setRooms(rs);
            setShowRoomActions(false);
          }} />
      )}
      {showReservationForm && (
        <ReservationEntry 
          onClose={() => setShowReservationForm(false)} 
          existingGuests={guests} 
          rooms={rooms.filter(r => r.status === RoomStatus.VACANT)} 
          onSave={async (data) => {
            const gId = data.guest.id || `G-${Date.now()}`;
            await db.guests.put({ ...data.guest, id: gId } as Guest);
            const bks = data.bookings.map(b => ({ ...b, id: `B-${Math.random().toString(36).substr(2, 5)}`, guestId: gId }));
            await db.bookings.bulkPut(bks);
            setBookings([...bookings, ...bks]);
            setShowReservationForm(false);
          }} 
          settings={settings} 
        />
      )}
      {showReservationPipeline && (
        <ReservationPipeline 
          bookings={bookings}
          guests={guests}
          rooms={rooms}
          onClose={() => setShowReservationPipeline(false)}
          onCheckIn={handleReservationCheckIn}
          onCancel={handleCancelReservation}
        />
      )}
      {showGlobalArchive && <GlobalBillArchive onClose={() => setShowGlobalArchive(false)} settings={settings} guests={guests} rooms={rooms} />}
    </div>
  );
};

const NavBtn: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-5 py-2.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shrink-0 ${active ? 'bg-blue-700 text-white shadow-xl' : 'text-white/50 hover:text-white'}`}>{label}</button>
);

const Stat: React.FC<{ label: string, count: number, color: string, onClick: () => void, active: boolean }> = ({ label, count, color, onClick, active }) => (
  <button onClick={onClick} className={`flex items-center gap-3 shrink-0 p-2 rounded-xl transition-all ${active ? 'bg-slate-50 ring-2 ring-slate-100' : 'hover:bg-slate-50'}`}>
    <span className="text-[9px] font-black uppercase text-slate-400 tracking-tight">{label}</span>
    <span className={`text-2xl font-black ${color} tracking-tighter`}>{count}</span>
  </button>
);

const FooterBtn = ({ label, onClick, icon }: any) => (
  <button onClick={onClick} className="flex items-center gap-2.5 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-slate-50 text-slate-600 hover:bg-blue-700 hover:text-white border shadow-sm">
    <span>{icon}</span>{label}
  </button>
);

export default App;
