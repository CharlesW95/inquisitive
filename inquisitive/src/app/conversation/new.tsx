import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { createConversation } from '@/lib/db/conversations';
import { DEV_USER_ID } from '@/constants/dev';

export default function NewConversationScreen() {
  const router = useRouter();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    createConversation(DEV_USER_ID).then((conversation) => {
      if (mounted.current) {
        router.replace(`/conversation/${conversation.id}`);
      }
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  return <View className="flex-1 bg-background" />;
}
