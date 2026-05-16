export interface TransactionData {
  id: string;
  vendorName?: string | null;
  vendorGstin?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: Date | string | null;
  amount?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
}

export interface Anomaly {
  type:
    | "DUPLICATE_INVOICE"
    | "UNUSUAL_AMOUNT"
    | "MISSING_GST"
    | "DATE_MISMATCH"
    | "ROUND_NUMBER"
    | "WEEKEND_INVOICE";
  severity: "high" | "medium" | "low";
  message: string;
  field?: string;
}

/**
 * Rule-based anomaly detection for financial transactions.
 * Analyzes a transaction against historical data and flags suspicious patterns.
 */
export function detectAnomalies(
  transaction: TransactionData,
  historicalTransactions: TransactionData[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // DUPLICATE_INVOICE: Same invoiceNumber + vendorName exists in historical data
  if (transaction.invoiceNumber && transaction.vendorName) {
    const invoiceNum = transaction.invoiceNumber.trim().toLowerCase();
    const vendor = transaction.vendorName.trim().toLowerCase();

    const duplicate = historicalTransactions.find(
      (ht) =>
        ht.id !== transaction.id &&
        ht.invoiceNumber?.trim().toLowerCase() === invoiceNum &&
        ht.vendorName?.trim().toLowerCase() === vendor
    );

    if (duplicate) {
      anomalies.push({
        type: "DUPLICATE_INVOICE",
        severity: "high",
        message: `Duplicate invoice "${transaction.invoiceNumber}" found for vendor "${transaction.vendorName}"`,
        field: "invoiceNumber",
      });
    }
  }

  // UNUSUAL_AMOUNT: Amount is >2x the average for the same vendor
  if (transaction.totalAmount && transaction.vendorName) {
    const vendor = transaction.vendorName.trim().toLowerCase();
    const sameVendorAmounts = historicalTransactions
      .filter(
        (ht) =>
          ht.id !== transaction.id &&
          ht.vendorName?.trim().toLowerCase() === vendor &&
          ht.totalAmount != null &&
          ht.totalAmount > 0
      )
      .map((ht) => ht.totalAmount!);

    if (sameVendorAmounts.length >= 2) {
      const avg =
        sameVendorAmounts.reduce((sum, a) => sum + a, 0) /
        sameVendorAmounts.length;

      if (transaction.totalAmount > avg * 2) {
        anomalies.push({
          type: "UNUSUAL_AMOUNT",
          severity: "high",
          message: `Amount ₹${transaction.totalAmount.toLocaleString("en-IN")} is ${(transaction.totalAmount / avg).toFixed(1)}x the vendor average of ₹${Math.round(avg).toLocaleString("en-IN")}`,
          field: "totalAmount",
        });
      }
    }
  }

  // MISSING_GST: Amount > ₹10,000 but no vendorGstin
  if (
    transaction.totalAmount &&
    transaction.totalAmount > 10000 &&
    !transaction.vendorGstin?.trim()
  ) {
    anomalies.push({
      type: "MISSING_GST",
      severity: "medium",
      message: `Transaction of ₹${transaction.totalAmount.toLocaleString("en-IN")} has no vendor GSTIN — GST input credit may be lost`,
      field: "vendorGstin",
    });
  }

  // DATE_MISMATCH: invoiceDate is in the future or >90 days old
  if (transaction.invoiceDate) {
    const invoiceDate =
      typeof transaction.invoiceDate === "string"
        ? new Date(transaction.invoiceDate)
        : transaction.invoiceDate;

    if (!isNaN(invoiceDate.getTime())) {
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff < 0) {
        anomalies.push({
          type: "DATE_MISMATCH",
          severity: "medium",
          message: `Invoice date is ${Math.abs(daysDiff)} day(s) in the future`,
          field: "invoiceDate",
        });
      } else if (daysDiff > 90) {
        anomalies.push({
          type: "DATE_MISMATCH",
          severity: "medium",
          message: `Invoice date is ${daysDiff} days old — possible stale or backdated invoice`,
          field: "invoiceDate",
        });
      }
    }
  }

  // ROUND_NUMBER: totalAmount is a perfectly round number (multiple of 1000, >= 10000)
  if (
    transaction.totalAmount &&
    transaction.totalAmount >= 10000 &&
    transaction.totalAmount % 1000 === 0
  ) {
    anomalies.push({
      type: "ROUND_NUMBER",
      severity: "low",
      message: `Total amount ₹${transaction.totalAmount.toLocaleString("en-IN")} is a perfectly round number — could indicate an estimated or fabricated invoice`,
      field: "totalAmount",
    });
  }

  // WEEKEND_INVOICE: invoiceDate falls on a Saturday/Sunday
  if (transaction.invoiceDate) {
    const invoiceDate =
      typeof transaction.invoiceDate === "string"
        ? new Date(transaction.invoiceDate)
        : transaction.invoiceDate;

    if (!isNaN(invoiceDate.getTime())) {
      const dayOfWeek = invoiceDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const dayName = dayOfWeek === 0 ? "Sunday" : "Saturday";
        anomalies.push({
          type: "WEEKEND_INVOICE",
          severity: "low",
          message: `Invoice was dated on a ${dayName} — unusual for business transactions`,
          field: "invoiceDate",
        });
      }
    }
  }

  return anomalies;
}
