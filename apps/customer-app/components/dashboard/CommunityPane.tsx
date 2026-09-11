'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { LuHeart, LuMessageCircle } from 'react-icons/lu';
import { formatDate } from '@/lib/dates';
import type { CommunityPost, Lang, Translations } from '@mucho-loco/types';

interface CommunityPaneProps {
  t: Translations;
  lang: Lang;
  active: boolean;
  posts: CommunityPost[];
  posting: boolean;
  postError: string | null;
  onCreatePost: (body: string) => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, body: string) => void;
}

export function CommunityPane({ t, lang, active, posts, posting, postError, onCreatePost, onToggleLike, onAddComment }: CommunityPaneProps) {
  const [draft, setDraft] = useState('');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  function submitPost(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onCreatePost(body);
    setDraft('');
  }

  function submitComment(postId: string) {
    const body = (commentDrafts[postId] ?? '').trim();
    if (!body) return;
    onAddComment(postId, body);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  }

  return (
    <div className={'pane' + (active ? ' active' : '')}>
      <div className="max-w-[640px]">
        <div className="font-display text-22 mb-4">{t.dashboard.community.title}</div>

        <form onSubmit={submitPost} className="bg-ml-card border border-ml-border p-4 mb-6">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.dashboard.community.composerPlaceholder}
            rows={3}
            className="w-full bg-transparent border border-ml-border p-3 text-sm text-ml-cream resize-none"
          />
          {postError && <p className="text-xs text-ml-red-bright mt-2">{postError}</p>}
          <button
            type="submit"
            disabled={posting || !draft.trim()}
            className="mt-3 px-5 py-2.5 bg-ml-red text-ml-cream font-bebas tracking-wide text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? t.dashboard.community.posting : t.dashboard.community.post}
          </button>
        </form>

        {posts.length === 0 && <p className="text-sm text-ml-cream-dim">{t.dashboard.community.empty}</p>}

        {posts.map((post) => (
          <div key={post.id} className="bg-ml-card border border-ml-border p-4 mb-4">
            <div className="mb-2">
              <b className="font-display text-lg">{post.authorName}</b>
              <span className="text-11 text-ml-cream-dim ml-2">{post.authorBranch} · {formatDate(post.createdAt, lang)}</span>
            </div>
            <p className="text-sm text-ml-cream mb-3 whitespace-pre-wrap">{post.body}</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onToggleLike(post.id)}
                className={'flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide bg-transparent border-none cursor-pointer p-0 ' + (post.likedByMe ? 'text-ml-red-bright' : 'text-ml-cream-dim')}
              >
                <LuHeart size={14} fill={post.likedByMe ? 'currentColor' : 'none'} /> {post.likeCount}
              </button>
              <button
                onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-ml-cream-dim bg-transparent border-none cursor-pointer p-0"
              >
                <LuMessageCircle size={14} /> {post.comments.length}
              </button>
            </div>

            {openComments[post.id] && (
              <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="text-xs mb-2">
                    <b>{comment.authorName}</b> <span className="text-ml-cream-dim">· {formatDate(comment.createdAt, lang)}</span>
                    <p className="text-ml-cream mt-0.5">{comment.body}</p>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    value={commentDrafts[post.id] ?? ''}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                    placeholder={t.dashboard.community.commentPlaceholder}
                    className="flex-1 bg-transparent border border-ml-border px-3 py-2 text-xs text-ml-cream"
                  />
                  <button
                    onClick={() => submitComment(post.id)}
                    className="px-3 py-2 bg-ml-red text-ml-cream text-xs font-mono uppercase tracking-wide border-none cursor-pointer"
                  >
                    {t.dashboard.community.sendComment}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
