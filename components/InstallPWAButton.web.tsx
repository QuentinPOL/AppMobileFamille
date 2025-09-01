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
  if (/iPhone|iPad|iPod/.test(ua)) return "Sur iOS : Safari → Partager → « Ajouter à l’écran d’accueil ».";
  if (/Edg\//.test(ua)) return "Sur Microsoft Edge : menu ⋯ → « Installer cette application ».";
  if (/Chrome\//.test(ua)) return "Sur Chrome : menu ⋮ → « Installer l’application » (ou « Ajouter à l’écran d’accueil » sur Android).";
  return "Utilisez le menu du navigateur pour installer l’application.";
}

export default function InstallPWAButton() {
  const [deferred, setDeferred] = React.useState<BIPEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [isDark, setIsDark] = React.useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
      : false
  );

  // --- theme listener (clair/sombre) ---
  React.useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
  }, []);

  // --- installability / lifecycle ---
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
    const onDisplayChange = () => { if (mql?.matches) onInstalled(); };

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
      setDeferred(null); // Chrome émettra appinstalled si accepté
    } else {
      setShowHelp(true);
    }
  };

  // --- palette dépendant du thème ---
  const palette = isDark
    ? {
        text: "#ffffff",
        border: "#3f3f46",
        bg: "transparent",
        helpBg: "#18181b",
        helpBorder: "#27272a"
      }
    : {
        text: "#111827",
        border: "#e5e7eb",
        bg: "transparent",
        helpBg: "#fafafa",
        helpBorder: "#eeeeee"
      };

  return (
    <div style={{ display: "inline-block" }}>
      <button
        onClick={handleClick}
        aria-label="Installer l’application"
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${palette.border}`,
          background: palette.bg,
          color: palette.text,
          cursor: "pointer",
          fontWeight: 600,
          outline: "none"
        }}
        onMouseOver={(e) => ((e.currentTarget.style.opacity = "0.9"))}
        onMouseOut={(e) => ((e.currentTarget.style.opacity = "1"))}
      >
        Installer l’app
      </button>

      {showHelp && (
        <div
          role="status"
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${palette.helpBorder}`,
            background: palette.helpBg,
            color: palette.text,
            maxWidth: 460,
            lineHeight: 1.45
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Comment installer ?</div>
          <div style={{ fontSize: 14 }}>{getInstallHelp()}</div>
        </div>
      )}
    </div>
  );
}