import { describe, it, expect } from "vitest";
import { detectAnomalies, type TransactionData } from "@/lib/anomaly-detection";

const base: TransactionData = {
  id: "tx-1",
  vendorName: "ABC Corp",
  vendorGstin: "29ABCDE1234F1Z5",
  invoiceNumber: "INV-001",
  invoiceDate: new Date("2026-05-14"), // a Thursday — guaranteed weekday
  amount: 10000,
  taxAmount: 1800,
  totalAmount: 11800,
};

describe("detectAnomalies", () => {
  it("returns empty array for clean transaction", () => {
    const anomalies = detectAnomalies(base, []);
    expect(anomalies).toEqual([]);
  });

  it("detects duplicate invoice", () => {
    const historical: TransactionData[] = [
      { ...base, id: "tx-old", invoiceNumber: "INV-001", vendorName: "ABC Corp" },
    ];
    const anomalies = detectAnomalies(base, historical);
    expect(anomalies.some((a) => a.type === "DUPLICATE_INVOICE")).toBe(true);
  });

  it("detects unusual amount (>2x vendor average)", () => {
    const historical: TransactionData[] = [
      { ...base, id: "tx-2", totalAmount: 5000 },
      { ...base, id: "tx-3", totalAmount: 6000 },
    ];
    const tx = { ...base, totalAmount: 25000 };
    const anomalies = detectAnomalies(tx, historical);
    expect(anomalies.some((a) => a.type === "UNUSUAL_AMOUNT")).toBe(true);
  });

  it("detects missing GST on high-value transaction", () => {
    const tx = { ...base, vendorGstin: null, totalAmount: 50000 };
    const anomalies = detectAnomalies(tx, []);
    expect(anomalies.some((a) => a.type === "MISSING_GST")).toBe(true);
  });

  it("detects future-dated invoice", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const tx = { ...base, invoiceDate: future };
    const anomalies = detectAnomalies(tx, []);
    expect(anomalies.some((a) => a.type === "DATE_MISMATCH")).toBe(true);
  });

  it("detects stale invoice (>90 days)", () => {
    const old = new Date();
    old.setDate(old.getDate() - 100);
    const tx = { ...base, invoiceDate: old };
    const anomalies = detectAnomalies(tx, []);
    expect(anomalies.some((a) => a.type === "DATE_MISMATCH")).toBe(true);
  });

  it("detects round number amount", () => {
    const tx = { ...base, totalAmount: 50000 };
    const anomalies = detectAnomalies(tx, []);
    expect(anomalies.some((a) => a.type === "ROUND_NUMBER")).toBe(true);
  });

  it("detects weekend invoice", () => {
    const saturday = new Date("2026-05-09"); // Saturday
    const tx = { ...base, invoiceDate: saturday };
    const anomalies = detectAnomalies(tx, []);
    expect(anomalies.some((a) => a.type === "WEEKEND_INVOICE")).toBe(true);
  });
});
