import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isPreviewHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovableproject-dev.com") ||
    window.self !== window.top
  );
}

export function InstallAppButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !/Android/.test(ua));
    setIsAndroid(/Android/.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (isPreviewHost()) {
      toast.info("Open the published app first", {
        description:
          "Installing works only from the published address, not from the editor preview. Open the app in Chrome and try again.",
      });
      return;
    }

    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Installing the app…");
      }
      setDeferred(null);
      return;
    }

    if (isIos) {
      toast.info("Install on iPhone", {
        description: "Tap the Share button in Safari, then “Add to Home Screen”.",
      });
      return;
    }

    if (isAndroid) {
      toast.info("Open this page in Chrome", {
        description:
          "On Android, install from Chrome (menu → “Install app”). Other browsers install an APK file, which triggers a Play Protect warning.",
      });
      return;
    }

    toast.info("Install from your browser menu", {
      description: "Open the browser menu and choose “Install app” / “Add to Home screen”.",
    });
  };

  return (
    <div className="w-full space-y-1.5">
      <Button
        variant="outline"
        onClick={() => void handleClick()}
        className={className ?? "h-11 w-full gap-2 rounded-xl"}
      >
        {isIos && !deferred ? <Share className="size-4" /> : <Download className="size-4" />}
        Install app
      </Button>
      <p className="text-center text-[11px] leading-tight text-muted-foreground">
        On Android install from Chrome on the published site. A Play Protect warning means the app
        was installed from an APK file or a non-Chrome browser.
      </p>
    </div>
  );
}
