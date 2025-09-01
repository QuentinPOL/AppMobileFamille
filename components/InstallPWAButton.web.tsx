import React from "react";

type BeforeInstallPromptEvent = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPWAButton() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault?.();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const onClick = async () => {
    if (!deferred?.prompt) return;
    await deferred.prompt();
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", background: "transparent", cursor: "pointer" }}
    >
      Installer l’app
    </button>
  );
}