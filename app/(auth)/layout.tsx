export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center hero-gradient px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold lowercase text-white">gåsasteget</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/70">Bokningssystem</p>
        </div>
        {children}
      </div>
    </div>
  );
}
