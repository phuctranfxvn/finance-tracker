import TopBar from "@/components/TopBar";
import { getTransactions } from "@/app/actions/transactions";
import { getWallets } from "@/app/actions/wallets";
import TransactionsList from "@/components/Transaction/TransactionsList";

export default async function TransactionsPage() {
    const transactions = await getTransactions();
    const wallets = await getWallets();

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--background)]">
            <TopBar />
            <TransactionsList initialTransactions={transactions} wallets={wallets} />
        </div>
    );
}
