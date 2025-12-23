import TopBar from "@/components/TopBar";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Briefcase } from "lucide-react";
import clsx from "clsx";
import { getDashboardStats } from "@/app/actions/dashboard";

export default async function Dashboard() {
  const stats = await getDashboardStats();

  const statCards = [
    { label: "Total Balance", value: stats.totalBalance.toLocaleString() + " ₫", icon: Wallet, color: "bg-blue-100 text-blue-600", bg: "bg-blue-50" },
    { label: "Total Income", value: stats.totalIncome.toLocaleString() + " ₫", icon: TrendingUp, color: "bg-green-100 text-green-600", bg: "bg-green-50" },
    { label: "Total Expense", value: stats.totalExpense.toLocaleString() + " ₫", icon: TrendingDown, color: "bg-orange-100 text-orange-600", bg: "bg-orange-50" },
    { label: "Total Savings", value: stats.totalSavings.toLocaleString() + " ₫", icon: PiggyBank, color: "bg-pink-100 text-pink-600", bg: "bg-pink-50" },
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--background)]">
      <TopBar />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className={clsx("p-6 rounded-[2rem] flex flex-col justify-between h-40 card-hover glass-panel relative overflow-hidden", stat.bg)}>
              {/* Decorative Background blobbies */}
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>

              <div className="flex justify-between items-start z-10">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{stat.label}</div>
                  <div className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{stat.value}</div>
                </div>
                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", stat.color)}>
                  <stat.icon size={20} />
                </div>
              </div>

              <div className="z-10 mt-auto">
                {/* Mini chart placeholder */}
                <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full bg-black/10 w-2/3 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full pb-20">
          {/* Main Chart / Spending Area */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Spending By Category */}
            <div className="glass-panel p-8 rounded-[2rem] flex-1 min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Spending by Category</h3>
                <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">High Priority</span>
              </div>

              {stats.spendingByCategory.length > 0 ? (
                <div className="flex items-center gap-8">
                  {/* Using first category percentage as main gauge for demo */}
                  <div className="relative w-40 h-40 rounded-full border-[12px] border-red-500 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.spendingByCategory[0].val}%</span>
                    <span className="absolute bottom-8 text-[10px] text-[var(--text-secondary)]">Top Cat.</span>
                  </div>

                  <div className="flex-1 flex flex-col gap-4">
                    {stats.spendingByCategory.map(cat => (
                      <div key={cat.label}>
                        <div className="flex justify-between text-sm font-semibold mb-1">
                          <span>{cat.label}</span>
                          <span>{cat.val}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${cat.val}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">No spending data available</div>
              )}
            </div>
          </div>

          {/* Right Column: Upcoming / Recent */}
          <div className="flex flex-col gap-6">
            {/* Savings Goals */}
            <div className="glass-panel p-6 rounded-[2rem] bg-white">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-blue-500" />
                Savings Goals
              </h3>
              <div className="space-y-4">
                {stats.savingsGoals.length > 0 ? stats.savingsGoals.map((goal: any, i: any) => (
                  <div key={i} className="flex items-center gap-4 p-3 hover:bg-[var(--surface-hover)] rounded-xl cursor-pointer transition-colors border border-transparent hover:border-[var(--border)]">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                      <PiggyBank size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">{goal.bankName}</div>
                      <div className="text-xs text-[var(--text-secondary)]">Target: {Number(goal.amount).toLocaleString()}</div>
                    </div>
                  </div>
                )) : <div className="text-xs text-gray-400">No active goals</div>}
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex flex-col gap-4">
              <div className="font-bold text-[var(--text-secondary)] text-sm">Recent Transactions</div>
              <div className="space-y-3">
                {stats.recentTransactions.map((tx: any) => (
                  <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center", tx.type === 'INCOME' ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500")}>
                        {tx.type === 'INCOME' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      </div>
                      <div className="text-xs">
                        <div className="font-bold">{tx.note || tx.category}</div>
                        <div className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className={clsx("text-xs font-bold", tx.type === 'INCOME' ? "text-green-500" : "text-red-500")}>
                      {tx.type === 'INCOME' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
