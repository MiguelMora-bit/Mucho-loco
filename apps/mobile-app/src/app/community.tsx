import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CommunityPost } from '@mucho-loco/types';
import { formatDate } from '@mucho-loco/customer-core/dates';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Body, Button, Card, ErrorState, Heading, Loading, Mono, Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { communityRepository } from '@/lib/repositories';
import { useSessionStore } from '@/lib/stores/session.store';
import { useResource } from '@/lib/use-resource';
import { colors, fonts, space } from '@/theme';

/**
 * Feed interno entre socios (`CommunityPane` de la web). Después de publicar,
 * dar like o comentar se vuelve a pedir el feed en vez de parchar el estado a
 * mano: el servidor es la fuente de verdad (likes de otros, orden, autor que
 * él resuelve del token).
 */
export default function CommunityScreen() {
  const { t } = useT();
  const email = useSessionStore((s) => s.session?.email);
  const c = t.dashboard.community;

  const load = useCallback(() => (email ? communityRepository.getFeed(email) : Promise.resolve([])), [email]);
  const { state, reload } = useResource(load);

  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [postFailed, setPostFailed] = useState(false);

  if (!email) {
    return (
      <Screen safeTop={false}>
        <AuthPanel />
      </Screen>
    );
  }

  async function publish() {
    const body = draft.trim();
    if (!body || !email) return;
    setPosting(true);
    setPostFailed(false);
    try {
      await communityRepository.createPost(email, body);
      setDraft('');
      reload();
    } catch {
      setPostFailed(true);
    } finally {
      setPosting(false);
    }
  }

  return (
    <Screen safeTop={false}>
      <Card>
        <TextInput
          accessibilityLabel={c.composerPlaceholder}
          value={draft}
          onChangeText={setDraft}
          placeholder={c.composerPlaceholder}
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, styles.composer]}
        />
        {postFailed && <Body style={styles.error}>{c.postError}</Body>}
        <Button title={posting ? c.posting : c.post} onPress={publish} loading={posting} disabled={!draft.trim()} />
      </Card>

      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <ErrorState message={t.common.connectionError} retryLabel={t.error.retry} onRetry={reload} />
      )}
      {state.status === 'ready' && state.data.length === 0 && <Body>{c.empty}</Body>}
      {state.status === 'ready' &&
        state.data.map((post) => <PostCard key={post.id} post={post} email={email} onChanged={reload} />)}
    </Screen>
  );
}

function PostCard({ post, email, onChanged }: { post: CommunityPost; email: string; onChanged: () => void }) {
  const { t, m, lang } = useT();
  const c = t.dashboard.community;
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');

  async function toggleLike() {
    await communityRepository.toggleLike(email, post.id);
    onChanged();
  }

  async function sendComment() {
    const body = comment.trim();
    if (!body) return;
    await communityRepository.addComment(email, post.id, body);
    setComment('');
    onChanged();
  }

  return (
    <Card>
      <View>
        <Heading>{post.authorName}</Heading>
        <Mono>
          {post.authorBranch} · {formatDate(post.createdAt, lang)}
        </Mono>
      </View>
      <Body style={styles.cream}>{post.body}</Body>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${m.community.like} (${post.likeCount})`}
          accessibilityState={{ selected: post.likedByMe }}
          onPress={toggleLike}
          style={styles.action}
        >
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={18}
            color={post.likedByMe ? colors.redBright : colors.creamDim}
          />
          <Text style={styles.actionText}>{post.likeCount}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${m.community.comments} (${post.comments.length})`}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          style={styles.action}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.creamDim} />
          <Text style={styles.actionText}>{post.comments.length}</Text>
        </Pressable>
      </View>

      {open && (
        <View style={styles.comments}>
          {post.comments.map((cm) => (
            <View key={cm.id}>
              <Mono>
                {cm.authorName} · {formatDate(cm.createdAt, lang)}
              </Mono>
              <Body style={styles.cream}>{cm.body}</Body>
            </View>
          ))}
          <View style={styles.commentRow}>
            <TextInput
              accessibilityLabel={c.commentPlaceholder}
              value={comment}
              onChangeText={setComment}
              onSubmitEditing={sendComment}
              placeholder={c.commentPlaceholder}
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.commentInput]}
            />
            <Button title={c.sendComment} onPress={sendComment} disabled={!comment.trim()} style={styles.send} />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cream: { color: colors.cream },
  error: { color: colors.redBright },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.cream,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  composer: { minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: space.lg },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xs },
  actionText: { fontFamily: fonts.mono, color: colors.creamDim, fontSize: 13 },
  comments: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm, gap: space.sm },
  commentRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  commentInput: { flex: 1 },
  send: { minHeight: 44, paddingHorizontal: space.md },
});
