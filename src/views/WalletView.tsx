import React, { useState, useMemo } from 'react';
import { Plus, ArrowUpRight, ArrowDownLeft, X, Check, Trash2 } from 'lucide-react';
import { Transaction, Debt } from '../lib/tauri';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface WalletViewProps {
    finance: {
        transactions: Transaction[];
        debts: Debt[];
    };
    addTransaction: (amount: number, category: string, date: number, isExpense: boolean, description?: string) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addDebt: (
        person: string,
        amount: number,
        isOwedByMe: boolean,
        dueDate?: number | null,
        startDate?: number | null,
        paymentDay?: number | null,
        initialAmount?: number | null
    ) => Promise<void>;
    payDebt: (id: string) => Promise<void>;
    deleteDebt: (id: string) => Promise<void>;
}

export const WalletView: React.FC<WalletViewProps> = ({
    finance,
    addTransaction,
    deleteTransaction,
    addDebt,
    payDebt,
    deleteDebt
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'debts'>('overview');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddDebtModal, setShowAddDebtModal] = useState(false);

    // Transaction form state
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [isExpense, setIsExpense] = useState(true);

    // Debt form state
    const [debtPerson, setDebtPerson] = useState('');
    const [debtAmount, setDebtAmount] = useState('');
    const [debtPaidAmount, setDebtPaidAmount] = useState('');
    const [debtDueDate, setDebtDueDate] = useState('');
    const [debtPaymentDay, setDebtPaymentDay] = useState('');
    const [debtIsOwe, setDebtIsOwe] = useState(true);

    // Stats
    const totalBalance = useMemo(() => {
        return finance.transactions.reduce((acc, t) => {
            return acc + (t.is_expense ? -t.amount : t.amount);
        }, 0);
    }, [finance.transactions]);

    const totalIncome = useMemo(() => {
        return finance.transactions.filter(t => !t.is_expense).reduce((acc, t) => acc + t.amount, 0);
    }, [finance.transactions]);

    const totalExpenses = useMemo(() => {
        return finance.transactions.filter(t => t.is_expense).reduce((acc, t) => acc + t.amount, 0);
    }, [finance.transactions]);

    const iOweTotal = useMemo(() => {
        return finance.debts.filter(d => d.is_owed_by_me && d.status === 'active').reduce((acc, d) => acc + d.amount, 0);
    }, [finance.debts]);

    const owedToMeTotal = useMemo(() => {
        return finance.debts.filter(d => !d.is_owed_by_me && d.status === 'active').reduce((acc, d) => acc + d.amount, 0);
    }, [finance.debts]);

    const handleAddTransaction = async () => {
        if (!amount || !category) return;
        await addTransaction(parseFloat(amount), category, Date.now(), isExpense);
        setAmount('');
        setCategory('');
        setShowAddModal(false);
    };

    const handleAddDebt = async () => {
        if (!debtPerson || !debtAmount) return;
        const totalAmount = parseFloat(debtAmount);
        const paidAmount = debtPaidAmount ? parseFloat(debtPaidAmount) : 0;
        const remainingAmount = totalAmount - paidAmount;
        const dueDate = debtDueDate ? new Date(debtDueDate).getTime() : null;
        const paymentDay = debtPaymentDay ? parseInt(debtPaymentDay) : null;

        await addDebt(debtPerson, remainingAmount, debtIsOwe, dueDate, Date.now(), paymentDay, totalAmount);

        setDebtPerson('');
        setDebtAmount('');
        setDebtPaidAmount('');
        setDebtDueDate('');
        setDebtPaymentDay('');
        setShowAddDebtModal(false);
    };

    return (
        <div className="h-full overflow-y-auto bg-[#1c1c1e]">
            <div className="max-w-lg mx-auto px-4 py-4">
                {/* Balance Section */}
                <div className="text-center py-6">
                    <p className="text-sm text-slate-500 mb-1">Balance</p>
                    <h1 className="text-4xl font-bold text-white">
                        ₽{totalBalance.toLocaleString()}
                    </h1>
                </div>

                {/* Income/Expense Summary */}
                <div className="flex gap-3 mb-6">
                    <div className="flex-1 bg-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowUpRight size={16} className="text-green-400" />
                            <span className="text-xs text-slate-500">Income</span>
                        </div>
                        <p className="text-lg font-semibold text-green-400">+₽{totalIncome.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowDownLeft size={16} className="text-red-400" />
                            <span className="text-xs text-slate-500">Expenses</span>
                        </div>
                        <p className="text-lg font-semibold text-red-400">-₽{totalExpenses.toLocaleString()}</p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-white/5 rounded-xl p-1 mb-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-[#007AFF] text-white' : 'text-slate-400'
                            }`}
                    >
                        Transactions
                    </button>
                    <button
                        onClick={() => setActiveTab('debts')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'debts' ? 'bg-[#007AFF] text-white' : 'text-slate-400'
                            }`}
                    >
                        Debts
                    </button>
                </div>

                {activeTab === 'overview' ? (
                    <>
                        {/* Add Transaction Button */}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-medium mb-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        >
                            <Plus size={18} />
                            Add Transaction
                        </button>

                        {/* Transactions List */}
                        <div className="space-y-1">
                            {finance.transactions.length === 0 ? (
                                <p className="text-slate-600 text-center py-8">No transactions yet</p>
                            ) : (
                                finance.transactions.map(t => (
                                    <div
                                        key={t.id}
                                        className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0 group"
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.is_expense ? 'bg-red-500/10' : 'bg-green-500/10'
                                            }`}>
                                            {t.is_expense ? (
                                                <ArrowDownLeft size={16} className="text-red-400" />
                                            ) : (
                                                <ArrowUpRight size={16} className="text-green-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[15px] text-white truncate">{t.category}</p>
                                            <p className="text-xs text-slate-500">
                                                {format(t.date, 'd MMM', { locale: ru })}
                                            </p>
                                        </div>
                                        <span className={`font-medium ${t.is_expense ? 'text-red-400' : 'text-green-400'}`}>
                                            {t.is_expense ? '-' : '+'}₽{t.amount.toLocaleString()}
                                        </span>
                                        <button
                                            onClick={() => deleteTransaction(t.id)}
                                            className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Debts Summary */}
                        <div className="flex gap-3 mb-4">
                            <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                                <p className="text-xs text-slate-500 mb-1">I owe</p>
                                <p className="text-lg font-semibold text-red-400">₽{iOweTotal.toLocaleString()}</p>
                            </div>
                            <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                                <p className="text-xs text-slate-500 mb-1">Owed to me</p>
                                <p className="text-lg font-semibold text-green-400">₽{owedToMeTotal.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Add Debt Button */}
                        <button
                            onClick={() => setShowAddDebtModal(true)}
                            className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-medium mb-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        >
                            <Plus size={18} />
                            Add Debt
                        </button>

                        {/* Debts List */}
                        <div className="space-y-1">
                            {finance.debts.length === 0 ? (
                                <p className="text-slate-600 text-center py-8">No debts</p>
                            ) : (
                                finance.debts.map(d => (
                                    <div
                                        key={d.id}
                                        className={`flex items-center gap-3 py-3 border-b border-white/5 last:border-0 group ${d.status === 'paid' ? 'opacity-50' : ''
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${d.is_owed_by_me ? 'bg-red-500/10' : 'bg-green-500/10'
                                            }`}>
                                            {d.is_owed_by_me ? (
                                                <ArrowDownLeft size={16} className="text-red-400" />
                                            ) : (
                                                <ArrowUpRight size={16} className="text-green-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[15px] text-white truncate">{d.person}</p>
                                            <p className="text-xs text-slate-500">
                                                {d.is_owed_by_me ? 'I owe' : 'Owes me'}
                                            </p>
                                        </div>
                                        <span className={`font-medium ${d.is_owed_by_me ? 'text-red-400' : 'text-green-400'}`}>
                                            ₽{d.amount.toLocaleString()}
                                        </span>
                                        {d.status === 'active' && (
                                            <button
                                                onClick={() => payDebt(d.id)}
                                                className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
                                            >
                                                <Check size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteDebt(d.id)}
                                            className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add Transaction Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e] rounded-t-2xl z-[101] p-4 pb-8 border-t border-white/10"
                        >
                            <div className="flex justify-center mb-3">
                                <div className="w-10 h-1 bg-slate-600 rounded-full" />
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">New Transaction</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-500">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex bg-white/5 rounded-xl p-1 mb-4">
                                <button
                                    onClick={() => setIsExpense(true)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isExpense ? 'bg-red-500/20 text-red-400' : 'text-slate-400'
                                        }`}
                                >
                                    Expense
                                </button>
                                <button
                                    onClick={() => setIsExpense(false)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isExpense ? 'bg-green-500/20 text-green-400' : 'text-slate-400'
                                        }`}
                                >
                                    Income
                                </button>
                            </div>

                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent text-3xl font-bold text-white text-center outline-none mb-4"
                                autoFocus
                            />

                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Category"
                                className="w-full bg-white/5 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none mb-4"
                            />

                            <button
                                onClick={handleAddTransaction}
                                disabled={!amount || !category}
                                className="w-full bg-[#007AFF] disabled:opacity-30 text-white py-3 rounded-xl font-medium transition-all active:scale-[0.98]"
                            >
                                Add
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Add Debt Modal */}
            <AnimatePresence>
                {showAddDebtModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddDebtModal(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e] rounded-t-2xl z-[101] p-4 pb-8 border-t border-white/10"
                        >
                            <div className="flex justify-center mb-3">
                                <div className="w-10 h-1 bg-slate-600 rounded-full" />
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">New Debt</h3>
                                <button onClick={() => setShowAddDebtModal(false)} className="p-1.5 text-slate-500">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex bg-white/5 rounded-xl p-1 mb-4">
                                <button
                                    onClick={() => setDebtIsOwe(true)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${debtIsOwe ? 'bg-red-500/20 text-red-400' : 'text-slate-400'
                                        }`}
                                >
                                    I Owe
                                </button>
                                <button
                                    onClick={() => setDebtIsOwe(false)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!debtIsOwe ? 'bg-green-500/20 text-green-400' : 'text-slate-400'
                                        }`}
                                >
                                    Owed to Me
                                </button>
                            </div>

                            <input
                                type="text"
                                value={debtPerson}
                                onChange={(e) => setDebtPerson(e.target.value)}
                                placeholder="Person or company name"
                                className="w-full bg-white/5 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none mb-3"
                                autoFocus
                            />

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase mb-1 block">Total Amount</label>
                                    <input
                                        type="number"
                                        value={debtAmount}
                                        onChange={(e) => setDebtAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase mb-1 block">Already Paid</label>
                                    <input
                                        type="number"
                                        value={debtPaidAmount}
                                        onChange={(e) => setDebtPaidAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase mb-1 block">Due Date</label>
                                    <input
                                        type="date"
                                        value={debtDueDate}
                                        onChange={(e) => setDebtDueDate(e.target.value)}
                                        className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase mb-1 block">Payment Day</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={debtPaymentDay}
                                        onChange={(e) => setDebtPaymentDay(e.target.value)}
                                        placeholder="e.g. 15"
                                        className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddDebt}
                                disabled={!debtPerson || !debtAmount}
                                className="w-full bg-[#007AFF] disabled:opacity-30 text-white py-3 rounded-xl font-medium transition-all active:scale-[0.98]"
                            >
                                Add Debt
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
