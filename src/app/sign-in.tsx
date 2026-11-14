import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthScreen, Field, FormMessage, TextLink } from '@/components/form';
import { Button } from '@/components/ui';
import { checkEmail, cleanEmail } from '@/lib/auth-messages';
import { goHome } from '@/lib/navigation';
import { useAuth } from '@/state/auth';

export default function SignIn() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next = { email: checkEmail(email), password: password ? null : 'Enter your password.' };
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    const res = await auth.signIn(email, password);
    setBusy(false);
    if (res.ok) {
      goHome(router);
    } else if (res.error.startsWith('Confirm your email')) {
      router.push({ pathname: '/verify', params: { email: cleanEmail(email) } });
    } else {
      setErrors({ form: res.error });
    }
  };

  return (
    <AuthScreen title="Welcome back." subtitle="Sign in to keep your reading streak, saved sermons and prayer requests on every phone.">
      {!auth.configured ? <FormMessage tone="info">Accounts aren’t switched on in this version yet. You can still use everything as a guest.</FormMessage> : null}
      {errors.form ? <FormMessage>{errors.form}</FormMessage> : null}
      <View style={{ gap: 18 }}>
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
          secure
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <TextLink label="Forgot your password?" onPress={() => router.push({ pathname: '/forgot-password', params: { email } })} />
      </View>
      <View style={{ gap: 6 }}>
        <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={busy ? undefined : submit} />
        <Button label="Create an account" variant="outline" onPress={() => router.replace('/sign-up')} style={{ borderColor: 'transparent' }} />
      </View>
    </AuthScreen>
  );
}

