// components/InstallPWAButton.web.tsx
import React from "react";

type BIPEvent = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true; // iOS

function getInstallHelp() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) {
    return "Sur iOS : ouvrez ce site dans Safari → bouton Partager → « Ajouter à l’écran d’accueil ».";
  }
  if (/Edg\//.test(ua)) {
    return "Sur Microsoft Edge : menu ⋯ → « Installer cette application ».";
  }
  if (/Chrome\//.test(ua)) {
    return "Sur Chrome : menu ⋮ → « Installer l’application » (ou « Ajouter à l’écran d’accueil » sur Android).";
  }
  return "Utilisez le menu du navigateur pour « Installer l’application » / « Ajouter à l’écran d’accueil ».";
}

export default function InstallPWAButton() {
  const [deferred, setDeferred] = React.useState<BIPEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    if (isStandalone() || localStorage.getItem("pwaInstalled") === "1") {
      setInstalled(true);
      return;
    }
    const onBIP = (e: Event) => {
      e.preventDefault?.();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      localStorage.setItem("pwaInstalled", "1");
      setInstalled(true);
      setDeferred(null);
      setShowHelp(false);
    };
    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayChange = () => {
      if (mql?.matches) onInstalled();
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    mql?.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      mql?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    setShowHelp(false);
    if (deferred?.prompt) {
      await deferred.prompt();
      // le navigateur émettra appinstalled si accepté
      setDeferred(null);
    } else {
      // pas de prompt dispo -> afficher l’aide
      setShowHelp(true);
    }
  };

  return (
    <div style={{ display: "inline-block" }}>
      <button
        onClick={handleClick}
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
      {showHelp && (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #eee",
            background: "#fafafa",
            maxWidth: 420
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Comment installer ?</div>
          <div style={{ fontSize: 14, lineHeight: 1.4 }}>{getInstallHelp()}</div>
        </div>
      )}
    </div>
  );
}