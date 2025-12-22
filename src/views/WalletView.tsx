import React, { useState, useMemo } from 'react';
import {
    Plus,
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Calendar as CalendarIcon,
    Trash2,
    Check,
    User,
    TrendingUp
} from 'lucide-react';
import { Transaction, Debt } from '../lib/tauri';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [showAddDebt, setShowAddDebt] = useState(false);

    // Stats
    const totalBalance = useMemo(() => {
        return finance.transactions.reduce((acc, t) => {
            return acc + (t.is_expense ? -t.amount : t.amount);
        }, 0);
    }, [finance.transactions]);

    const totalIncome = useMemo(() => {
        return finance.transactions
            .filter(t => !t.is_expense)
            .reduce((acc, t) => acc + t.amount, 0);
    }, [finance.transactions]);

    const totalExpenses = useMemo(() => {
        return finance.transactions
            .filter(t => t.is_expense)
            .reduce((acc, t) => acc + t.amount, 0);
    }, [finance.transactions]);

    // Debts Stats
    const iOweTotal = useMemo(() => {
        return finance.debts
            .filter(d => d.is_owed_by_me && d.status === 'active')
            .reduce((acc, d) => acc + d.amount, 0);
    }, [finance.debts]);

    const owedToMeTotal = useMemo(() => {
        return finance.debts
            .filter(d => !d.is_owed_by_me && d.status === 'active')
            .reduce((acc, d) => acc + d.amount, 0);
    }, [finance.debts]);


    // Add Transaction Form
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [isExpense, setIsExpense] = useState(true);

    const handleAddTransaction = async () => {
        if (!amount || !category) return;
        await addTransaction(parseFloat(amount), category, Date.now(), isExpense, description);
        setAmount('');
        setCategory('');
        setDescription('');
        setShowAddTransaction(false);
    };

    // Add Debt Form
    const [debtPerson, setDebtPerson] = useState('');
    // debtAmount replaced by initialAmount/paidAmount
    const [debtDueDate, setDebtDueDate] = useState('');
    const [debtStartDate, setDebtStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [debtPaymentDay, setDebtPaymentDay] = useState('');
    const [debtInitialAmount, setDebtInitialAmount] = useState('');
    const [debtPaidAmount, setDebtPaidAmount] = useState(''); // Calculated mostly
    const [debtIsOwe, setDebtIsOwe] = useState(true);

    const handleAddDebt = async () => {
        if (!debtPerson || !debtInitialAmount) return; // Need at least initial amount

        const initAmount = parseFloat(debtInitialAmount);
        const paid = debtPaidAmount ? parseFloat(debtPaidAmount) : 0;
        const currentAmount = initAmount - paid;

        const due = debtDueDate ? new Date(debtDueDate).getTime() : null;
        const start = debtStartDate ? new Date(debtStartDate).getTime() : null;
        const pDay = debtPaymentDay ? parseInt(debtPaymentDay) : null;

        await addDebt(debtPerson, currentAmount, debtIsOwe, due, start, pDay, initAmount);

        setDebtPerson('');
        setDebtDueDate('');
        setDebtStartDate(new Date().toISOString().split('T')[0]);
        setDebtPaymentDay('');
        setDebtInitialAmount('');
        setDebtPaidAmount('');
        setShowAddDebt(false);
    };

    return (
        <div className="h-full flex flex-col bg-[#1E1E1E]/50 backdrop-blur-3xl text-white/90 overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between shrink-0">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
                        <Wallet className="text-white" size={24} />
                    </div>
                    Финансы
                </h1>

                <div className="flex bg-white/5 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'overview'
                            ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                            : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        Обзор
                    </button>
                    <button
                        onClick={() => setActiveTab('debts')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'debts'
                            ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                            : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        Долги
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-6 pt-2 space-y-6 custom-scrollbar">
                {activeTab === 'overview' ? (
                    <>
                        {/* Balance Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#252525] p-5 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all duration-500" />
                                <div className="relative z-10">
                                    <p className="text-white/40 text-sm font-medium mb-1">Общий баланс</p>
                                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                                        ₽{totalBalance.toLocaleString()}
                                    </h2>
                                    <div className="text-xs text-white/30 flex items-center gap-1">
                                        <TrendingUp size={12} />
                                        <span>Доступные средства</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#252525]/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-emerald-400/80 text-xs mb-1">Доходы</div>
                                        <div className="text-lg font-bold text-emerald-400">+₽{totalIncome.toLocaleString()}</div>
                                    </div>
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                        <ArrowUpRight size={18} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#252525]/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-white/40 text-xs font-medium mb-1 uppercase tracking-wider">Расходы</p>
                                        <p className="text-xl font-bold text-rose-400">-₽{totalExpenses.toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                                        <ArrowDownLeft size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowAddTransaction(true)}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                <Plus size={18} />
                                <span>Добавить операцию</span>
                            </button>
                        </div>

                        {/* Transactions List */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white/80">История операций</h3>
                            <div className="space-y-2">
                                {finance.transactions.length === 0 ? (
                                    <div className="text-white/20 text-center py-10 border border-dashed border-white/10 rounded-xl">
                                        Нет операций
                                    </div>
                                ) : (
                                    finance.transactions.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-4 bg-[#252525] hover:bg-[#2A2A2A] rounded-xl border border-white/5 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${t.is_expense ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                    {t.is_expense ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{t.category}</div>
                                                    <div className="text-sm text-white/40 flex items-center gap-2">
                                                        <span>{format(t.date, 'd MMM HH:mm', { locale: ru })}</span>
                                                        {t.description && (
                                                            <>
                                                                <span className="w-1 h-1 bg-white/20 rounded-full" />
                                                                <span>{t.description}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className={`font-bold ${t.is_expense ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    {t.is_expense ? '-' : '+'}₽{t.amount.toLocaleString()}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm("Удалить операцию? Это действие нельзя отменить.")) {
                                                            deleteTransaction(t.id);
                                                        }
                                                    }}
                                                    className="p-2 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Debts Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#252525] p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                                        <ArrowDownLeft size={20} />
                                    </div>
                                    <h3 className="font-medium text-white/80">Я должен</h3>
                                </div>
                                <p className="text-3xl font-bold text-white mb-1">₽{iOweTotal.toLocaleString()}</p>
                            </div>
                            <div className="bg-[#252525] p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                        <ArrowUpRight size={20} />
                                    </div>
                                    <h3 className="font-medium text-white/80">Мне должны</h3>
                                </div>
                                <p className="text-3xl font-bold text-white mb-1">₽{owedToMeTotal.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowAddDebt(true)}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                <Plus size={18} />
                                <span>Добавить долг</span>
                            </button>
                        </div>

                        {/* Debts List */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white/80">Список долгов</h3>
                            <div className="space-y-2">
                                {finance.debts.length === 0 ? (
                                    <div className="text-white/20 text-center py-10 border border-dashed border-white/10 rounded-xl">
                                        Нет активных долгов
                                    </div>
                                ) : (
                                    finance.debts.map(d => (
                                        <div key={d.id} className={`flex items-center justify-between p-4 bg-[#252525] rounded-xl border border-white/5 transition-colors group ${d.status === 'paid' ? 'opacity-50' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${d.is_owed_by_me ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                    <User size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0 mx-4">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium text-white truncate">{d.person}</span>
                                                        {d.status === 'paid' && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Оплачено</span>}
                                                    </div>

                                                    {/* Progress Bar for Loans */}
                                                    {d.initial_amount && d.initial_amount > 0 ? (
                                                        <div className="mb-2">
                                                            <div className="flex justify-between text-xs text-white/40 mb-1">
                                                                <span>Осталось {d.amount.toLocaleString()} из {d.initial_amount?.toLocaleString()}</span>
                                                                <span>{Math.round((1 - d.amount / d.initial_amount) * 100)}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${d.is_owed_by_me ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${Math.min(100, (1 - d.amount / d.initial_amount) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-white/40 mb-1">
                                                            {d.is_owed_by_me ? 'Я должен' : 'Мне должны'}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3 text-xs text-white/30">
                                                        {d.payment_day && (
                                                            <div className="flex items-center gap-1 text-white/60 bg-white/5 px-2 py-0.5 rounded">
                                                                <CalendarIcon size={10} />
                                                                <span>Платёж {d.payment_day}-го числа</span>
                                                            </div>
                                                        )}
                                                        {d.due_date && (
                                                            <span>
                                                                до {format(d.due_date, 'd MMM yyyy', { locale: ru })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0">
                                                    <div className={`font-bold text-lg ${d.is_owed_by_me ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                        ₽{d.amount.toLocaleString()}
                                                    </div>

                                                    {d.status === 'active' && (
                                                        <button
                                                            onClick={() => payDebt(d.id)}
                                                            className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                            title="Отметить как полностью оплаченное"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm("Удалить долг? Это действие нельзя отменить.")) {
                                                                deleteDebt(d.id);
                                                            }
                                                        }}
                                                        className="p-2 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add Transaction Modal */}
            {showAddTransaction && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1E1E1E] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Новая операция</h2>

                        <div className="flex bg-[#252525] p-1 rounded-lg mb-6">
                            <button
                                onClick={() => setIsExpense(true)}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${isExpense ? 'bg-rose-500/20 text-rose-400' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Расход
                            </button>
                            <button
                                onClick={() => setIsExpense(false)}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${!isExpense ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Доход
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-1.5">Сумма</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-1.5">Категория</label>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                    placeholder={isExpense ? "Еда, Транспорт..." : "Зарплата, Фриланс..."}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-1.5">Описание (опционально)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                    placeholder="Комментарий..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowAddTransaction(false)}
                                className="flex-1 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 font-medium transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAddTransaction}
                                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20 transition-colors"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Debt Modal */}
            {showAddDebt && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1E1E1E] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Новый долг</h2>

                        <div className="flex bg-[#252525] p-1 rounded-lg mb-6">
                            <button
                                onClick={() => setDebtIsOwe(true)}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${debtIsOwe ? 'bg-rose-500/20 text-rose-400' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Я должен
                            </button>
                            <button
                                onClick={() => setDebtIsOwe(false)}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${!debtIsOwe ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Мне должны
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-1.5">Имя / Организация</label>
                                <input
                                    type="text"
                                    value={debtPerson}
                                    onChange={(e) => setDebtPerson(e.target.value)}
                                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                    placeholder="Банк или Имя"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-1.5">Сумма кредита (Всего)</label>
                                    <input
                                        type="number"
                                        value={debtInitialAmount}
                                        onChange={(e) => setDebtInitialAmount(e.target.value)}
                                        className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-1.5">Уже выплачено</label>
                                    <input
                                        type="number"
                                        value={debtPaidAmount}
                                        onChange={(e) => setDebtPaidAmount(e.target.value)}
                                        className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-1.5">Дата взятия</label>
                                    <input
                                        type="date"
                                        value={debtStartDate}
                                        onChange={(e) => setDebtStartDate(e.target.value)}
                                        className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-1.5">Дата возврата</label>
                                    <input
                                        type="date"
                                        value={debtDueDate}
                                        onChange={(e) => setDebtDueDate(e.target.value)}
                                        className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-1.5">День платежа (число месяца)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={debtPaymentDay}
                                        onChange={(e) => setDebtPaymentDay(e.target.value)}
                                        className="w-20 bg-[#252525] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                        placeholder="21"
                                    />
                                    <span className="text-xs text-white/30">Напоминания придут за 3, 2 и 1 день</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                            <button
                                onClick={() => setShowAddDebt(false)}
                                className="flex-1 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 font-medium transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAddDebt}
                                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20 transition-colors"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
