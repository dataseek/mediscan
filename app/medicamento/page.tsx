import { Suspense } from "react";
import { MedicamentoClient } from "./MedicamentoClient";

export default function MedicamentoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <MedicamentoClient />
    </Suspense>
  );
}
