
import React, { useState, useMemo } from 'react';
import { Booking, Guest, Room, Charge, Payment, RoomStatus, Transaction } from '../types.ts';
import InvoiceView from './InvoiceView.tsx';
import GRCFormView from './GRCFormView.tsx';

interface StayManagementProps {
  booking: Booking;
  guest: Guest;
  room: Room;
  allRooms: Room[];
  allBookings: Booking[];
  settings: any;
  onUpdate: (booking: Booking) => void;
  onAddPayment: (bookingId: string, payment: Payment) => void;
  onUpdateGuest: (guest: Guest) => void;
  onShiftRoom: (newRoomId: string) => void;
  onClose: () => void;
}

const StayManagement: React.FC<StayManagementProps> = ({ 
  booking, guest, room, allRooms, allBookings, settings, onUpdate, onAddPayment, onUpdateGuest, onShiftRoom, onClose 
}) => {
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showRoomShift, setShowRoomShift] = useState(false);
  const [showExtension, setShowExtension] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showGRCView, setShowGRCView] = useState(false);
  const [duplicateBillTarget, setDuplicateBillTarget] = useState<Payment | null>(null);
  const [isConsolidated, setIsConsolidated] = useState(false);
  
  const [newCharge, setNewCharge] = useState({ description: '', amount: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'Cash', remarks: '' });
  const [newOutDate, setNewOutDate] = useState(booking.checkOutDate);

  const relatedBookings = useMemo(() => {
    if (!booking.groupId) return [booking];
    return allBookings.filter(b => b.groupId === booking.groupId && (b.status === 'ACTIVE' || b.status === 'RESERVED'));
  }, [booking.groupId, allBookings]);

  const totals = useMemo(() => {
    if (booking.isVip) {
      return { totalCharges: 0, totalPayments: 0, roomRent: 0, totalDiscount: 0, taxableSum: 0, taxAmount: 0, grandTotal: 0, balance: 0, count: 1 };
    }

    const activeBookings = isConsolidated ? relatedBookings : [booking];
    
    let totalRoomRent = 0;
    let totalCharges = 0;
    let totalPayments = 0;
    let totalDiscount = 0;

    activeBookings.forEach(b => {
      const start = new Date(b.checkInDate);
      const end = new Date(b.checkOutDate);
      const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
      
      const dailyRent = (b.basePrice || 0) + (b.mealRate || 0);
      const stayRent = dailyRent * nights;
      
      totalRoomRent += stayRent;
      totalCharges += (b.charges || []).reduce((sum, c) => sum + c.amount, 0);
      totalPayments += (b.payments || []).reduce((sum, p) => sum + p.amount, 0);
      totalDiscount += (b.discount || 0);
    });
    
    const taxableSumRaw = totalRoomRent + totalCharges - totalDiscount;
    const taxRate = settings.taxRate || 0;
    
    let taxableSum = 0;
    let taxAmount = 0;

    if (booking.isGstInclusive) {
      taxableSum = taxableSumRaw / (1 + (taxRate / 100));
      taxAmount = taxableSumRaw - taxableSum;
    } else {
      taxableSum = taxableSumRaw;
      taxAmount = (taxableSum * taxRate) / 100;
    }

    const grandTotal = taxableSum + taxAmount;
    const balance = grandTotal - totalPayments;
    
    return { totalCharges, totalPayments, roomRent: totalRoomRent, totalDiscount, taxableSum, taxAmount, grandTotal, balance, count: activeBookings.length };
  }, [booking, relatedBookings, isConsolidated, settings.taxRate]);

  const stayDuration = () => {
    const start = new Date(booking.checkInDate);
    const end = new Date(booking.checkOutDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
  };

  const handleShareWhatsApp = () => {
    const message = booking.isVip 
      ? `*VIP COMPLIMENTARY STAY - ${settings.name}*\n\n*Guest:* ${guest.name}\n*Room:* ${room.number}\n*Folio:* ${booking.bookingNo}\n\nWe hope you enjoyed your VIP stay. No charges have been applied.`
      : `*BILLING SUMMARY - ${settings.name}*\n\n` +
      `*Guest:* ${guest.name}\n` +
      `*Room:* ${room.number}\n` +
      `*Folio:* ${booking.bookingNo}\n\n` +
      `*Stay Duration:* ${stayDuration()} Nights\n` +
      `*Net Bill Value:* ₹${totals.grandTotal.toFixed(2)}\n` +
      `*Paid Amount:* ₹${totals.totalPayments.toFixed(2)}\n` +
      `*Pending Balance:* ₹${totals.balance.toFixed(2)}\n\n` +
      `Please contact the front desk for detailed invoice. Thank you!`;
    
    const whatsappUrl = `https://wa.me/${guest.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCheckout = () => {
    if (!booking.isVip && totals.balance > 0 && !confirm(`Pending balance of ₹${totals.balance.toFixed(2)}. Proceed with checkout?`)) return;
    
    const now = new Date();
    const actualOutDate = now.toISOString().split('T')[0];
    const actualOutTime = now.toTimeString().split(' ')[0].substring(0, 5);

    if (isConsolidated) {
      relatedBookings.forEach(b => {
        onUpdate({ ...b, status: 'COMPLETED', checkOutDate: actualOutDate, checkOutTime: actualOutTime });
      });
    } else {
      onUpdate({ ...booking, status: 'COMPLETED', checkOutDate: actualOutDate, checkOutTime: actualOutTime });
    }
    onClose();
  };

  const handlePostPayment = () => {
    if (booking.isVip) return alert("VIP Stays cannot accept payments.");
    const totalAmt = parseFloat(newPayment.amount) || 0;
    if (totalAmt <= 0) return;
    const payment: Payment = { id: Math.random().toString(36).substr(2, 9), amount: totalAmt, date: new Date().toISOString(), method: newPayment.method, remarks: newPayment.remarks };
    onAddPayment(booking.id, payment);
    setShowAddPayment(false); 
    setNewPayment({ amount: '', method: 'Cash', remarks: '' });
  };

  const handlePostCharge = () => {
    if (booking.isVip) return alert("VIP Guest: No charges will be applied to this folio.");
    const amt = parseFloat(newCharge.amount) || 0;
    if (amt <= 0 || !newCharge.description) return;
    const charge: Charge = {
       id: `CHG-${Date.now()}`,
       description: newCharge.description,
       amount: amt,
       date: new Date().toISOString()
    };
    onUpdate({ ...booking, charges: [...(booking.charges || []), charge] });
    setShowAddCharge(false);
    setNewCharge({ description: '', amount: '' });
  };

  const handleExtendStay = () => {
     if (new Date(newOutDate) <= new Date(booking.checkInDate)) return alert("Invalid Date");
     onUpdate({ ...booking, checkOutDate: newOutDate });
     setShowExtension(false);
     alert("Stay Extended Successfully.");
  };

  const vacantRooms = allRooms.filter(r => r.status === RoomStatus.VACANT);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-2 md:p-4">
      <div className="bg-[#f8fafc] w-full max-w-7xl h-[94vh] rounded-[3.5rem] shadow-[0_50px_150px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-700">
        
        <div className={`p-8 md:p-10 text-white flex flex-col md:flex-row justify-between items-start md:items-center no-print flex-shrink-0 gap-6 transition-all ${booking.isVip ? 'bg-gradient-to-r from-amber-600 to-amber-800' : 'bg-[#003d80]'}`}>
          <div className="flex items-center gap-6 md:gap-10">
            <button onClick={onClose} className="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/20 shadow-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                 <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">{guest.name}</h2>
                 {booking.isVip && <span className="bg-white text-amber-700 px-4 py-1 rounded-full text-[10px] font-black uppercase border-2 border-amber-500 shadow-lg">VIP RESIDENT</span>}
              </div>
              <p className="text-[10px] md:text-[12px] font-bold text-blue-100 uppercase tracking-widest mt-3 opacity-90">
                Unit {room.number} • Stay: {booking.checkInDate} to {booking.checkOutDate} • Folio #{booking.bookingNo}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
             <button onClick={() => setShowGRCView(true)} className="bg-slate-700 text-white flex items-center gap-3 px-8 py-5 rounded-2xl hover:brightness-110 transition-all font-black uppercase text-xs shadow-2xl">
               Print GRC (Form C)
             </button>
             <button onClick={handleShareWhatsApp} className="bg-[#25D366] text-white flex items-center gap-3 px-8 py-5 rounded-2xl hover:brightness-110 transition-all font-black uppercase text-xs shadow-2xl">
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
               WhatsApp Bill
             </button>
             <button onClick={() => { setDuplicateBillTarget(null); setShowPrintView(true); }} className="bg-emerald-600 flex items-center gap-4 px-10 py-5 rounded-2xl hover:bg-emerald-700 transition-all font-black uppercase text-xs shadow-2xl">
               <span className="text-xl">🖨️</span>
               Generate Full Bill
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-14 grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-14 custom-scrollbar no-print">
          <div className="lg:col-span-3 space-y-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <SummaryStat label="Pending Balance" value={`₹${totals.balance.toFixed(2)}`} color="bg-rose-50 text-rose-700 border-rose-200" />
               <SummaryStat label="Receipts" value={`₹${totals.totalPayments.toFixed(2)}`} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
               <SummaryStat label="Discount Applied" value={`-₹${totals.totalDiscount.toFixed(2)}`} color="bg-orange-50 text-orange-700 border-orange-200" />
               <SummaryStat label="Net Bill Value" value={`₹${totals.grandTotal.toFixed(2)}`} color="bg-blue-50 text-blue-700 border-blue-200" />
            </div>

            <section className="bg-white p-8 md:p-12 rounded-[3.5rem] border shadow-sm space-y-10">
              <div className="flex justify-between items-center border-b-2 border-slate-50 pb-8">
                <div>
                   <h3 className="font-black text-blue-900 uppercase text-sm tracking-widest">History & Settlement</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Recorded charges and receipts for this folio</p>
                </div>
                {!booking.isVip && (
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddCharge(true)} className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl font-black text-[9px] uppercase border">Add Service</button>
                    <button onClick={() => setShowAddPayment(true)} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-700 shadow-lg">Settle New Receipt</button>
                  </div>
                )}
                {booking.isVip && (
                  <div className="bg-amber-100 text-amber-800 px-6 py-3 rounded-2xl font-black text-[10px] uppercase border border-amber-200">VIP: ALL CHARGES WAIVED</div>
                )}
              </div>

              <div className="space-y-4">
                 {(booking.charges || []).length > 0 && (
                    <div className="space-y-3 mb-10">
                       <p className="text-[9px] font-black uppercase text-slate-300 ml-4 mb-2">Service Charges & Aggregated Bills</p>
                       {(booking.charges || []).map(c => (
                          <div key={c.id} className={`flex justify-between items-center p-5 bg-white border rounded-2xl shadow-sm ${booking.isVip ? 'opacity-40 line-through' : ''}`}>
                             <div>
                                <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{c.description}</p>
                                <p className="text-[8px] font-bold text-slate-400 mt-1">{c.date.split('T')[0]}</p>
                             </div>
                             <p className="text-sm font-black text-blue-900">₹{c.amount.toFixed(2)}</p>
                          </div>
                       ))}
                    </div>
                 )}

                 <p className="text-[9px] font-black uppercase text-slate-300 ml-4 mb-2">Receipt History</p>
                 {(booking.payments || []).map(p => (
                   <div key={p.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-emerald-200 transition-all">
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{p.date.split('T')[0]} • {p.method}</p>
                         <p className="text-xl font-black text-slate-800 tracking-tight">₹{p.amount.toFixed(2)}</p>
                         {p.remarks && <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Note: {p.remarks}</p>}
                      </div>
                      <button 
                        onClick={() => { setDuplicateBillTarget(p); setShowPrintView(true); }}
                        className="bg-white border-2 border-slate-200 text-slate-500 px-6 py-2.5 rounded-xl font-black text-[9px] uppercase hover:bg-blue-900 hover:text-white hover:border-blue-900 shadow-sm transition-all"
                      >
                         Duplicate Receipt
                      </button>
                   </div>
                 ))}
                 {(booking.payments || []).length === 0 && (
                   <div className="py-20 text-center border-2 border-dashed rounded-[3rem] text-slate-300 font-black uppercase tracking-widest text-[10px]">No receipts recorded for this folio</div>
                 )}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <div className={`px-4 py-8 md:px-6 md:py-10 rounded-[4rem] text-white shadow-3xl space-y-10 border-4 md:border-8 border-white/5 text-center transition-all ${booking.isVip ? 'bg-amber-700' : 'bg-[#003d80]'}`}>
              <p className="text-[10px] md:text-[11px] font-black uppercase text-blue-300 tracking-widest mb-3">{booking.isVip ? 'VIP STATUS' : 'Balance Due'}</p>
              <div className="flex flex-col items-center justify-center min-h-[3.5rem]">
                <h3 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-black tracking-tighter leading-none break-all px-2">
                  {booking.isVip ? '₹0.00' : `₹${totals.balance.toFixed(2)}`}
                </h3>
              </div>
              <div className="space-y-4 pt-4">
                 {!booking.isVip && <button onClick={() => setShowAddPayment(true)} className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black uppercase text-xs shadow-2xl hover:scale-105 transition-all">Settle Bill Now</button>}
                 {booking.status === 'ACTIVE' && (
                    <button onClick={handleCheckout} className="w-full bg-rose-600 text-white py-6 rounded-3xl font-black uppercase text-sm shadow-2xl hover:bg-black transition-all">Authorize Checkout</button>
                 )}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-4">
               <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest mb-2 px-2">Additional Actions</p>
               {!booking.isVip && <SidebarAction label="Add Service Charge" onClick={() => setShowAddCharge(true)} />}
               <SidebarAction label="Extend Stay" onClick={() => setShowExtension(true)} />
               <SidebarAction label="Room Shift / Change" onClick={() => setShowRoomShift(true)} />
            </div>
          </div>
        </div>

        {/* MODALS */}
        {showAddCharge && (
          <Modal title="Add Service Charge" onClose={() => setShowAddCharge(false)}>
            <div className="space-y-6">
              <Inp label="Charge Description" value={newCharge.description} onChange={(v: string) => setNewCharge({...newCharge, description: v})} placeholder="e.g. Extra Bed, Mineral Water" />
              <Inp label="Amount (₹)" type="number" value={newCharge.amount} onChange={(v: string) => setNewCharge({...newCharge, amount: v})} />
              <button onClick={handlePostCharge} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black uppercase text-xs">Authorize Charge</button>
            </div>
          </Modal>
        )}

        {showAddPayment && (
          <Modal title="Settle Receipt" onClose={() => setShowAddPayment(false)}>
            <div className="space-y-6">
              <Inp label="Settlement Amount (₹)" type="number" value={newPayment.amount} onChange={(v: string) => setNewPayment({...newPayment, amount: v})} />
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Mode</label>
                <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                  <option value="Cash">Cash Account</option>
                  <option value="UPI">Digital (UPI)</option>
                  <option value="Card">Bank Card</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </div>
              <Inp label="Remarks" value={newPayment.remarks} onChange={(v: string) => setNewPayment({...newPayment, remarks: v})} />
              <button onClick={handlePostPayment} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs">Confirm Receipt</button>
            </div>
          </Modal>
        )}

        {showExtension && (
          <Modal title="Extend Resident Stay" onClose={() => setShowExtension(false)}>
            <div className="space-y-6">
              <Inp label="New Departure Date" type="date" value={newOutDate} onChange={setNewOutDate} />
              <button onClick={handleExtendStay} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black uppercase text-xs">Apply Extension</button>
            </div>
          </Modal>
        )}

        {showRoomShift && (
          <Modal title="Room Shift Protocol" onClose={() => setShowRoomShift(false)}>
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-4">Select Target Vacant Unit</p>
              {vacantRooms.map(vr => (
                <button key={vr.id} onClick={() => { onShiftRoom(vr.id); setShowRoomShift(false); }} className="w-full text-left p-6 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-blue-600 transition-all flex justify-between items-center group">
                  <div>
                    <span className="font-black text-blue-900 text-lg">Room {vr.number}</span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{vr.type}</p>
                  </div>
                  <span className="text-[9px] font-black text-blue-600 opacity-0 group-hover:opacity-100 uppercase">Authorize Shift</span>
                </button>
              ))}
              {vacantRooms.length === 0 && <p className="text-center py-10 text-slate-300 italic uppercase text-[10px]">No vacant inventory available</p>}
            </div>
          </Modal>
        )}

        {showPrintView && (
          <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col no-print-backdrop">
             <div className="bg-black p-4 flex justify-between items-center no-print">
                <div className="flex gap-4">
                   <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-black text-xs uppercase shadow-xl">Download PDF</button>
                   <button onClick={() => { setShowPrintView(false); setDuplicateBillTarget(null); }} className="text-white px-8 py-2 border border-white/20 rounded-xl font-black text-xs uppercase hover:bg-white/10">Close [X]</button>
                </div>
                <p className="text-white font-black uppercase text-[10px] opacity-40">Folio Master Dispatch Protocol</p>
             </div>
             <div className="flex-1 overflow-y-auto bg-gray-500/20 p-4 md:p-10 custom-scrollbar">
                <InvoiceView 
                   guest={guest}
                   booking={booking}
                   room={room}
                   settings={settings}
                   payments={duplicateBillTarget ? [duplicateBillTarget] : (booking.payments || [])}
                />
             </div>
          </div>
        )}

        {showGRCView && (
          <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col no-print-backdrop">
             <div className="bg-black p-4 flex justify-between items-center no-print">
                <div className="flex gap-4">
                   <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-black text-xs uppercase shadow-xl">Download PDF</button>
                   <button onClick={() => setShowGRCView(false)} className="text-white px-8 py-2 border border-white/20 rounded-xl font-black text-xs uppercase hover:bg-white/10">Close [X]</button>
                </div>
                <p className="text-white font-black uppercase text-[10px] opacity-40">Police Registry Form (GRC) Protocol</p>
             </div>
             <div className="flex-1 overflow-y-auto bg-gray-500/20 p-4 md:p-10 custom-scrollbar">
                <GRCFormView 
                   guest={guest}
                   booking={booking}
                   room={room}
                   settings={settings}
                />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryStat = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className={`${color} p-5 md:p-8 rounded-[2.5rem] border-2 shadow-sm flex flex-col justify-center min-w-0 overflow-hidden`}>
    <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-2 leading-tight break-words">{label}</p>
    <p className="text-xl md:text-2xl font-black tracking-tighter leading-none break-all">{value}</p>
  </div>
);

const SidebarAction = ({ label, onClick }: { label: string, onClick: () => void }) => (
  <button onClick={onClick} className="w-full text-left px-6 py-4 bg-slate-50 hover:bg-blue-900 hover:text-white rounded-2xl border border-slate-100 font-black uppercase text-[10px] tracking-widest transition-all shadow-sm">
    {label}
  </button>
);

const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
      <div className="bg-blue-900 p-8 text-white flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-tighter">{title}</h3>
        <button onClick={onClose} className="uppercase text-[10px] font-black opacity-60">Close</button>
      </div>
      <div className="p-10">{children}</div>
    </div>
  </div>
);

const Inp = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
  <div className="space-y-1.5 w-full text-left">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input type={type} className="w-full border-2 p-4 rounded-2xl font-black text-[12px] bg-slate-50 outline-none focus:bg-white focus:border-blue-600 transition-all text-slate-900 shadow-inner" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export default StayManagement;
