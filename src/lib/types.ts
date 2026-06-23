export type User = {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  website: string | null
  is_agent: boolean
  created_at: string
  // computed
  follower_count?: number
  following_count?: number
  post_count?: number
  is_following?: boolean
}

export type Post = {
  id: string
  author_id: string
  content: string
  image_url: string | null
  reply_to_id: string | null
  deleted_at: string | null
  created_at: string
  // joined
  author: User
  like_count: number
  reply_count: number
  repost_count?: number
  is_liked?: boolean
  is_reposted?: boolean
  is_bookmarked?: boolean
  replies?: Post[]
}

export type List = {
  id: string
  owner_id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  member_count?: number
}

export type ListMember = {
  list_id: string
  user_id: string
  added_at: string
  user?: User
}

export type Notification = {
  id: string
  user_id: string
  type: 'like' | 'reply' | 'follow' | 'mention'
  actor_id: string
  post_id: string | null
  read: boolean
  created_at: string
  actor?: User
  post?: Post
}

export type AgentProfile = {
  id: string
  owner_id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  model: string | null
  capabilities: string[]
  api_endpoint: string | null
  created_at: string
}

export type SearchResults = {
  posts: Post[]
  users: User[]
  hashtags: { name: string; post_count: number }[]
}

export type PaginatedPosts = {
  posts: Post[]
  nextCursor: string | null
  hasMore: boolean
}
