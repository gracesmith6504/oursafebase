import { useLazyImage } from "@/hooks/useLazyImage";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

export const LazyImage = ({ src, alt, className, ...props }: LazyImageProps) => {
  const { imgRef, imageSrc } = useLazyImage(src);

  return (
    <img
      ref={imgRef}
      src={imageSrc || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E'}
      alt={alt}
      className={cn(className, !imageSrc && "bg-muted animate-pulse")}
      loading="lazy"
      {...props}
    />
  );
};
