import Image from "next/image";

const VARIANTS = {
  stacked: { src: "/logo.png", width: 193, height: 70 },
  horizontal: { src: "/logo-horizontal.png", width: 273, height: 40 },
};

/** F9-R6: renders the tenant's uploaded logo (public URL) when set, else
 * falls back to the current Gåsasteget default images. */
export function Logo({
  variant = "stacked",
  className,
  logoUrl,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    // Tenant logos are arbitrary uploaded images (variable aspect ratio,
    // unknown at build time), so next/image's static sizing doesn't apply.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="Klubblogotyp" className={className} />;
  }

  return (
    <Image
      {...VARIANTS[variant]}
      alt="Gåsasteget – Lunds Dansklubb"
      priority
      className={className}
    />
  );
}
