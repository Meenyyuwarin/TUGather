import { useCallback, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { launchImageLibraryAsync } from "expo-image-picker";
import { decode } from "base64-arraybuffer";

import { campusColors as c } from "@/constants/campus-theme";
import { accountClient } from "@/services/student-account";

const fileName = "avatar.jpg";
const maxImageSide = 512;

export function ProfileAvatar({ userId }: { userId: string }) {
  const path = `${userId}/${fileName}`;
  const busy = useRef(false);
  const [photo, setPhoto] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState<number>();
  const loadFailed = failedAttempt === attempt;
  const [feedback, setFeedback] = useState<{ text: string; error?: true }>();

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setFailedAttempt(undefined);

    async function loadPhoto() {
      try {
        const bucket = accountClient().storage.from("profile-avatars");
        const { data: files, error: listError } = await bucket.list(userId, { search: fileName });
        if (listError) throw listError;
        if (!active) return;
        if (!files.some((file) => file.name === fileName)) {
          setPhoto(undefined);
          return;
        }

        const { data, error } = await bucket.createSignedUrl(path, 3600);
        if (error) throw error;
        if (active) setPhoto(data.signedUrl);
      } catch {
        if (active) setFailedAttempt(attempt);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPhoto();
    return () => { active = false; };
  }, [attempt, path, userId]));

  async function choosePhoto() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFeedback(undefined);

    try {
      const selection = await launchImageLibraryAsync({ mediaTypes: ["images"] });
      if (selection.canceled) return;
      const [asset] = selection.assets;
      const context = ImageManipulator.manipulate(asset.uri);
      if (Math.max(asset.width, asset.height) > maxImageSide) {
        context.resize(asset.width >= asset.height ? { width: maxImageSide } : { height: maxImageSide });
      }
      const image = await context.renderAsync();
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
      if (!result.base64) throw new Error("The selected photo could not be processed.");

      const { error } = await accountClient().storage.from("profile-avatars")
        .upload(path, decode(result.base64), { contentType: "image/jpeg", upsert: true, cacheControl: "0" });
      if (error) throw error;

      setPhoto(result.uri);
      setFailedAttempt(undefined);
      setFeedback({ text: "Profile photo saved." });
    } catch {
      setFeedback({ text: "Could not save your photo. Try another image or check your connection.", error: true });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.image} accessibilityLabel="Your profile photo"
              onError={() => { setPhoto(undefined); setFailedAttempt(attempt); }} />
          ) : <Ionicons name="person" size={30} color={c.red} />}
        </View>
        <View style={styles.details}>
          <Text accessibilityRole="header" style={styles.title}>Profile photo</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ busy: pending || loading }}
            disabled={pending || loading} onPress={choosePhoto} style={styles.button}>
            <Text style={styles.buttonText}>{pending ? "Saving photo…" : loading ? "Loading photo…" : photo ? "Change photo" : "Add photo"}</Text>
          </Pressable>
        </View>
      </View>
      {loadFailed && (
        <Pressable accessibilityRole="button" disabled={pending || loading} onPress={() => setAttempt((value) => value + 1)}>
          <Text style={styles.error}>Could not load the saved photo. Try again.</Text>
        </Pressable>
      )}
      {feedback && <Text accessibilityLiveRegion="polite" style={feedback.error ? styles.error : styles.success}>{feedback.text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: c.paper, borderRadius: 22, borderWidth: 1, borderColor: c.line, padding: 16, gap: 12 },
  row: { flexDirection: "row", gap: 16, alignItems: "center" },
  avatar: { width: 68, height: 68, borderRadius: 34, overflow: "hidden", backgroundColor: c.rose, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  details: { flex: 1, gap: 4 },
  title: { color: c.ink, fontWeight: "900", fontSize: 17 },
  button: { alignSelf: "flex-start", justifyContent: "center", minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.rose },
  buttonText: { color: c.red, fontWeight: "800" },
  error: { color: c.red },
  success: { color: c.green },
});
