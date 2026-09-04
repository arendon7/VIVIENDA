import Image from "next/image";

type BrandLogoProps = {
  variant?: "horizontal" | "mark";
  width?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  variant = "horizontal",
  width = variant === "horizontal" ? 280 : 48,
  className,
  priority = false,
}: BrandLogoProps) {
  const src =
    variant === "mark"
      ? "/brand/logos/logo-mark-ochre.svg"
      : "/brand/logos/logo-horizontal.svg";

  const ratio = variant === "horizontal" ? 980 / 250 : 1;
  const height = Math.round(width / ratio);

  return (
    <Image
      src={src}
      alt="Casa con Criterio"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
