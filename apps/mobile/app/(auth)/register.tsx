import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSignUp } from "@clerk/clerk-expo";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function RegisterScreen() {
  const { signUp, isLoaded } = useSignUp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!isLoaded) return;

    if (!name.trim() || !email.trim() || password.length < 6) {
      setError("Fill all fields. Password must be 6+ characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
        firstName,
        lastName,
        unsafeMetadata: {
          collegeName: collegeName.trim() || undefined,
        },
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: email.trim().toLowerCase() },
      });
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScreenHeader title="Create account" showBack />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="p-5 pt-3"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-5">
            <BrandMark subtitle="Join your campus marketplace" size={350}/>
          </View>

          <View className="rounded-2xl border border-line bg-white p-5">
            <Text className="mb-1 text-[20px] font-semibold text-ink">Set up your profile</Text>
            <Text className="mb-5 text-[15px] text-muted">Create an account to get started</Text>

            <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@college.edu"
            />
            <Input
              label="College"
              value={collegeName}
              onChangeText={setCollegeName}
              placeholder="College name (optional)"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Min 8 characters"
            />

            {error ? <Text className="mb-3 text-[13px] text-danger">{error}</Text> : null}
            <Button title="Sign up" onPress={handleRegister} loading={loading} className="rounded-2xl" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
