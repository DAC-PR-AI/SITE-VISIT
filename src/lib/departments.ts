export const DEPARTMENTS = [
  "Sales",
  "Marketing",
  "Operations",
  "Finance",
  "HR",
  "Management",
  "CRM",
] as const;

export type Department = (typeof DEPARTMENTS)[number] | string;

export function normalizeDepartmentName(dept?: string): string {
  const raw = (dept ?? "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  const aliases: Record<string, string> = {
    sales: "Sales",
    sale: "Sales",
    "sales team": "Sales",
    marketing: "Marketing",
    operations: "Operations",
    finance: "Finance",
    hr: "HR",
    humanresources: "HR",
    management: "Management",
    crm: "CRM",
    customerrelationshipmanagement: "CRM",
  };

  if (aliases[normalized]) return aliases[normalized];
  return DEPARTMENTS.includes(raw as (typeof DEPARTMENTS)[number]) ? raw : "Other";
}

// Static Tailwind classes so JIT keeps them. Keyed by lowercase dept.
const MAP: Record<
  string,
  { dot: string; bg: string; border: string; text: string; solid: string; ring: string }
> = {
  sales: {
    dot: "bg-[--color-dept-sales]",
    bg: "bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-700",
    solid: "bg-blue-500",
    ring: "ring-blue-200",
  },
  marketing: {
    dot: "bg-[--color-dept-marketing]",
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-700",
    solid: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  operations: {
    dot: "bg-[--color-dept-operations]",
    bg: "bg-orange-50",
    border: "border-orange-500",
    text: "text-orange-700",
    solid: "bg-orange-500",
    ring: "ring-orange-200",
  },
  finance: {
    dot: "bg-[--color-dept-finance]",
    bg: "bg-purple-50",
    border: "border-purple-500",
    text: "text-purple-700",
    solid: "bg-purple-500",
    ring: "ring-purple-200",
  },
  hr: {
    dot: "bg-[--color-dept-hr]",
    bg: "bg-pink-50",
    border: "border-pink-500",
    text: "text-pink-700",
    solid: "bg-pink-500",
    ring: "ring-pink-200",
  },
  management: {
    dot: "bg-[--color-dept-management]",
    bg: "bg-red-50",
    border: "border-red-500",
    text: "text-red-700",
    solid: "bg-red-500",
    ring: "ring-red-200",
  },
  crm: {
    dot: "bg-[--color-dept-crm]",
    bg: "bg-cyan-50",
    border: "border-cyan-500",
    text: "text-cyan-700",
    solid: "bg-cyan-500",
    ring: "ring-cyan-200",
  },
  other: {
    dot: "bg-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-400",
    text: "text-slate-700",
    solid: "bg-slate-500",
    ring: "ring-slate-200",
  },
};

export function deptColors(dept?: string) {
  const key = (dept || "").toLowerCase().trim();
  return MAP[key] ?? MAP.other;
}