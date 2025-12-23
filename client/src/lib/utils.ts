import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatNumber = (value: string | number): string => {
    if (!value) return "";
    // Remove non-digit characters (except for decimal point if needed, but usually integer for VND is cleaner, though we stick to general)
    const parts = value.toString().split(".");
    const integerPart = parts[0].replace(/\D/g, "");

    // Format integer part with commas
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Add decimal part back if it existed (handling potential trailing dot during typing)
    if (value.toString().includes(".")) {
        // Check if original value ends with dot
        if (value.toString().endsWith(".")) {
            return `${formattedInteger}.`;
        }
        return `${formattedInteger}.${parts[1] || ""}`;
    }
    return formattedInteger;
};

export const parseNumber = (value: string): number => {
    if (!value) return 0;
    return Number(value.replace(/,/g, ""));
};
