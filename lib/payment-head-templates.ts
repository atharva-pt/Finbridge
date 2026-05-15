// Industry-specific starter payment heads. Surfaced when a firm onboards a new
// company so accountants don't start from an empty list.

export interface HeadTemplate {
  name: string;
  category: "INCOME" | "EXPENSE";
  description?: string;
  subHeads?: string[];
}

const TECHNOLOGY: HeadTemplate[] = [
  { name: "Service Revenue", category: "INCOME", subHeads: ["Consulting", "Implementation", "Support"] },
  { name: "Subscription Revenue", category: "INCOME", subHeads: ["Monthly", "Annual"] },
  { name: "Software Subscriptions", category: "EXPENSE", subHeads: ["AWS", "GitHub", "Slack", "Other SaaS"] },
  { name: "Cloud Infrastructure", category: "EXPENSE", subHeads: ["Compute", "Storage", "Networking"] },
  { name: "Salaries & Wages", category: "EXPENSE", subHeads: ["Engineering", "Product", "Sales", "G&A"] },
  { name: "Office Rent", category: "EXPENSE" },
  { name: "Marketing", category: "EXPENSE", subHeads: ["Digital Ads", "Events", "Content"] },
  { name: "Travel & Conveyance", category: "EXPENSE" },
];

const RETAIL: HeadTemplate[] = [
  { name: "Sales Revenue", category: "INCOME", subHeads: ["In-Store", "Online", "Wholesale"] },
  { name: "Other Income", category: "INCOME", subHeads: ["Interest", "Returns Reversed"] },
  { name: "Cost of Goods Sold", category: "EXPENSE", subHeads: ["Raw Inventory", "Packaging", "Freight In"] },
  { name: "Salaries & Wages", category: "EXPENSE", subHeads: ["Store Staff", "Management"] },
  { name: "Rent — Retail Premises", category: "EXPENSE" },
  { name: "Utilities", category: "EXPENSE", subHeads: ["Electricity", "Water", "Internet"] },
  { name: "Marketing", category: "EXPENSE", subHeads: ["Local Ads", "Festive Promotions"] },
  { name: "Logistics & Delivery", category: "EXPENSE" },
];

const MANUFACTURING: HeadTemplate[] = [
  { name: "Product Sales", category: "INCOME", subHeads: ["Domestic", "Export"] },
  { name: "Scrap Sales", category: "INCOME" },
  { name: "Raw Materials", category: "EXPENSE", subHeads: ["Direct", "Consumables"] },
  { name: "Direct Labor", category: "EXPENSE" },
  { name: "Factory Overhead", category: "EXPENSE", subHeads: ["Power", "Maintenance", "Stores"] },
  { name: "Salaries & Wages", category: "EXPENSE", subHeads: ["Plant", "Office"] },
  { name: "Equipment Maintenance", category: "EXPENSE" },
  { name: "Utilities", category: "EXPENSE" },
  { name: "Logistics & Freight Out", category: "EXPENSE" },
];

const SERVICES: HeadTemplate[] = [
  { name: "Service Revenue", category: "INCOME", subHeads: ["Retainer", "Project", "Hourly"] },
  { name: "Consulting Fees", category: "INCOME" },
  { name: "Salaries & Wages", category: "EXPENSE", subHeads: ["Delivery", "Sales", "G&A"] },
  { name: "Office Rent", category: "EXPENSE" },
  { name: "Software & Tools", category: "EXPENSE" },
  { name: "Travel & Conveyance", category: "EXPENSE" },
  { name: "Marketing", category: "EXPENSE" },
  { name: "Professional Fees", category: "EXPENSE", subHeads: ["Legal", "Accounting"] },
];

const DEFAULT: HeadTemplate[] = [
  { name: "Sales Revenue", category: "INCOME" },
  { name: "Other Income", category: "INCOME" },
  { name: "Salaries & Wages", category: "EXPENSE" },
  { name: "Office Rent", category: "EXPENSE" },
  { name: "Utilities", category: "EXPENSE" },
  { name: "Marketing", category: "EXPENSE" },
  { name: "Travel & Conveyance", category: "EXPENSE" },
];

const TEMPLATES: Record<string, HeadTemplate[]> = {
  technology: TECHNOLOGY,
  it: TECHNOLOGY,
  saas: TECHNOLOGY,
  software: TECHNOLOGY,
  retail: RETAIL,
  ecommerce: RETAIL,
  "e-commerce": RETAIL,
  manufacturing: MANUFACTURING,
  factory: MANUFACTURING,
  services: SERVICES,
  consulting: SERVICES,
  agency: SERVICES,
};

export function getTemplateForIndustry(industry?: string | null): HeadTemplate[] {
  if (!industry) return DEFAULT;
  const key = industry.toLowerCase().trim();
  for (const [match, tmpl] of Object.entries(TEMPLATES)) {
    if (key.includes(match)) return tmpl;
  }
  return DEFAULT;
}
