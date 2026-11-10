import Image from "next/image";

export function BrandMark({
  size = 36,
  priority = false,
  className = "",
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <Image src="/logo.png" alt="" width={size} height={size} className="brand-mark" priority={priority} />
      <span className="brand-wordmark" aria-label="Spend Traker">
        <span className="brand-spend">Spend</span>
        <span className="brand-traker">Traker</span>
      </span>
    </span>
  );
}
