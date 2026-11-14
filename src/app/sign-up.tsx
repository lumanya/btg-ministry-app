import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthScreen, Field, FormMessage } from '@/components/form';
import { Button } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { checkEmail, checkName, checkPassword, cleanEmail, MIN_PASSWORD } from '@/lib/auth-messages';
import { goHome } from '@/lib/navigation';
import { useAuth } from '@/state/auth';
import { useColors } from '@/state/theme';

export default function SignUp() {
  const router = useRouter();
  const auth = useAuth();
  const c = useColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string | null; email?: string | null; password?: string | null; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next = { name: checkName(name), email: checkEmail(email), password: checkPassword(password) };
    setErrors(next);
    if (next.name || next.email || next.password) return;
    setBusy(true);
    const res = await auth.signUp(name, email, password);
    setBusy(false);
    if (!res.ok) {
      setErrors({ form: res.error });
    } else if (res.needsCode) {
      router.replace({ pathname: '/verify', params: { email: cleanEmail(email) } });
    } else {
      goHome(router);
    }
  };

  return (
    <AuthScreen title="Create your account." subtitle="Join BTG Ministry to keep your streak, saved sermons and prayer requests with you on every phone.">
      {!auth.configured ? <FormMessage tone="info">Accounts aren’t switched on in this version yet. You can still use everything as a guest.</FormMessage> : null}
      {errors.form ? <FormMessage>{errors.form}</FormMessage> : null}
      <View style={{ gap: 18 }}>
        <Field label="Your name" value={name} onChangeText={setName} error={errors.name} autoComplete="name" textContentType="name" autoCapitalize="words" returnKeyType="next" />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD} characters.`}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>
      <View style={{ gap: 6 }}>
        <Button label={busy ? 'Creating your account…' : 'Create account'} onPress={busy ? undefined : submit} />
        <Button label="I already have an account" variant="outline" onPress={() => router.replace('/sign-in')} style={{ borderColor: 'transparent' }} />
      </View>
      <Text style={{ fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: c.textMuted }}>
        We’ll email you a code to confirm your address. Your details are used only for your BTG Ministry account.
      </Text>
    </AuthScreen>
  );
}
