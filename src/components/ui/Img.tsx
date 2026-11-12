import { useState, type ImgHTMLAttributes } from 'react';
import { buildSrcSet } from '../../lib/images';

interface ImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string | null | undefined;
  alt: string;
  /** Eager-load and prioritise (use for the LCP image only). */
  priority?: boolean;
  sizes?: string;
}

/** Lazy-loaded responsive image with a warm placeholder while it loads. */
export function Img({ src, alt, priority = false, sizes = '100vw', className = '', ...rest }: ImgProps) {
  const [loaded, setLoaded] = useState(false);
  if (!src) {
    return <div className={`bg-paper-200 ${className}`} role="img" aria-label={alt} />;
  }
  return (
    <img
      src={src}
      srcSet={buildSrcSet(src)}
      sizes={sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      onLoad={() => setLoaded(true)}
      className={`bg-paper-200 transition-opacity duration-500 ${loaded || priority ? 'opacity-100' : 'opacity-0'} ${className}`}
      {...rest}
    />
  );
}
