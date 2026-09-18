import type { CSSProperties } from 'react';

type ProtectedPrizeImageProps = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Prize photo that resists Telegram/browser long-press Open/Download/Copy link.
 * Uses CSS background-image (harder to save than <img>) + context-menu/drag guards.
 * Keeps accessibility via role="img" and aria-label; does not block tap/scroll.
 */
export function ProtectedPrizeImage({ src, alt, className = '' }: ProtectedPrizeImageProps) {
  const style = { backgroundImage: `url("${src.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")` } as CSSProperties;

  return (
    <div
      role="img"
      aria-label={alt}
      className={`prize-image-protected h-full w-full bg-cover bg-center ${className}`.trim()}
      style={style}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    />
  );
}
