// app/download.web.tsx
import InstallPWAButton from "@/components/InstallPWAButton";
import { Stack } from "expo-router";
import React from "react";
import { Text, View } from "react-native";


export default function DownloadWeb() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 18 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ fontSize: 28, fontWeight: "800", textAlign: "center" }}>
        Installe l’application
      </Text>

      <Text style={{ opacity: 0.8, textAlign: "center", maxWidth: 520 }}>
        Pour une meilleure expérience, installe l’app sur ton téléphone.
        Tu peux l’installer comme PWA.
      </Text>

      {/* Bouton PWA (uniquement sur le Web grâce au .web.tsx) */}
      <InstallPWAButton />


      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 12, opacity: 0.6, textAlign: "center" }}>
          iOS : Safari → Partager → « Ajouter à l’écran d’accueil ».{"\n"}
          Android : Chrome → ⋮ → « Installer l’application  ».
        </Text>
      </View>
    </View>
  );
}