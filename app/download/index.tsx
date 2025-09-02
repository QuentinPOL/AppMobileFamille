// app/download.tsx
import { Redirect } from "expo-router";

export default function DownloadNative() {
  // Cette page n’existe pas en natif : on renvoie vers l’accueil (ou /login)
  return <Redirect href="/login" />;
}