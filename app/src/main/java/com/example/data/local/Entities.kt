package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "posts")
data class PostEntity(
    @PrimaryKey val id: String,
    val authorId: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String?,
    val caption: String?,
    val location: String?,
    val mediaType: String, // "IMAGE", "VIDEO", "CAROUSEL"
    val mediaUrlsJson: String, // comma separated or single url
    val likeCount: Int,
    val commentCount: Int,
    val isLiked: Boolean,
    val isSaved: Boolean,
    val isFollowing: Boolean,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "stories")
data class StoryEntity(
    @PrimaryKey val id: String,
    val authorId: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String?,
    val mediaUrl: String,
    val storyType: String, // "PHOTO", "TEXT"
    val textOverlay: String?,
    val bgColorHex: String,
    val isViewed: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val expiresAt: Long = System.currentTimeMillis() + 24 * 60 * 60 * 1000
)

@Entity(tableName = "reels")
data class ReelEntity(
    @PrimaryKey val id: String,
    val authorId: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String?,
    val videoUrl: String,
    val thumbnailUrl: String,
    val caption: String?,
    val audioTitle: String,
    val likeCount: Int,
    val commentCount: Int,
    val isLiked: Boolean,
    val isFollowing: Boolean,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String,
    val text: String?,
    val mediaUrl: String?,
    val isDelivered: Boolean = true,
    val isRead: Boolean = false,
    val reactionEmoji: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "notifications")
data class NotificationEntity(
    @PrimaryKey val id: String,
    val actorName: String,
    val actorAvatarUrl: String?,
    val type: String, // "LIKE", "COMMENT", "FOLLOW", "MENTION"
    val message: String,
    val entityId: String?,
    val isRead: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "user_profiles")
data class UserProfileEntity(
    @PrimaryKey val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String?,
    val bio: String?,
    val website: String?,
    val location: String?,
    val followerCount: Int,
    val followingCount: Int,
    val postCount: Int,
    val isPrivate: Boolean,
    val isFollowing: Boolean
)
