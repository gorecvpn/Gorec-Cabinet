type ProtectedPrizeImageProps = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Prize photo with light anti-save guards for Telegram Mini App / mobile.
 * Prefer <img> over CSS background-image — WebViews often fail to paint
 * background-image when the URL 404s or returns HTML, and <img> is more
 * reliable for same-origin /api/uploads proxies.
 */
export function ProtectedPrizeImage({ src, alt, className = '' }: ProtectedPrizeImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`prize-image-protected h-full w-full object-cover ${className}`.trim()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    />
  );
}
