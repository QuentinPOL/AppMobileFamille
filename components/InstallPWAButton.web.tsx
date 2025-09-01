import React from "react";

type BeforeInstallPromptEvent = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isStandalone = () =>
  // Chrome/Edge/Android + Desktop
  window.matchMedia?.("(display-mode: standalone)").matches
  // iOS Safari (web app installée depuis l'écran d'accueil)
  || (window as any).navigator?.standalone === true;

export default function InstallPWAButton() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // 1) Si déjà installée → ne jamais montrer le bouton
    if (isStandalone() || localStorage.getItem("pwaInstalled") === "1") {
      setVisible(false);
      return;
    }

    // 2) Capturer l’évènement d’installabilité (Chrome/Edge/Android/desktop)
    const onBIP = (e: Event) => {
      e.preventDefault?.();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // 3) Si l’installation vient d’avoir lieu → masquer et marquer “installé”
    const onInstalled = () => {
      localStorage.setItem("pwaInstalled", "1");
      setDeferred(null);
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    // 4) Réagit si l’utilisateur ouvre l’app en standalone (sans rechargement)
    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (mql?.matches) {
        localStorage.setItem("pwaInstalled", "1");
        setVisible(false);
      }
    };
    mql?.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      mql?.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  const onClick = async () => {
    if (!deferred?.prompt) return;
    await deferred.prompt();
    setDeferred(null);
    // Le résultat (accepted/dismissed) peut être lu via deferred.userChoice si tu veux logger
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      style={{
        padding: 10,
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "transparent",
        cursor: "pointer"
      }}
    >
      Installer l’app
    </button>
  );
}