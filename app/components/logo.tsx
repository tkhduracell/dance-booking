import Image from "next/image";

const VARIANTS = {
  stacked: { src: "/logo.png", width: 193, height: 70 },
  horizontal: { src: "/logo-horizontal.png", width: 273, height: 40 },
};

export function Logo({
  variant = "stacked",
  className,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <Image
      {...VARIANTS[variant]}
      alt="Gåsasteget – Lunds Dansklubb"
      priority
      className={className}
    />
  );
}
