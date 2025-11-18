import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Configure PDF.js worker
// Try local worker first (better performance), fallback to CDN if missing
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  src: string;
  onLoadSuccess?: (numPages: number) => void;
  onError?: (error: Error) => void;
}

export const PDFViewer = ({ src, onLoadSuccess, onError }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        
        // On mobile (< 640px), use a minimum width for readability
        // On larger screens, fit to container
        const minMobileWidth = 520;
        
        if (containerWidth < 640) {
          // Mobile: use larger fixed width, allow horizontal scroll
          setPageWidth(minMobileWidth);
        } else {
          // Desktop/tablet: fit to container
          setPageWidth(containerWidth);
        }
      }
    };

    updateWidth();
    
    // Debounce resize listener for better performance
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateWidth, 150);
    };
    
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    onLoadSuccess?.(numPages);
  };

  const handleError = (err: Error) => {
    console.error('PDF loading error:', err);
    setError(err);
    onError?.(err);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Unable to display PDF in browser
        </p>
        <Button
          onClick={() => window.open(src, '_blank')}
          size="sm"
          variant="outline"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in new tab
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <Document
        file={src}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleError}
        loading={
          <div className="space-y-4 p-4">
            <Skeleton className="w-full h-[70vh]" />
          </div>
        }
      >
        {Array.from(new Array(numPages), (_, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            width={pageWidth}
            className="mx-auto mb-4"
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <Skeleton className="w-full h-[70vh] mb-4" />
            }
          />
        ))}
      </Document>
    </div>
  );
};
