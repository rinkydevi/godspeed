import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { PostCard } from '@/components/PostCard'
import { ComposeBox } from '@/components/ComposeBox'
import { mockPosts } from '@/lib/mock-data'
import type { Post, User } from '@/lib/types'

interface ThreadPageProps {
  params: Promise<{ username: string; postId: string }>
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { username, postId } = await params

  let post: Post
  let replies: Post[] = []
  let currentUser: User | null = null

  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      currentUser = data
    }

    // Fetch the post
    const { data: postData, error } = await supabase
      .from('posts_with_counts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .eq('id', postId)
      .single()

    if (error || !postData) {
      notFound()
      return null
    }

    // Check if liked
    let isLiked = false
    if (authUser) {
      const { data: likeData } = await supabase
        .from('likes')
        .select('user_id')
        .eq('user_id', authUser.id)
        .eq('post_id', postId)
        .maybeSingle()
      isLiked = !!likeData
    }

    post = { ...postData, is_liked: isLiked } as Post

    // Fetch replies
    const { data: repliesData } = await supabase
      .from('posts_with_counts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .eq('reply_to_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (repliesData && repliesData.length > 0) {
      const replyIds = repliesData.map((r: Post) => r.id)
      let likedReplyIds = new Set<string>()
      if (authUser) {
        const { data: likedData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', authUser.id)
          .in('post_id', replyIds)
        likedReplyIds = new Set((likedData ?? []).map((l: { post_id: string }) => l.post_id))
      }
      replies = repliesData.map((r: Post) => ({ ...r, is_liked: likedReplyIds.has(r.id) }))
    }
  } catch {
    // DB not connected — try mock data
    const mockPost = mockPosts.find(p => p.id === postId)
    if (!mockPost) {
      notFound()
      return null
    }
    post = mockPost
    replies = mockPosts.filter(p => p.reply_to_id === postId)
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/${username}`}
            className="p-1 -ml-1 rounded-full hover:bg-zinc-100 dark:hover:bg-[#1e1e1e] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-black dark:text-[#f1f1f1]" />
          </Link>
          <h1 className="font-bold text-black dark:text-[#f1f1f1] text-[16px]">Thread</h1>
        </div>
      </div>

      {/* Main post */}
      <PostCard post={post} showThreadLine={replies.length > 0} />

      {/* Reply compose */}
      {currentUser && (
        <ComposeBox
          user={currentUser}
          replyToId={postId}
          placeholder={`Reply to @${post.author.username}…`}
        />
      )}

      {/* Replies */}
      {replies.length > 0 ? (
        <div>
          {replies.map((reply, i) => (
            <PostCard
              key={reply.id}
              post={reply}
              isReply
              showThreadLine={i < replies.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-12 text-center text-[14px] text-[#777]">
          No replies yet. Be the first!
        </div>
      )}
    </div>
  )
}
