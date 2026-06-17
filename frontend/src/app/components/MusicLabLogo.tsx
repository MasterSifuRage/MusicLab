export const LOGO_SRC = "/logo-musiclab.png";

interface MusicLabLogoProps {
  size?: number;
  className?: string;
}

export function MusicLabLogo({ size = 28, className = "" }: MusicLabLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="MusicLab"
      width={size}
      height={size}
      draggable={false}
      className={`rounded-md object-cover shrink-0 ${className}`}
    />
  );
}

interface MusicLabBrandProps {
  logoSize?: number;
  className?: string;
  titleClassName?: string;
}

export function MusicLabBrand({
  logoSize = 32,
  className = "",
  titleClassName = "text-xl text-[#eeeeee] font-bold tracking-widest uppercase",
}: MusicLabBrandProps) {
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      <MusicLabLogo size={logoSize} />
      <span className={titleClassName}>MusicLab</span>
    </span>
  );
}
