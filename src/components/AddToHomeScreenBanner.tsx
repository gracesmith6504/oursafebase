import { useState, useEffect } from "react";
import { Smartphone, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "add-to-homescreen-dismissed";

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

const isAndroid = () => /android/i.test(navigator.userAgent);

const isInStandaloneMode = () =>
  (window.navigator as any).standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches;

const AddToHomeScreenBanner = () => {
  const [visible, setVisible] = useState(false);
  const ios = isIOS();
  const android = isAndroid();

  useEffect(() => {
    // Don't show if already installed, or already dismissed, or not on mobile
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    if (!ios && !android) return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 flex gap-3 items-start shadow-sm">
      <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
        {ios ? (
          <Share2 className="h-4 w-4 text-primary" />
        ) : (
          <Smartphone className="h-4 w-4 text-primary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">
          Save this page to your home screen
        </p>
        {ios && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Tap the <strong>Share</strong> button{" "}
            <Share2 className="inline h-3 w-3 -mt-0.5" /> at the bottom of your
            browser, then choose <strong>"Add to Home Screen"</strong>.
          </p>
        )}
        {android && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Tap the <strong>⋮ menu</strong> in your browser, then choose{" "}
            <strong>"Add to Home Screen"</strong>.
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground -mt-0.5 -mr-1"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default AddToHomeScreenBanner;
