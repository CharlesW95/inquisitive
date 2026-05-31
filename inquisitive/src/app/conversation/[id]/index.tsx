import { useLocalSearchParams } from 'expo-router';
import { ConversationView } from '@/components/domain/ConversationView';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ConversationView mode="existing" routeId={id} />;
}
