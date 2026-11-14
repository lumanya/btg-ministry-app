import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthScreen, Field, FormMessage, TextLink } from '@/components/form';
import { Button } from '@/components/ui';
import { checkCode, checkEmail, checkPassword, MIN_PASSWORD } from '@/lib/auth-messages';
import { goHome } from '@/lib/navigation';
import { useAuth } from '@/state/auth';

/** Two steps: send a code to the email, then enter the code and a new password. */
export default function ForgotPassword() {
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; code?: string | null; password?: string | null; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const e = checkEmail(email);
    setErrors({ email: e });
    if (e) return;
    setBusy(true);
    const res = await auth.sendResetCode(email);
    setBusy(false);
    if (res.ok) setStep('reset');
    else setErrors({ form: res.error });
  };

  const reset = async () => {
    const next = { code: checkCode(code), password: checkPassword(password) };
    setErrors(next);
    if (next.code || next.password) return;
    setBusy(true);
    const res = await auth.resetPassword(email, code, password);
    setBusy(false);
    if (res.ok) {
      goHome(router);
    } else {
      setErrors({ form: res.error });
    }
  };

  if (step === 'email') {
    return (
      <AuthScreen title="Reset your password." subtitle="Enter your account email and we’ll send you a code.">
        {errors.form ? <FormMessage>{errors.form}</FormMessage> : null}
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
          returnKeyType="go"
          onSubmitEditing={sendCode}
        />
        <Button label={busy ? 'Sending…' : 'Send me a code'} onPress={busy ? undefined : sendCode} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Choose a new password." subtitle={`If ${email} has an account, we’ve sent it a code. Enter it with your new password.`}>
      {errors.form ? <FormMessage>{errors.form}</FormMessage> : null}
      <View style={{ gap: 18 }}>
        <Field
          label="Code from the email"
          value={code}
          onChangeText={setCode}
          error={errors.code}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={10}
          returnKeyType="next"
        />
        <Field
          label="New password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD} characters.`}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={reset}
        />
        <TextLink label="Send a new code" onPress={sendCode} />
      </View>
      <Button label={busy ? 'Saving…' : 'Save new password'} onPress={busy ? undefined : reset} />
    </AuthScreen>
  );
}
