import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BackButton,
  InputField,
  PrimaryButton,
  ScreenContainer,
} from "@/components";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { clampDisplayName, DISPLAY_NAME_MAX_LENGTH } from '@/lib/display-name';
import {
  isDuplicateEmailSignupError,
  linkRestaurantToExistingAccount,
} from "@/lib/link-account";
import {
  validateSignUpEmail,
  validateSignUpPassword,
  validateVenueNameForSignUp,
} from "@/lib/sign-up-form-validation";
import { supabase } from "@/lib/supabase";
import {
  validateOptionalBusinessPhone,
  validateRequiredBusinessAddress,
} from "@/lib/venue-contact-validation";

type FieldKey = "name" | "address" | "phone" | "email" | "password";
type FieldErrors = Partial<Record<FieldKey, string>>;

const emptyFieldErrors: FieldErrors = {};

export default function RestaurantRegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshRoles, setActiveRole } = useActiveRole();
  const [restaurantName, setRestaurantName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(emptyFieldErrors);

  const clearError = (key: FieldKey) => {
    setFieldErrors((prev) =>
      prev[key] ? { ...prev, [key]: undefined } : prev,
    );
  };

  const onCreate = async () => {
    setFieldErrors(emptyFieldErrors);
    const next: FieldErrors = {};
    const nameR = validateVenueNameForSignUp(restaurantName);
    if (!nameR.ok) next.name = nameR.message;
    const addressR = businessAddress.trim()
      ? validateRequiredBusinessAddress(businessAddress)
      : { ok: false as const, message: "Enter your business address (street, city, state, or region)." };
    if (!addressR.ok) next.address = addressR.message;
    const phoneR = validateOptionalBusinessPhone(phone);
    if (!phoneR.ok) next.phone = phoneR.message;
    const emailR = validateSignUpEmail(email);
    if (!emailR.ok) next.email = emailR.message;
    const passR = validateSignUpPassword(password);
    if (!passR.ok) next.password = passR.message;
    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }
    if (!addressR.ok) return;
    const nameValue = (nameR as { ok: true; value: string }).value;
    const addressValue = (addressR as { ok: true; value: string }).value;
    const emailValue = (emailR as { ok: true; value: string }).value;
    const passwordValue = (passR as { ok: true; value: string }).value;
    const phoneValue = (phoneR as { ok: true; value: string }).value;
    const reg2Params = {
      restaurantName: nameValue,
      address: addressValue,
      phone: phoneValue,
    };
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password: passwordValue,
        options: {
          data: {
            role: 'restaurant',
            display_name: clampDisplayName(restaurantName.trim()),
          },
        },
      });
      if (error) {
        if (isDuplicateEmailSignupError(error)) {
          Alert.alert(
            "Link to your existing account?",
            "This email already has an account. Enter the password you already use for it—we sign you in and add restaurant access. One account, one password; linking does not add a second password. Next you’ll continue restaurant set-up where you left off.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Link account",
                onPress: async () => {
                  setLoading(true);
                  try {
                    const result = await linkRestaurantToExistingAccount(
                      emailValue,
                      passwordValue,
                    );
                    if (result.status === "auth_failed") {
                      Alert.alert(
                        "Could not sign in",
                        "Check that you are using the password for this email. If you forgot it, use Forgot password on the login screen.",
                      );
                      return;
                    }
                    if (result.status === "role_failed") {
                      Alert.alert(
                        "Could not add restaurant access",
                        result.message,
                      );
                      return;
                    }
                    if (result.status === "already_restaurant") {
                      Alert.alert(
                        "Already a restaurant",
                        "This account already has restaurant access. Sign in to continue.",
                        [
                          {
                            text: "OK",
                            onPress: () => router.replace("/login"),
                          },
                        ],
                      );
                      return;
                    }
                    await refreshRoles();
                    await setActiveRole("restaurant");
                    router.replace({
                      pathname: "/restaurant-registration-2",
                      params: reg2Params,
                    });
                  } catch (e) {
                    Alert.alert(
                      "Error",
                      e instanceof Error ? e.message : "Unknown error",
                    );
                  } finally {
                    setLoading(false);
                  }
                },
              },
            ],
          );
          return;
        }
        Alert.alert("Could not create account", error.message);
        return;
      }
      if (data.session) {
        await refreshRoles();
        await setActiveRole("restaurant");
        router.push({
          pathname: "/restaurant-registration-2",
          params: reg2Params,
        });
      } else {
        Alert.alert(
          "Confirm your email",
          "After confirming, sign in and you can finish restaurant setup from the app.",
          [{ text: "OK", onPress: () => router.replace("/login") }],
        );
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <BackButton />
      <ScreenContainer scroll padding="xl">
        <View style={{ height: insets.top + 36 }} />
        <View style={styles.header}>
          <Text style={styles.title}>Restaurant</Text>
          <Text style={styles.subtitle}>
            Start managing your menu and growing your business
          </Text>
        </View>

        <InputField
          label="Restaurant Name"
          placeholder="Your restaurant name"
          value={restaurantName}
          onChangeText={(t) => {
            setRestaurantName(clampDisplayName(t.replace(/\r?\n/g, " ")));
            clearError("name");
          }}
          error={fieldErrors.name}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          multiline
        />
        <InputField
          label="Business address"
          placeholder="Street, city, state zip"
          value={businessAddress}
          onChangeText={(t) => {
            setBusinessAddress(t.replace(/\r?\n/g, " "));
            clearError("address");
          }}
          error={fieldErrors.address}
          multiline
        />
        <InputField
          label="Phone (optional)"
          placeholder="e.g. 234-567-8900 or 1-234-567-8900"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            clearError("phone");
          }}
          error={fieldErrors.phone}
        />
        <InputField
          label="Email"
          placeholder="your@restaurant.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            clearError("email");
          }}
          error={fieldErrors.email}
        />
        <InputField
          label="Password"
          placeholder="At least 6 characters"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            clearError("password");
          }}
          error={fieldErrors.password}
        />

        <PrimaryButton
          text="Create Account"
          onPress={onCreate}
          loading={loading}
          disabled={loading}
          style={styles.createButton}
        />

        <View style={styles.footer}>
          <Text style={styles.footerPrompt}>Already have an account? </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log in"
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.footerLink}>Log in</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.heading,
    fontSize: 32,
    lineHeight: 40,
    color: Colors.text,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 320,
  },
  createButton: {
    marginTop: Spacing.base,
    marginBottom: Spacing.xxl,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  footerPrompt: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  footerLink: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
});
