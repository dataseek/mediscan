import type { Plan } from "@prisma/client";

const planStyles: Record<Plan, { label: string; className: string }> = {
  FREE: {
    label: "FREE",
    className: "border border-white/[0.10] bg-white/[0.06] text-white/80"
  },
  PRO: {
    label: "PRO",
    className: "border border-medical/40 bg-medical/15 text-medical"
  }
};

export function PlanBadge({ plan }: { plan: Plan }) {
  const style = planStyles[plan];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}

