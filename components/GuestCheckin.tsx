
import React, { useState, useEffect, useMemo } from 'react';
import { Room, Guest, Booking, HostelSettings, Payment, RoomStatus, Occupant } from '../types.ts';
import { INDIAN_STATES } from '../constants.tsx';
import CameraCapture from './CameraCapture.tsx';

interface RoomAssignment {
  roomId: string;
  roomNumber: string;
  tariff: number;
  discount: number;
  type: string;
  mealRate: number;
  occupancy: 'single' | 'double';
}

interface GuestCheckinProps {
  room: Room;
  allRooms: Room[];
  existingGuests: Guest[];
  onClose: () => void;
  onSave: (data: { guest: Partial<Guest>, bookings: any[] }) => void;
  settings: HostelSettings;
  initialSelectedRoomIds?: string[];
}

const GuestCheckin: React.FC<GuestCheckinProps> = ({ 
  room, allRooms, existingGuests, onClose, onSave, settings, initialSelectedRoomIds = []
}) => {
  const [guest, setGuest] = useState<Partial<Guest>>({
    name: '', gender: 'Male', phone: '', email: '', address: '', city: '', state: 'Maharashtra', nationality: 'Indian', idType: 'Aadhar', idNumber: '',
    adults: 1, children: 0, kids: 0, others: 0, documents: {}
  });

  const [isVip, setIsVip] = useState(false);
  const [isGstInclusive, setIsGstInclusive] = useState(false);
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [mealPlan, setMealPlan] = useState('EP (Room Only)');
  const [globalMealRate, setGlobalMealRate] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');

  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  const [roomAssignments, setRoomAssignments] = useState<RoomAssignment[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeDocCapture, setActiveDocCapture] = useState<{ type: string, id?: string, field?: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    setCheckInDate(now.toISOString().split('T')[0]);
    setCheckInTime(now.toTimeString().split(' ')[0].substring(0, 5));
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCheckOutDate(tomorrow.toISOString().split('T')[0]);

    const initialIds = initialSelectedRoomIds.length > 0 ? initialSelectedRoomIds : [room.id];
    const assignments = initialIds.map(id => {
      const r = allRooms.find(x => x.id === id);
      const occupancy = (guest.adults || 1) > 1 ? 'double' : 'single';
      const tariff = settings.roomTypeRates?.[r?.type || '']?.[occupancy] || r?.price || 0;
      return { roomId: id, roomNumber: r?.number || '?', tariff, discount: 0, type: r?.type || '?', mealRate: 0, occupancy: occupancy as any };
    });
    setRoomAssignments(assignments);
  }, [initialSelectedRoomIds, allRooms, settings, room]);

  useEffect(() => {
    setRoomAssignments(prev => prev.map(ra => ({ ...ra, mealRate: globalMealRate })));
  }, [globalMealRate]);

  const handleCameraCapture = (imageData: string) => {
    if (activeDocCapture) {
      applyDocumentUpdate(activeDocCapture, imageData);
    }
    setIsCameraOpen(false);
    setActiveDocCapture(null);
  };

  const calculateStayValue = (ra: RoomAssignment) => {
    const nights = Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 3600 * 24)));
    return ((ra.tariff + ra.mealRate) * nights) - ra.discount;
  };

  const financialTotals = useMemo(() => {
    const nights = Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 3600 * 24)));
    const taxRate = settings.taxRate || 0;
    let subTotal = 0, taxAmount = 0;

    roomAssignments.forEach(ra => {
      const lineTotal = ((ra.tariff + ra.mealRate) * nights) - ra.discount;
      if (isGstInclusive) {
        const base = lineTotal / (1 + (taxRate / 100));
        subTotal += base; taxAmount += (lineTotal - base);
      } else {
        subTotal += lineTotal; taxAmount += (lineTotal * taxRate) / 100;
      }
    });
    return { subTotal, taxAmount, grandTotal: subTotal + taxAmount };
  }, [roomAssignments, checkInDate, checkOutDate, isGstInclusive, settings.taxRate]);

  const handleSearchGuest = () => {
    if (!guest.phone) return;
    const found = existingGuests.find(g => g.phone === guest.phone);
    if (found) {
      setGuest({ ...found });
      alert(`Welcome back, ${found.name}! Details retrieved from history.`);
    } else {
      alert("No previous record found for this mobile number.");
    }
  };

  const applyDocumentUpdate = (target: any, data: string) => {
    if (target.type === 'OCCUPANT' && target.id) {
      setOccupants(prev => prev.map(o => o.id === target.id ? { ...o, [target.field]: data } : o));
    } else {
      setGuest(prev => ({ ...prev, documents: { ...prev.documents, [target.field]: data } }));
    }
  };

  const handleSave = () => {
    if (!guest.name || !guest.phone || roomAssignments.length === 0) return alert("Missing mandatory fields: Name, Phone or Unit Assignment.");
    
    const bookings = roomAssignments.map(ra => ({
      bookingNo: 'BK-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      roomId: ra.roomId, 
      guestId: guest.id, 
      checkInDate, 
      checkInTime, 
      checkOutDate, 
      checkOutTime,
      status: 'ACTIVE', 
      basePrice: ra.tariff, 
      discount: ra.discount, 
      mealPlan, 
      mealRate: ra.mealRate,
      isVip, 
      isGstInclusive, 
      charges: [], 
      payments: advanceAmount > 0 ? [{ id: 'ADV-'+Date.now(), amount: advanceAmount, date: new Date().toISOString(), method: paymentMode, remarks: 'Advance' }] : [],
      occupants: occupants
    }));
    
    onSave({ guest, bookings });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-2 md:p-4">
      <div className="bg-[#f8fafc] w-full max-w-7xl rounded-[3rem] shadow-2xl flex flex-col h-[94vh] overflow-hidden">
        
        <div className="bg-[#003d80] p-6 md:p-8 text-white flex justify-between items-center no-print">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Authorization Desk</h2>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Resident Registration Protocol</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden no-print">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-12 bg-white">
            
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                 <SectionTitle index="01" title="Primary Resident Information" />
                 <button onClick={handleSearchGuest} className="bg-blue-50 text-blue-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase border-2 border-blue-100 shadow-sm">Fetch History via Mobile</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Inp label="Mobile Number *" value={guest.phone} onChange={(v: string) => setGuest({...guest, phone: v})} />
                <Inp label="Full Name *" value={guest.name} onChange={(v: string) => setGuest({...guest, name: v})} className="md:col-span-2" />
                
                {/* OCCUPANT COUNT GRID - Fixed Visibility */}
                <div className="grid grid-cols-3 gap-2 md:col-span-1">
                  <Inp label="Adult" type="number" value={guest.adults?.toString()} onChange={(v: string) => setGuest({...guest, adults: parseInt(v) || 1})} isCompact />
                  <Inp label="Child" type="number" value={guest.children?.toString()} onChange={(v: string) => setGuest({...guest, children: parseInt(v) || 0})} isCompact />
                  <Inp label="Kid" type="number" value={guest.kids?.toString()} onChange={(v: string) => setGuest({...guest, kids: parseInt(v) || 0})} isCompact />
                </div>

                <Inp label="Nationality" value={guest.nationality} onChange={(v: string) => setGuest({...guest, nationality: v})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</label>
                  <select className="w-full border-2 p-3.5 rounded-2xl font-black text-[12px] bg-slate-50 outline-none" value={guest.gender} onChange={e => setGuest({...guest, gender: e.target.value as any})}>
                    <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Document Type</label>
                  <select className="w-full border-2 p-3.5 rounded-2xl font-black text-[12px] bg-slate-50 outline-none" value={guest.idType} onChange={e => setGuest({...guest, idType: e.target.value as any})}>
                    <option value="Aadhar">Aadhar Card</option><option value="Passport">Passport</option><option value="VoterId">Voter ID</option><option value="Other">Other ID</option>
                  </select>
                </div>
                <Inp label="ID Reference Number" value={guest.idNumber} onChange={(v: string) => setGuest({...guest, idNumber: v})} />
                <Inp label="Email Address" value={guest.email} onChange={(v: string) => setGuest({...guest, email: v})} className="md:col-span-2" />
                <Inp label="Home Address" value={guest.address} onChange={(v: string) => setGuest({...guest, address: v})} className="md:col-span-2" />
                <Inp label="City" value={guest.city} onChange={(v: string) => setGuest({...guest, city: v})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">State</label>
                  <select className="w-full border-2 p-3.5 rounded-2xl font-black text-[12px] bg-slate-50 outline-none" value={guest.state} onChange={e => setGuest({...guest, state: e.target.value})}>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex justify-between items-center">
                 <SectionTitle index="02" title="Group Occupants Registry" />
                 <button onClick={() => setOccupants([...occupants, { id: Math.random().toString(36).substr(2, 9), name: '', gender: 'Male' }])} className="bg-blue-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg">+ Add Occupant</button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {occupants.map((occ, idx) => (
                  <div key={occ.id} className="p-6 bg-slate-50 rounded-[2.5rem] border flex items-center gap-6 relative group">
                     <button onClick={() => setOccupants(occupants.filter(o => o.id !== occ.id))} className="absolute top-4 right-4 text-red-400 font-black text-[10px] hover:text-red-600 transition-all uppercase">Remove</button>
                     <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Inp label={`Occupant ${idx+1} Name`} value={occ.name} onChange={(v:string) => setOccupants(occupants.map(o => o.id === occ.id ? {...o, name: v} : o))} />
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</label>
                          <select className="w-full border-2 p-3.5 rounded-2xl font-black text-[12px] bg-white outline-none" value={occ.gender} onChange={e => setOccupants(occupants.map(o => o.id === occ.id ? {...o, gender: e.target.value as any} : o))}>
                            <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                           <DocBoxMini label="ID Front" src={occ.idFront} onSnap={() => { setActiveDocCapture({type:'OCCUPANT', id: occ.id, field:'idFront'}); setIsCameraOpen(true); }} />
                           <DocBoxMini label="ID Back" src={occ.idBack} onSnap={() => { setActiveDocCapture({type:'OCCUPANT', id: occ.id, field:'idBack'}); setIsCameraOpen(true); }} />
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <SectionTitle index="03" title="KYC Document Vault" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <DocBox label="Identity Front" src={guest.documents?.idFront} onCapture={() => { setActiveDocCapture({type:'PRIMARY', field:'idFront'}); setIsCameraOpen(true); }} />
                 <DocBox label="Identity Back" src={guest.documents?.idBack} onCapture={() => { setActiveDocCapture({type:'PRIMARY', field:'idBack'}); setIsCameraOpen(true); }} />
                 <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[2rem] bg-slate-50 group hover:border-blue-600 transition-all cursor-pointer" onClick={() => { setActiveDocCapture({type:'PRIMARY', field:'photo'}); setIsCameraOpen(true); }}>
                   {guest.documents?.photo ? <img src={guest.documents.photo} className="w-24 h-24 rounded-full object-cover shadow-xl border-4 border-white" /> : <div className="text-[10px] font-black text-slate-300 uppercase">LIVE SNAPSHOT</div>}
                   <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg">Snap Photo</button>
                 </div>
                 <div className="space-y-4">
                    <Inp label="Arriving From" value={guest.arrivalFrom} onChange={(v:string) => setGuest({...guest, arrivalFrom: v})} />
                    <Inp label="Next Destination" value={guest.nextDestination} onChange={(v:string) => setGuest({...guest, nextDestination: v})} />
                 </div>
              </div>
            </section>

            <section className="space-y-6 pb-20">
              <div className="flex justify-between items-end">
                 <SectionTitle index="04" title="Stay Value Authorization" />
                 <div className="flex gap-3">
                    <button onClick={() => setIsGstInclusive(true)} className={`px-5 py-2 rounded-full font-black text-[9px] uppercase border-2 transition-all ${isGstInclusive ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-100'}`}>GST Inclusive</button>
                    <button onClick={() => setIsGstInclusive(false)} className={`px-5 py-2 rounded-full font-black text-[9px] uppercase border-2 transition-all ${!isGstInclusive ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-100'}`}>GST Exclusive</button>
                 </div>
              </div>
              <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white font-black uppercase text-[10px]">
                    <tr><th className="p-5">Unit</th><th className="p-5 text-right">Tariff (₹)</th><th className="p-5 text-right">Meal Rate (₹)</th><th className="p-5 text-right">Discount (₹)</th><th className="p-5 text-right">Stay Value (₹)</th></tr>
                  </thead>
                  <tbody className="divide-y font-bold uppercase text-[12px]">
                    {roomAssignments.map((ra) => (
                      <tr key={ra.roomId} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5 font-black text-blue-900">{ra.roomNumber} <span className="ml-2 text-[9px] font-bold text-slate-400">{ra.type}</span></td>
                        <td className="p-5 w-32"><input type="number" className="w-full bg-slate-50 border-2 p-2 rounded-xl font-black text-right outline-none text-blue-900" value={ra.tariff} onChange={(e) => setRoomAssignments(prev => prev.map(r => r.roomId === ra.roomId ? {...r, tariff: parseFloat(e.target.value) || 0} : r))} /></td>
                        <td className="p-5 w-32"><input type="number" className="w-full bg-slate-50 border-2 p-2 rounded-xl font-black text-right outline-none text-blue-700" value={ra.mealRate} onChange={(e) => setRoomAssignments(prev => prev.map(r => r.roomId === ra.roomId ? {...r, mealRate: parseFloat(e.target.value) || 0} : r))} /></td>
                        <td className="p-5 w-32"><input type="number" className="w-full bg-red-50/50 border-2 border-red-100 p-2 rounded-xl font-black text-right outline-none text-red-600" value={ra.discount} onChange={(e) => setRoomAssignments(prev => prev.map(r => r.roomId === ra.roomId ? {...r, discount: parseFloat(e.target.value) || 0} : r))} /></td>
                        <td className="p-5 text-right font-black text-emerald-700 text-base">₹{calculateStayValue(ra).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="w-full lg:w-[380px] bg-slate-50 border-l p-8 space-y-8 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
            <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-4">Folio Master Summary</h3>
            <div className="space-y-6 flex-1">
              <div className="grid grid-cols-2 gap-4">
                 <Inp label="Exp. Checkout" type="date" value={checkOutDate} onChange={setCheckOutDate} />
                 <Inp label="Checkout Time" type="time" value={checkOutTime} onChange={setCheckOutTime} />
              </div>
              <div className="space-y-4 p-6 bg-white border-2 rounded-[2.5rem] shadow-sm">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Meal Plan</label>
                  <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50 focus:border-blue-600 outline-none" value={mealPlan} onChange={e => setMealPlan(e.target.value)}>
                    <option value="EP (Room Only)">EP (Room Only)</option><option value="CP (Room + B/Fast)">CP (Room + B/Fast)</option><option value="MAP (Room + 2 Meals)">MAP (Room + 2 Meals)</option><option value="AP (Room + All Meals)">AP (Room + All Meals)</option>
                  </select>
                </div>
                <Inp label="Meal Rate (Per Room/Day) ₹" type="number" value={globalMealRate.toString()} onChange={(v: string) => setGlobalMealRate(parseFloat(v) || 0)} />
              </div>
              <div className="p-8 bg-white border-2 rounded-[2.5rem] shadow-sm space-y-4">
                 <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Subtotal</span><span>₹{financialTotals.subTotal.toFixed(2)}</span></div>
                 <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>GST @ {settings.taxRate}% {isGstInclusive ? '(Inc)' : '(Exc)'}</span><span>₹{financialTotals.taxAmount.toFixed(2)}</span></div>
                 <div className="border-t pt-4"><p className="text-[10px] font-black uppercase text-blue-900 mb-1">Grand Folio Total</p><p className="text-4xl font-black text-blue-900 tracking-tighter leading-none">₹{financialTotals.grandTotal.toFixed(2)}</p></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 <Inp label="Advance Settlement (₹)" type="number" value={advanceAmount.toString()} onChange={(v: string) => setAdvanceAmount(parseFloat(v) || 0)} />
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Receipt Mode</label>
                    <select className="w-full border-2 p-3.5 rounded-2xl font-black text-[11px] bg-white outline-none" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                      <option value="Cash">Cash Account</option><option value="UPI">Digital (UPI)</option><option value="Card">Bank Card</option>
                    </select>
                 </div>
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-[#003d80] text-white py-6 rounded-3xl font-black uppercase text-xs shadow-2xl hover:bg-black transition-all">Authorize Entry</button>
          </div>
        </div>
      </div>
      {isCameraOpen && <CameraCapture onCapture={handleCameraCapture} onClose={() => { setIsCameraOpen(false); setActiveDocCapture(null); }} />}
    </div>
  );
};

const SectionTitle = ({ index, title }: { index: string, title: string }) => (
  <div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-900 rounded-2xl flex items-center justify-center text-white font-black text-xs shrink-0">{index}</div><h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">{title}</h3><div className="h-px bg-slate-100 flex-1 ml-2"></div></div>
);

const Inp = ({ label, value, onChange, type = "text", className = "", isCompact = false }: any) => (
  <div className={`space-y-1 w-full text-left ${className}`}>
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input 
      type={type} 
      className={`w-full border-2 ${isCompact ? 'p-2 md:p-3 text-center' : 'p-3 md:p-4'} rounded-2xl font-black text-[14px] bg-slate-50 outline-none focus:border-blue-500 transition-all text-black shadow-inner appearance-none leading-none`} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

const DocBoxMini = ({ label, src, onSnap }: any) => (
   <div className="relative w-16 h-12 bg-white border border-dashed rounded-lg flex items-center justify-center overflow-hidden group cursor-pointer" onClick={onSnap}>{src ? <img src={src} className="w-full h-full object-cover" /> : <span className="text-[6px] font-black text-slate-300 uppercase">{label}</span>}<div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-blue-900/60 flex items-center justify-center transition-opacity"><span className="text-[8px] font-black text-white">SNAP</span></div></div>
);

const DocBox = ({ label, src, onCapture }: any) => (
  <div onClick={onCapture} className="relative aspect-video bg-white border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center group hover:border-blue-600 transition-all shadow-sm cursor-pointer">{src ? <img src={src} className="w-full h-full object-cover" /> : <div className="text-center p-2"><svg className="w-6 h-6 text-slate-200 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg><span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{label}</span></div>}</div>
);

export default GuestCheckin;
