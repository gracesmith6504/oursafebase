import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLazyImage } from "@/hooks/useLazyImage";

interface LazyAvatarProps {
  src?: string | null;
  alt: string;
  fallback: React.ReactNode;
  className?: string;
}

export const LazyAvatar = ({ src, alt, fallback, className }: LazyAvatarProps) => {
  const { imgRef, imageSrc } = useLazyImage(src);

  return (
    <Avatar className={className} ref={imgRef as any}>
      {imageSrc && <AvatarImage src={imageSrc} alt={alt} loading="lazy" />}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
};
