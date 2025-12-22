import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import * as tauri from "../lib/tauri";
import logger from "../lib/logger";

export type { Transaction, Debt, FinanceSummary } from "../lib/tauri";

type DataChanged = {
    entity: string;
    action: string;
    id?: string | null;
};

export function useFinance() {
    const [finance, setFinance] = useState<tauri.FinanceSummary>({ transactions: [], debts: [] });
    const [isLoaded, setIsLoaded] = useState(false);

    const mountedRef = useRef(false);

    const refreshFinance = useCallback(async () => {
        try {
            const data = await tauri.get_finance_summary();
            if (mountedRef.current) {
                setFinance(data);
                setIsLoaded(true);
            }
        } catch (e) {
            logger.error("Failed to refresh finance data", e);
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        let unlisten: null | (() => void) = null;

        (async () => {
            try {
                await refreshFinance();
                unlisten = await listen<DataChanged>("data:changed", (event) => {
                    if (event.payload.entity === "finance") {
                        refreshFinance();
                    }
                });
            } catch (e) {
                logger.error("Finance hook startup failed", e);
            }
        })();

        return () => {
            mountedRef.current = false;
            if (unlisten) unlisten();
        };
    }, [refreshFinance]);

    const addTransaction = useCallback(async (
        amount: number,
        category: string,
        date: number,
        isExpense: boolean,
        description?: string
    ) => {
        try {
            await tauri.add_transaction(amount, category, date, isExpense, description);
            refreshFinance();
        } catch (e) {
            logger.error("Failed to add transaction", e);
        }
    }, [refreshFinance]);

    const deleteTransaction = useCallback(async (id: string) => {
        try {
            await tauri.delete_transaction(id);
            refreshFinance();
        } catch (e) {
            logger.error("Failed to delete transaction", e);
        }
    }, [refreshFinance]);

    const addDebt = useCallback(async (
        person: string,
        amount: number,
        isOwedByMe: boolean,
        dueDate?: number | null,
        startDate?: number | null,
        paymentDay?: number | null,
        initialAmount?: number | null,
        currency: string = "RUB"
    ) => {
        try {
            await tauri.add_debt(person, amount, isOwedByMe, dueDate, startDate, paymentDay, initialAmount, currency);
            refreshFinance();
        } catch (e) {
            logger.error("Failed to add debt", e);
        }
    }, [refreshFinance]);

    const payDebt = useCallback(async (id: string) => {
        try {
            await tauri.pay_debt(id);
            refreshFinance();
        } catch (e) {
            logger.error("Failed to pay debt", e);
        }
    }, [refreshFinance]);

    const deleteDebt = useCallback(async (id: string) => {
        try {
            await tauri.delete_debt(id);
            refreshFinance();
        } catch (e) {
            logger.error("Failed to delete debt", e);
        }
    }, [refreshFinance]);

    return {
        finance,
        isFinanceLoaded: isLoaded,
        refreshFinance,
        addTransaction,
        deleteTransaction,
        addDebt,
        payDebt,
        deleteDebt,
    };
}
