import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth as useClerkAuth, useSignIn, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as authService from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { setStoredUser, setToken } from "@/utils/storage";

type Step = "email" | "code" | "password";

export default function ForgotPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRef = useRef<TextInput>(null);

  // Focus hidden input when step becomes "code"
  useEffect(() => {
    if (step === "code") {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // ── Step 1: Send reset code ──
  const handleSendCode = async () => {
    if (!isLoaded) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await signIn!.create({
        strategy: "reset_password_email_code",
        identifier: trimmed,
      });

      setCooldown(30);
      setStep("code");
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          "Could not send reset code. Please check the email and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify code → move to password step ──
  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn) return;
    if (otp.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    // Just move to password step — Clerk verifies code + password together
    setError("");
    setStep("password");
  };

  // ── Step 3: Reset password with code ──
  const handleResetPassword = async () => {
    if (!isLoaded || !signIn) return;

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: otp,
        password: newPassword,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive!({ session: result.createdSessionId });

        // Sync local session
        await clerkUser?.reload();
        const token = await getToken();
        if (token) {
          const user = await authService.getMe(token);
          await setToken(token);
          await setStoredUser(user);
          useAuthStore.setState({ token, user, isHydrated: true });
        }

        Alert.alert("Password Reset", "Your password has been reset successfully.", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
      } else {
        setError("Could not complete password reset. Please try again.");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Password reset failed.";

      // If code is wrong, go back to code step
      if (msg.toLowerCase().includes("code") || msg.toLowerCase().includes("incorrect")) {
        setStep("code");
        setOtp("");
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend code ──
  const handleResend = async () => {
    if (!isLoaded || cooldown > 0) return;
    try {
      setError("");
      await signIn!.create({
        strategy: "reset_password_email_code",
        identifier: email.trim().toLowerCase(),
      });
      setCooldown(30);
      setOtp("");
      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Could not resend code.");
    }
  };

  // ── OTP input handler ──
  const handleOtpChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, "").slice(0, 6);
    setOtp(cleanText);
  };

  // ── Render ──
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </Pressable>
          <Text style={s.headerTitle}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step indicator */}
          <View style={s.stepRow}>
            {(["email", "code", "password"] as Step[]).map((st, idx) => (
              <View key={st} style={s.stepItem}>
                <View
                  style={[
                    s.stepDot,
                    step === st && s.stepDotActive,
                    (["email", "code", "password"].indexOf(step) > idx) && s.stepDotDone,
                  ]}
                >
                  <Text
                    style={[
                      s.stepDotText,
                      (step === st ||
                        ["email", "code", "password"].indexOf(step) > idx) &&
                        s.stepDotTextActive,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                </View>
                <Text style={s.stepLabel}>
                  {st === "email" ? "Email" : st === "code" ? "Verify" : "Password"}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Email Step ── */}
          {step === "email" && (
            <View style={s.card}>
              <Text style={s.title}>Forgot your password?</Text>
              <Text style={s.subtitle}>
                Enter the email associated with your account. We'll send a 6-digit
                code to reset your password.
              </Text>

              <Text style={s.label}>Email address</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError("");
                }}
                placeholder="you@college.edu"
                placeholderTextColor="#C4BEB8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />

              {error ? <Text style={s.error}>{error}</Text> : null}

              <Pressable
                style={[s.primaryBtn, loading && s.btnDisabled]}
                onPress={handleSendCode}
                disabled={loading}
              >
                <Text style={s.primaryBtnText}>
                  {loading ? "Sending…" : "Send Reset Code"}
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── Code Step ── */}
          {step === "code" && (
            <View style={s.card}>
              <Text style={s.title}>Enter verification code</Text>
              <Text style={s.subtitle}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ fontWeight: "600" }}>{email}</Text>
              </Text>

              <View style={s.codeRow}>
                {/* Hidden Input */}
                <TextInput
                  ref={inputRef}
                  value={otp}
                  onChangeText={handleOtpChange}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  autoFocus
                  editable={!loading}
                  style={{
                    position: "absolute",
                    opacity: 0.01,
                    width: "100%",
                    height: 60,
                    fontSize: 1,
                  }}
                />

                {/* Visual OTP Boxes */}
                <View style={{ flexDirection: "row", gap: 8, width: "100%", justifyContent: "center" }} pointerEvents="none">
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = otp[index] || "";
                    const isFocused = index === otp.length;
                    return (
                      <View
                        key={index}
                        style={[
                          s.codeInput,
                          digit && s.codeInputFilled,
                          isFocused && s.codeInputFocused,
                        ]}
                      >
                        <Text style={s.codeInputText}>{digit}</Text>
                        {isFocused && <View style={s.codeInputCursor} />}
                      </View>
                    );
                  })}
                </View>
              </View>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <Pressable
                style={[s.primaryBtn, loading && s.btnDisabled]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                <Text style={s.primaryBtnText}>
                  {loading ? "Verifying…" : "Continue"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleResend}
                disabled={cooldown > 0}
                style={s.resendBtn}
              >
                <Text style={[s.resendText, cooldown > 0 && s.resendDisabled]}>
                  {cooldown > 0
                    ? `Resend code in ${cooldown}s`
                    : "Resend verification code"}
                </Text>
              </Pressable>

              <Pressable onPress={() => { setStep("email"); setError(""); }}>
                <Text style={s.changeEmail}>Use a different email</Text>
              </Pressable>
            </View>
          )}

          {/* ── Password Step ── */}
          {step === "password" && (
            <View style={s.card}>
              <Text style={s.title}>Create new password</Text>
              <Text style={s.subtitle}>
                Your new password must be at least 8 characters long.
              </Text>

              <Text style={s.label}>New password</Text>
              <TextInput
                style={s.input}
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  setError("");
                }}
                placeholder="At least 8 characters"
                placeholderTextColor="#C4BEB8"
                secureTextEntry
                autoFocus
              />

              <Text style={s.label}>Confirm password</Text>
              <TextInput
                style={s.input}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setError("");
                }}
                placeholder="Re-enter your password"
                placeholderTextColor="#C4BEB8"
                secureTextEntry
              />

              {error ? <Text style={s.error}>{error}</Text> : null}

              <Pressable
                style={[s.primaryBtn, loading && s.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={s.primaryBtnText}>
                  {loading ? "Resetting…" : "Reset Password"}
                </Text>
              </Pressable>

              <Pressable onPress={() => { setStep("code"); setError(""); }}>
                <Text style={s.changeEmail}>← Back to verification code</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
  content: { flexGrow: 1, padding: 20 },

  // Step indicator
  stepRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
    marginBottom: 28,
  },
  stepItem: { alignItems: "center", gap: 6 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0EDE8",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#1A1A1A" },
  stepDotDone: { backgroundColor: "#2ECC71" },
  stepDotText: { fontSize: 14, fontWeight: "600", color: "#A6A09A" },
  stepDotTextActive: { color: "#fff" },
  stepLabel: { fontSize: 12, color: "#A6A09A" },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  subtitle: {
    fontSize: 14,
    color: "#6B6560",
    lineHeight: 22,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B6560",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#FAFAF8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 14,
  },

  // OTP
  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  codeInput: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ECE7DE",
    backgroundColor: "#FAFAF8",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  codeInputFilled: { borderColor: "#1A1A1A", backgroundColor: "#fff" },
  codeInputFocused: { borderColor: "#1A1A1A", borderWidth: 2 },
  codeInputText: { fontSize: 22, fontWeight: "700", color: "#1A1A1A" },
  codeInputCursor: {
    position: "absolute",
    bottom: 10,
    width: 4,
    height: 2,
    backgroundColor: "#1A1A1A",
    borderRadius: 1,
  },
  error: {
    fontSize: 13,
    color: "#C0392B",
    marginBottom: 14,
    textAlign: "center",
  },

  // Buttons
  primaryBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { backgroundColor: "#A6A09A" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  resendBtn: { marginTop: 16, alignItems: "center" },
  resendText: { fontSize: 14, fontWeight: "500", color: "#1A1A1A" },
  resendDisabled: { color: "#C4BEB8" },

  changeEmail: {
    fontSize: 14,
    color: "#6B6560",
    textAlign: "center",
    marginTop: 14,
  },
});
