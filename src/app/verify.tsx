import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { t } from '@/i18n';
import { AuthScreen, Field, FormMessage, TextLink } from '@/components/form';
import { Button } from '@/components/ui';
import { checkCode } from '@/lib/auth-messages';
import { goHome } from '@/lib/navigation';
import { useAuth } from '@/state/auth';

/** Confirm a new account with the code from the email. */
export default function Verify() {
  const router = useRouter();
  const auth = useAuth();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const problem = checkCode(code);
    setError(problem);
    if (problem) return;
    setBusy(true);
    const res = await auth.confirmSignUp(email, code);
    setBusy(false);
    if (res.ok) {
      goHome(router);
    } else {
      setError(res.error);
    }
  };

  const resend = async () => {
    setNote(null);
    const res = await auth.resendSignUpCode(email);
    if (res.ok) setNote(t('We sent a new code to {email}.', { email }));
    else setError(res.error);
  };

  return (
    <AuthScreen title={t('Check your email.')} subtitle={t('We sent a code to {email}. Enter it below to confirm your account.', { email: email || t('your email') })}>
      {note ? <FormMessage tone="info">{note}</FormMessage> : null}
      <View style={{ gap: 18 }}>
        <Field
          label={t('Code from the email')}
          value={code}
          onChangeText={setCode}
          error={error}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={10}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <TextLink label={t('Send a new code')} onPress={resend} />
      </View>
      <Button label={busy ? t('Confirming…') : t('Confirm my account')} onPress={busy ? undefined : submit} />
    </AuthScreen>
  );
}
