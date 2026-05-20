import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/services/user.service";
import { ApiError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

export default function EditProfileScreen() {
  const { user, token } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [mobile, setMobile] = useState((user as any)?.mobileNumber ?? "");
  const [bio, setBio] = useState((user as any)?.bio ?? "");
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initials = name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to change your picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    if (!name.trim()) {
      Alert.alert("Validation", "Name cannot be empty.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Validation", "Please enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (email.trim()) formData.append("email", email.trim().toLowerCase());
      if (mobile.trim()) formData.append("mobileNumber", mobile.trim());
      if (bio.trim()) formData.append("bio", bio.trim());
      if (localImage) {
        const filename = localImage.split("/").pop() ?? "profile.jpg";
        const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        formData.append("profileImage", { uri: localImage, name: filename, type: mimeType } as any);
      }

      const res = await updateProfile(formData as any, token);
      // Update Zustand store with fresh data
      if (res?.data) {
        useAuthStore.setState({ user: res.data });
      }
      Alert.alert("Success", "Profile updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Could not update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = localImage ?? user?.profileImage ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Avatar picker */}
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>

          {/* Fields */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#C4BEB8"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#C4BEB8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile number</Text>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={setMobile}
              placeholder="+91 98765 43210"
              placeholderTextColor="#C4BEB8"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell others a bit about yourself…"
              placeholderTextColor="#C4BEB8"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <Text style={styles.charCount}>{bio.length}/200</Text>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save changes"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAF8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ECE7DE",
    backgroundColor: "#fff",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    backgroundColor: "#FAFAF8",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#1A1A1A" },
  content: { padding: 20, paddingBottom: 40 },

  // Avatar
  avatarWrapper: { alignSelf: "center", marginBottom: 6 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#ECE7DE",
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F0EDE8",
    borderWidth: 2,
    borderColor: "#ECE7DE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 26, fontWeight: "700", color: "#1A1A1A" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarHint: {
    textAlign: "center",
    fontSize: 13,
    color: "#A6A09A",
    marginBottom: 24,
  },

  // Fields
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", color: "#6B6560", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
  },
  bioInput: { height: 90, textAlignVertical: "top", paddingTop: 12 },
  charCount: { fontSize: 12, color: "#C4BEB8", textAlign: "right", marginTop: 4 },

  // Save button
  saveBtn: {
    marginTop: 8,
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnDisabled: { backgroundColor: "#A6A09A" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
