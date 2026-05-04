/**
 * Marca MedicScan: corazón + línea de pulso (ECG). Optimizado para fondo oscuro.
 */
export function MedicScanLogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      shapeRendering="geometricPrecision"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
      <path
        stroke="#ffffff"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 11.25h4l1.6-5.2 2.4 10.1 2-7.2 1.7 2.3h5.3"
      />
    </svg>
  );
}
