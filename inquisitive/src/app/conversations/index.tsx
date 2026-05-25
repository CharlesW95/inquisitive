import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/colors';
import { useAllConversations, useConversationSearch } from '@/hooks/useConversations';
import type { Conversation } from '@/lib/types';

type Bucket = 'today' | 'thisWeek' | 'earlier';

function getBucket(updatedAt: string): Bucket {
  const now = new Date();
  const date = new Date(updatedAt);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * 86_400_000);
  if (date >= todayStart) return 'today';
  if (date >= weekStart) return 'thisWeek';
  return 'earlier';
}

function formatTimestamp(iso: string, bucket: Bucket): string {
  const date = new Date(iso);
  const now = new Date();

  if (bucket === 'today') {
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60_000);
    if (diffMins < 1) return 'JUST NOW';
    if (diffMins < 60) return `${diffMins}M AGO`;
    return `${Math.floor(diffMins / 60)}H AGO`;
  }

  if (bucket === 'thisWeek') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (date >= new Date(todayStart.getTime() - 86_400_000)) return 'YESTERDAY';
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 14) return 'LAST WEEK';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

type ConversationSection = {
  title: string;
  bucket: Bucket;
  data: Conversation[];
};

const SECTION_ORDER: { bucket: Bucket; label: string }[] = [
  { bucket: 'today', label: 'TODAY' },
  { bucket: 'thisWeek', label: 'THIS WEEK' },
  { bucket: 'earlier', label: 'EARLIER' },
];

function ConversationRow({
  item,
  timestamp,
  onPress,
}: {
  item: Conversation;
  timestamp: string;
  onPress: () => void;
}) {
  const cardCount = item.card_count ?? 0;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.65}>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.rowMeta}>
          {timestamp}
          <Text style={styles.rowDot}> · </Text>
          {cardCount} CARD{cardCount === 1 ? '' : 'S'}
        </Text>
      </View>
      <SymbolView name="chevron.right" size={13} tintColor={colors.textMuted} />
    </TouchableOpacity>
  );
}

const RowSeparator = () => <View style={styles.rowDivider} />;

export default function AllConversationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const isSearching = searchText.trim().length > 0;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  // Browse mode — infinite scroll
  const {
    data: browseData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: browseLoading,
  } = useAllConversations();
  const browseConversations: Conversation[] = browseData?.pages.flat() ?? [];

  // Search mode — server-side ilike
  const { data: searchResults = [], isFetching: searchFetching } =
    useConversationSearch(debouncedQuery);

  const sections: ConversationSection[] = useMemo(() => {
    const groups: Record<Bucket, Conversation[]> = { today: [], thisWeek: [], earlier: [] };
    browseConversations.forEach((c) => groups[getBucket(c.updated_at)].push(c));
    return SECTION_ORDER
      .filter(({ bucket }) => groups[bucket].length > 0)
      .map(({ bucket, label }) => ({ title: label, bucket, data: groups[bucket] }));
  }, [browseConversations]);

  const threadCount = isSearching ? searchResults.length : browseConversations.length;
  const bottomPad = insets.bottom + 8 + 52 + 16;

  const listHeader = (
    <View style={styles.listHeader}>
      <Text style={styles.threadCount}>
        {threadCount} THREAD{threadCount === 1 ? '' : 'S'}
      </Text>
      <View style={styles.searchBar}>
        <SymbolView name="sparkles" size={16} tintColor={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textMuted}
          maxFontSizeMultiplier={1}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton} hitSlop={8}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Conversations</Text>
        <View style={styles.navRight} />
      </View>

      {browseLoading && !isSearching ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.textMuted} size="large" />
        </View>
      ) : isSearching ? (
        /* Search mode — flat list, no sections */
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={RowSeparator}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              timestamp={formatTimestamp(item.updated_at, getBucket(item.updated_at))}
              onPress={() => router.push(`/conversation/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            searchFetching ? (
              <ActivityIndicator color={colors.textMuted} style={styles.searchSpinner} />
            ) : (
              <Text style={styles.emptyText}>No conversations found</Text>
            )
          }
        />
      ) : (
        /* Browse mode — sectioned infinite scroll */
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={listHeader}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{section.title}</Text>
              <View style={styles.sectionRule} />
            </View>
          )}
          ItemSeparatorComponent={RowSeparator}
          renderItem={({ item, section }) => (
            <ConversationRow
              item={item}
              timestamp={formatTimestamp(item.updated_at, (section as ConversationSection).bucket)}
              onPress={() => router.push(`/conversation/${item.id}`)}
            />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.textMuted} style={styles.pageSpinner} />
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No conversations yet — start one below</Text>
          }
        />
      )}

      {/* Sticky bottom button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.newConvoBtn}
          onPress={() => router.push('/conversation/new' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.newConvoBtnText}>＋  New conversation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  navButton: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: 'Fraunces-Bold',
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  navRight: {
    width: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 4,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
  },
  threadCount: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceInput,
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
    gap: 5,
  },
  rowTitle: {
    fontFamily: 'Fraunces',
    fontSize: 20,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  rowMeta: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowDot: {
    color: colors.textMuted,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  searchSpinner: {
    marginTop: 32,
  },
  pageSpinner: {
    marginVertical: 16,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  newConvoBtn: {
    backgroundColor: colors.accent,
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newConvoBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
});
