import { useState } from 'react';
import Savings from './Savings';
import Debts from './Debts';
import { clsx } from 'clsx';
import { useLanguage } from '../context/LanguageContext';

export default function Finance() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'savings' | 'debts'>('savings');

    return (
        <div className="flex flex-col h-full">
            {/* Header / Tab Switcher */}
            <div className="pt-2 pb-6 px-1">
                <div className="flex p-1 bg-gray-100 rounded-2xl mx-auto max-w-sm">
                    <button
                        onClick={() => setActiveTab('savings')}
                        className={clsx(
                            "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200",
                            activeTab === 'savings'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        {t('savings')}
                    </button>
                    <button
                        onClick={() => setActiveTab('debts')}
                        className={clsx(
                            "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200",
                            activeTab === 'debts'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        {t('debts')}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'savings' ? <Savings /> : <Debts />}
            </div>
        </div>
    );
}
