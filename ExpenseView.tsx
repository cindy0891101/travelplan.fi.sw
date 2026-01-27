import React, { useState, useMemo, useEffect } from 'react';
import { NordicCard, NordicButton, Modal } from '../components/Shared';
import { CURRENCIES as INITIAL_CURRENCIES, CATEGORY_COLORS } from '../constants';
import { Expense, Member } from '../types';
import { dbService } from '../firebaseService';

interface ArchivedSettlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: string;
}

interface ExpenseViewProps {
  members: Member[];
}

const ExpenseView: React.FC<ExpenseViewProps> = ({ members }) => {
  const myID = '1';
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clearedSplits, setClearedSplits] = useState<Record<string, boolean>>({});
  const [archivedSettlements, setArchivedSettlements] = useState<ArchivedSettlement[]>([]);
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>(INITIAL_CURRENCIES);

  useEffect(() => {
    const unsubExp = dbService.subscribeField('expenses', (data) => setExpenses(data || []));
    const unsubSplits = dbService.subscribeField('clearedSplits', (data) => setClearedSplits(data || {}));
    const unsubArch = dbService.subscribeField('archivedSettlements', (data) => setArchivedSettlements(data || []));
    const unsubRates = dbService.subscribeField('currencyRates', (data) => {
      if (data && typeof data === 'object') setCurrencyRates(data);
    });

    return () => { unsubExp(); unsubSplits(); unsubArch(); unsubRates(); };
  }, []);

  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showChart, setShowChart] = useState(false);
  
  const [formData, setFormData] = useState({ 
    id: '', 
    amount: '', 
    currency: 'TWD', 
    note: '', 
    category: 'Food', 
    payerId: '1', 
    splitWith: (members || []).map(m => m.id),
    date: new Date().toISOString().split('T')[0]
  });

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const updateExpensesCloud = (newExp: Expense[]) => dbService.updateField('expenses', newExp);
  
  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    const stats: Record<string, number> = {};
    let totalTwd = 0;
    expenses.forEach(exp => {
      const rate = (currencyRates || {})[exp.currency] || 1;
      const twdAmount = (exp.amount || 0) * rate;
      stats[exp.category] = (stats[exp.category] || 0) + twdAmount;
      totalTwd += twdAmount;
    });
    let cumulativePercent = 0;
    return Object.entries(stats)
      .map(([cat, amount]) => {
        const fraction = totalTwd > 0 ? amount / totalTwd : 0;
        const startPercent = cumulativePercent;
        cumulativePercent += fraction;
        return {
          category: cat, amount, fraction, percent: (fraction * 100).toFixed(1),
          startPercent, endPercent: cumulativePercent, color: CATEGORY_COLORS[cat] || 'bg-slate'
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, currencyRates]);

  const settlementPlans = useMemo(() => {
    const balances: Record<string, number> = {};
    (members || []).forEach(m => balances[m.id] = 0);
    
    (expenses || []).forEach(exp => {
      const rate = (currencyRates || {})[exp.currency] || 1;
      const amountInTwd = (exp.amount || 0) * rate;
      const splitWith = exp.splitWith || [];
      if (splitWith.length === 0) return;
      
      const share = amountInTwd / splitWith.length;
      splitWith.forEach(id => {
        if (!clearedSplits[`${exp.id}-${id}`] && id !== exp.payerId) {
          balances[exp.payerId] = (balances[exp.payerId] || 0) + share;
          balances[id] = (balances[id] || 0) - share;
        }
      });
    });

    (archivedSettlements || []).forEach(arch => { 
      if (balances[arch.from] !== undefined) balances[arch.from] += arch.amount; 
      if (balances[arch.to] !== undefined) balances[arch.to] -= arch.amount; 
    });
    
    let activePlans: { from: string, to: string, amount: number, key: string }[] = [];
    const tempCreditors = (members || []).map(m => ({ id: m.id, balance: balances[m.id] || 0 })).filter(m => m.balance > 0.5).sort((a, b) => b.balance - a.balance);
    const tempDebtors = (members || []).map(m => ({ id: m.id, balance: balances[m.id] || 0 })).filter(m => m.balance < -0.5).sort((a, b) => a.balance - b.balance);
    
    let c = 0, d = 0;
    while(c < tempCreditors.length && d < tempDebtors.length) {
        let amount = Math.min(tempCreditors[c].balance, Math.abs(tempDebtors[d].balance));
        activePlans.push({ from: tempDebtors[d].id, to: tempCreditors[c].id, amount, key: `${tempDebtors[d].id}-${tempCreditors[c].id}` });
        tempCreditors[c].balance -= amount; tempDebtors[d].balance += amount;
        if(tempCreditors[c].balance < 0.5) c++; if(Math.abs(tempDebtors[d].balance) < 0.5) d++;
    }
    return activePlans;
  }, [expenses, members, currencyRates, clearedSplits, archivedSettlements]);

  const handleAddExpense = () => {
    if (!formData.amount) return;
    const exp: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      category: formData.category,
      payerId: formData.payerId,
      splitWith: formData.splitWith || [],
      addedBy: myID,
      date: formData.date || new Date().toISOString().split('T')[0],
      note: formData.note
    };
    updateExpensesCloud([exp, ...expenses]);
    setShowAdd(false);
  };

  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = { Food: 'fa-utensils', Transport: 'fa-car-side', Shopping: 'fa-bag-shopping', Hotel: 'fa-bed', Ticket: 'fa-train', Activity: 'fa-star', Accommodation: 'fa-hotel', Attraction: 'fa-camera' };
    return icons[cat] || 'fa-tags';
  };

  return (
    <div className="pb-24 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      <div className="pt-6">
        <h1 className="text-3xl font-bold text-sage tracking-tight">記帳本</h1>
        <p className="text-earth-dark mt-1 font-bold">同步於雲端的團隊開支</p>
      </div>

      <NordicCard className="bg-[#E6D5C3] p-6 border-none relative overflow-hidden nordic-shadow">
        <div className="relative z-10 space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] text-sage font-bold uppercase tracking-[0.15em] opacity-80">團隊總支出</span>
              <div className="text-3xl font-bold text-[#5C4D3C] mt-1">
                NT$ {Math.round((expenses || []).reduce((a,c) => a + ((c.amount || 0) * ((currencyRates || {})[c.currency] || 1)), 0)).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setShowSettlement(true)} className="bg-white/50 py-3 rounded-xl flex flex-col items-center"><i className="fa-solid fa-handshake-angle text-[#5C4D3C] mb-1"></i><span className="text-[10px] text-[#5C4D3C] font-bold">結算</span></button>
            <button onClick={() => setShowCalc(true)} className="bg-white/50 py-3 rounded-xl flex flex-col items-center"><i className="fa-solid fa-calculator text-[#5C4D3C] mb-1"></i><span className="text-[10px] text-[#5C4D3C] font-bold">換算</span></button>
            <button onClick={() => setShowChart(true)} className="bg-white/50 py-3 rounded-xl flex flex-col items-center"><i className="fa-solid fa-chart-pie text-[#5C4D3C] mb-1"></i><span className="text-[10px] text-[#5C4D3C] font-bold">分析</span></button>
          </div>
        </div>
      </NordicCard>

      <NordicButton onClick={() => setShowAdd(true)} className="w-full h-14 bg-sage border-none"><i className="fa-solid fa-plus"></i> 新增支出</NordicButton>

      <div className="space-y-3">
        {(!expenses || expenses.length === 0) ? (
          <div className="py-16 text-center text-earth-dark/40 italic">尚未有花費紀錄</div>
        ) : (
          expenses.map(exp => (
            <div key={exp.id} onClick={() => { setSelectedExpense(exp); setShowDetail(true); }} className="bg-white p-4 rounded-3xl border border-slate flex justify-between items-center shadow-sm cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white ${CATEGORY_COLORS[exp.category] || 'bg-sage'}`}><i className={`fa-solid ${getCategoryIcon(exp.category)}`}></i></div>
                <div><h4 className="font-bold text-sage text-sm">{exp.note || '支出'}</h4><p className="text-[9px] font-bold text-earth-dark uppercase">{members.find(m => m.id === exp.payerId)?.name || '未知'} 付</p></div>
              </div>
              <div className="text-right"><div className="font-bold text-sage text-sm">{exp.currency} {(exp.amount || 0).toLocaleString()}</div></div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="新增支出">
          <div className="space-y-4">
              <input type="number" placeholder="金額" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage" />
              <input type="text" placeholder="備註" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} className="w-full p-4 bg-white border-2 border-slate rounded-2xl font-bold text-sage" />
              <NordicButton onClick={handleAddExpense} className="w-full h-14 bg-sage text-white">確認並同步雲端</NordicButton>
          </div>
      </Modal>
    </div>
  );
};

export default ExpenseView;