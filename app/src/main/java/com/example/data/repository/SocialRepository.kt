package com.example.data.repository

import android.content.Context
import com.example.data.local.*
import com.example.data.remote.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.withContext
import java.util.UUID

class SocialRepository(
    private val db: SocialXDatabase,
    private val context: Context
) {
    private val postDao = db.postDao()
    private val storyDao = db.storyDao()
    private val reelDao = db.reelDao()
    private val messageDao = db.messageDao()
    private val notificationDao = db.notificationDao()
    private val userDao = db.userDao()

    val allPosts: Flow<List<PostEntity>> = postDao.getAllPosts()
    val savedPosts: Flow<List<PostEntity>> = postDao.getSavedPosts()
    val activeStories: Flow<List<StoryEntity>> = storyDao.getActiveStories()
    val allReels: Flow<List<ReelEntity>> = reelDao.getAllReels()
    val notifications: Flow<List<NotificationEntity>> = notificationDao.getAllNotifications()

    fun getMessages(conversationId: String): Flow<List<MessageEntity>> {
        return messageDao.getMessages(conversationId)
    }

    suspend fun getUserProfile(userId: String): UserProfileEntity? {
        return withContext(Dispatchers.IO) {
            userDao.getUserProfile(userId)
        }
    }

    suspend fun updateProfile(name: String, bio: String, website: String) {
        withContext(Dispatchers.IO) {
            userDao.updateProfile("me", name, bio, website)
        }
    }

    suspend fun toggleLike(postId: String, currentLiked: Boolean, currentCount: Int) {
        withContext(Dispatchers.IO) {
            val newLiked = !currentLiked
            val newCount = if (newLiked) currentCount + 1 else maxOf(0, currentCount - 1)
            postDao.updateLike(postId, newLiked, newCount)

            // Sync with backend API asynchronously
            try {
                ApiClient.getApiService().likePost(postId)
            } catch (_: Exception) {
                // Maintained offline state in Room
            }
        }
    }

    suspend fun toggleSave(postId: String, currentSaved: Boolean) {
        withContext(Dispatchers.IO) {
            val newSaved = !currentSaved
            postDao.updateSaved(postId, newSaved)

            try {
                ApiClient.getApiService().savePost(postId)
            } catch (_: Exception) {
                // Maintained offline state in Room
            }
        }
    }

    suspend fun toggleReelLike(reelId: String, currentLiked: Boolean, currentCount: Int) {
        withContext(Dispatchers.IO) {
            val newLiked = !currentLiked
            val newCount = if (newLiked) currentCount + 1 else maxOf(0, currentCount - 1)
            reelDao.updateLike(reelId, newLiked, newCount)
        }
    }

    suspend fun addComment(postId: String, content: String) {
        withContext(Dispatchers.IO) {
            postDao.incrementCommentCount(postId)
            try {
                ApiClient.getApiService().addComment(postId, SendCommentRequest(content))
            } catch (_: Exception) {
                // Offline fallback
            }
        }
    }

    suspend fun createPost(caption: String, location: String, mediaUrl: String) {
        withContext(Dispatchers.IO) {
            val user = userDao.getUserProfile("me")
            val newPost = PostEntity(
                id = UUID.randomUUID().toString(),
                authorId = "me",
                username = user?.username ?: "alex_dev",
                displayName = user?.displayName ?: "Alex Rivera",
                avatarUrl = user?.avatarUrl ?: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                caption = caption,
                location = location.ifBlank { null },
                mediaType = "IMAGE",
                mediaUrlsJson = mediaUrl,
                likeCount = 0,
                commentCount = 0,
                isLiked = false,
                isSaved = false,
                isFollowing = false,
                createdAt = System.currentTimeMillis()
            )
            postDao.insertPost(newPost)

            try {
                ApiClient.getApiService().createPost(
                    CreatePostRequest(
                        caption = caption,
                        location = location,
                        mediaUrls = listOf(mediaUrl),
                        isPrivate = false
                    )
                )
            } catch (_: Exception) {
                // Persisted in Room
            }
        }
    }

    suspend fun createStory(textOverlay: String?, mediaUrl: String, bgColorHex: String) {
        withContext(Dispatchers.IO) {
            val user = userDao.getUserProfile("me")
            val story = StoryEntity(
                id = UUID.randomUUID().toString(),
                authorId = "me",
                username = user?.username ?: "alex_dev",
                displayName = user?.displayName ?: "Alex Rivera",
                avatarUrl = user?.avatarUrl ?: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                mediaUrl = mediaUrl,
                storyType = if (mediaUrl.isNotBlank()) "PHOTO" else "TEXT",
                textOverlay = textOverlay,
                bgColorHex = bgColorHex,
                isViewed = false,
                createdAt = System.currentTimeMillis(),
                expiresAt = System.currentTimeMillis() + 24 * 60 * 60 * 1000
            )
            storyDao.insertStory(story)
        }
    }

    suspend fun markStoryViewed(storyId: String) {
        withContext(Dispatchers.IO) {
            storyDao.markStoryViewed(storyId)
        }
    }

    suspend fun sendMessage(conversationId: String, text: String) {
        withContext(Dispatchers.IO) {
            val message = MessageEntity(
                id = UUID.randomUUID().toString(),
                conversationId = conversationId,
                senderId = "me",
                senderName = "Alex Rivera",
                text = text,
                mediaUrl = null,
                isDelivered = true,
                isRead = true,
                createdAt = System.currentTimeMillis()
            )
            messageDao.insertMessage(message)
        }
    }

    suspend fun reactMessage(messageId: String, emoji: String) {
        withContext(Dispatchers.IO) {
            messageDao.updateReaction(messageId, emoji)
        }
    }

    suspend fun markAllNotificationsRead() {
        withContext(Dispatchers.IO) {
            notificationDao.markAllAsRead()
        }
    }

    suspend fun seedInitialDataIfNeeded() {
        withContext(Dispatchers.IO) {
            val existing = postDao.getAllPosts().firstOrNull()
            if (!existing.isNullOrEmpty()) return@withContext

            // 1. Current user
            userDao.insertUser(
                UserProfileEntity(
                    id = "me",
                    username = "alex_dev",
                    displayName = "Alex Rivera",
                    avatarUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                    bio = "Android Architect & Creative Technologist 🚀 | Building SocialX with Jetpack Compose & Clean Architecture 💻",
                    website = "https://socialx.app/alex",
                    location = "San Francisco, CA",
                    followerCount = 2840,
                    followingCount = 412,
                    postCount = 18,
                    isPrivate = false,
                    isFollowing = false
                )
            )

            // 2. Initial Stories (24h expiring)
            val initialStories = listOf(
                StoryEntity(
                    id = "story-1",
                    authorId = "maya_lens",
                    username = "maya_lens",
                    displayName = "Maya Chen",
                    avatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
                    mediaUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
                    storyType = "PHOTO",
                    textOverlay = "Sunset flight to Tokyo ✈️✨",
                    bgColorHex = "#FF007A",
                    isViewed = false
                ),
                StoryEntity(
                    id = "story-2",
                    authorId = "serena_vibes",
                    username = "serena_vibes",
                    displayName = "Serena Vance",
                    avatarUrl = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200",
                    mediaUrl = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
                    storyType = "PHOTO",
                    textOverlay = "Coffee & Studio mornings ☕🎨",
                    bgColorHex = "#7928CA",
                    isViewed = false
                ),
                StoryEntity(
                    id = "story-3",
                    authorId = "liam_peaks",
                    username = "liam_peaks",
                    displayName = "Liam Scott",
                    avatarUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
                    mediaUrl = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
                    storyType = "PHOTO",
                    textOverlay = "Summit reached at 4:30 AM 🏔️",
                    bgColorHex = "#00DFD8",
                    isViewed = false
                )
            )
            storyDao.insertStories(initialStories)

            // 3. Initial Feed Posts
            val initialPosts = listOf(
                PostEntity(
                    id = "post-1",
                    authorId = "maya_lens",
                    username = "maya_lens",
                    displayName = "Maya Chen",
                    avatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
                    caption = "Lost in the golden light along the Amalfi coastline. There is magic in slowing down and watching the sea meet the horizon 🌊🌅 #amalfi #italy #travel #photography #goldenhour",
                    location = "Amalfi, Italy",
                    mediaType = "IMAGE",
                    mediaUrlsJson = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
                    likeCount = 384,
                    commentCount = 28,
                    isLiked = false,
                    isSaved = false,
                    isFollowing = true
                ),
                PostEntity(
                    id = "post-2",
                    authorId = "serena_vibes",
                    username = "serena_vibes",
                    displayName = "Serena Vance",
                    avatarUrl = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200",
                    caption = "Curating modern textures and Scandinavian aesthetics for our upcoming studio collection. Which palette is your favorite? 1, 2, or 3? 🎨 #design #interiors #aesthetic #creativestudio",
                    location = "Stockholm, Sweden",
                    mediaType = "IMAGE",
                    mediaUrlsJson = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
                    likeCount = 512,
                    commentCount = 47,
                    isLiked = true,
                    isSaved = true,
                    isFollowing = true
                ),
                PostEntity(
                    id = "post-3",
                    authorId = "liam_peaks",
                    username = "liam_peaks",
                    displayName = "Liam Scott",
                    avatarUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
                    caption = "Above the clouds in the Canadian Rockies. The crisp alpine breeze and stillness remind me why we hike 🏔️❄️ #outdoors #rockies #adventure #hiking",
                    location = "Banff National Park, Canada",
                    mediaType = "IMAGE",
                    mediaUrlsJson = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
                    likeCount = 829,
                    commentCount = 63,
                    isLiked = false,
                    isSaved = false,
                    isFollowing = false
                )
            )
            postDao.insertPosts(initialPosts)

            // 4. Initial Reels
            val initialReels = listOf(
                ReelEntity(
                    id = "reel-1",
                    authorId = "maya_lens",
                    username = "maya_lens",
                    displayName = "Maya Chen",
                    avatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
                    videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                    thumbnailUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
                    caption = "Cinematic golden hour drone flight along the coast 🌅 #drone #travel #cinematic",
                    audioTitle = "Ambient Sunset Beats - Maya Chen",
                    likeCount = 1420,
                    commentCount = 89,
                    isLiked = false,
                    isFollowing = true
                ),
                ReelEntity(
                    id = "reel-2",
                    authorId = "serena_vibes",
                    username = "serena_vibes",
                    displayName = "Serena Vance",
                    avatarUrl = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200",
                    videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                    thumbnailUrl = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
                    caption = "How I organize my minimal workspace for maximum flow state 💡 #desksetup #workspace",
                    audioTitle = "Lo-Fi Focus Vibes - Serena Vance",
                    likeCount = 2890,
                    commentCount = 143,
                    isLiked = true,
                    isFollowing = true
                )
            )
            reelDao.insertReels(initialReels)

            // 5. Initial Messages
            val initialMessages = listOf(
                MessageEntity(
                    id = "msg-1",
                    conversationId = "conv-maya",
                    senderId = "maya_lens",
                    senderName = "Maya Chen",
                    text = "Hey Alex! Loved your latest post on mobile architecture!",
                    mediaUrl = null,
                    isDelivered = true,
                    isRead = true,
                    createdAt = System.currentTimeMillis() - 3600000
                ),
                MessageEntity(
                    id = "msg-2",
                    conversationId = "conv-maya",
                    senderId = "me",
                    senderName = "Alex Rivera",
                    text = "Thank you Maya! Your Amalfi photos look unreal, what lens did you use?",
                    mediaUrl = null,
                    isDelivered = true,
                    isRead = true,
                    createdAt = System.currentTimeMillis() - 1800000
                ),
                MessageEntity(
                    id = "msg-3",
                    conversationId = "conv-maya",
                    senderId = "maya_lens",
                    senderName = "Maya Chen",
                    text = "A 24-70mm f/2.8! Golden hour did all the heavy lifting 🙌",
                    mediaUrl = null,
                    isDelivered = true,
                    isRead = false,
                    createdAt = System.currentTimeMillis() - 600000
                )
            )
            messageDao.insertMessages(initialMessages)

            // 6. Initial Notifications
            val initialNotifications = listOf(
                NotificationEntity(
                    id = "notif-1",
                    actorName = "Maya Chen",
                    actorAvatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
                    type = "LIKE",
                    message = "liked your post about Jetpack Compose.",
                    entityId = "post-1",
                    isRead = false,
                    createdAt = System.currentTimeMillis() - 1200000
                ),
                NotificationEntity(
                    id = "notif-2",
                    actorName = "Serena Vance",
                    actorAvatarUrl = "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200",
                    type = "COMMENT",
                    message = "commented: \"Super clean architecture!\"",
                    entityId = "post-1",
                    isRead = false,
                    createdAt = System.currentTimeMillis() - 3600000
                ),
                NotificationEntity(
                    id = "notif-3",
                    actorName = "Liam Scott",
                    actorAvatarUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
                    type = "FOLLOW",
                    message = "started following you.",
                    entityId = null,
                    isRead = true,
                    createdAt = System.currentTimeMillis() - 86400000
                )
            )
            notificationDao.insertNotifications(initialNotifications)
        }
    }
}
