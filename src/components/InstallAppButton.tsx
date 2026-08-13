import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !/Android/.test(ua));

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
    toast.info("Install from your browser menu", {
      description: "Open the browser menu and choose “Install app” / “Add to Home screen”.",
    });
  };

  return (
    <Button
      variant="outline"
      onClick={() => void handleClick()}
      className={className ?? "h-11 w-full gap-2 rounded-xl"}
    >
      {isIos && !deferred ? <Share className="size-4" /> : <Download className="size-4" />}
      Install app
    </Button>
  );
}
