import Image from "next/image";

export function BrandLogo({ size = 96 }: { size?: number }) {
  return (
    <Image
      src="/Gas-logo.png"
      alt="Gás Gasparzinho"
      width={size}
      height={size}
      priority={size > 80}
      className="shrink-0 rounded-full border border-white/20 bg-black object-cover shadow-lg shadow-emerald-950/30"
    />
  );
}
