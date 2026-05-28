import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { getProfile } from '@/lib/db/profiles';

export function useFirstName(): string | null | undefined {
  const userId = useAuthStore((s) => s.userId);
  const firstName = useProfileStore((s) => s.firstName);
  const cachedUserId = useProfileStore((s) => s.cachedUserId);
  const setFirstName = useProfileStore((s) => s.setFirstName);

  const cacheValid = cachedUserId === userId && firstName !== undefined;

  useEffect(() => {
    if (!userId || cacheValid) return;

    let cancelled = false;
    getProfile(userId).then((profile) => {
      if (cancelled || profile === null) return;
      setFirstName(userId, profile.first_name);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, cacheValid, setFirstName]);

  return cacheValid ? firstName : undefined;
}
