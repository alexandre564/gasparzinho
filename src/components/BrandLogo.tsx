export function BrandLogo({ size = 96 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/Gas-logo.png"
      alt="Gás Gasparzinho"
      className="shrink-0 rounded-full border border-white/20 bg-black object-cover shadow-lg shadow-emerald-950/30"
      style={{ width: size, height: size }}
    />
  );
}
