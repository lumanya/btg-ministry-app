import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/** After signing in or out: clear the account screens off the stack and land on Home. */
export function goHome(router: Router) {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/home');
}
