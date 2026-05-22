export default function Logo({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="VaxCheck Logo"
      role="img"
    >
      <defs>
        <linearGradient id="vcShieldGrad" x1="10" y1="5" x2="75" y2="95" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2DD4BF" />
          <stop offset="0.5" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#0891B2" />
        </linearGradient>
      </defs>

      {/* Shield outline – heraldic shape */}
      <path
        d="M50 6 C50 6 14 18 14 18 L14 52 C14 72 30 87 50 94 C70 87 86 72 86 52 L86 18 Z"
        fill="none"
        stroke="url(#vcShieldGrad)"
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* Checkmark – dark navy */}
      <path
        d="M28 48 L43 63 L72 34"
        stroke="#1E3A8A"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Plus / cross – teal, below checkmark */}
      <rect x="46" y="73" width="8" height="18" rx="3" fill="#14B8A6" />
      <rect x="39" y="80" width="22" height="7" rx="3" fill="#14B8A6" />
    </svg>
  )
}
