package com.example.data.remote

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(
    val login: String,
    val password: String
)

@JsonClass(generateAdapter = true)
data class RegisterRequest(
    val email: String,
    val username: String,
    val password: String,
    val displayName: String
)

@JsonClass(generateAdapter = true)
data class AuthResponse(
    val accessToken: String?,
    val refreshToken: String?,
    val error: String?
)

@JsonClass(generateAdapter = true)
data class FeedResponse(
    val posts: List<PostDto>?,
    val page: Int?,
    val hasMore: Boolean?
)

@JsonClass(generateAdapter = true)
data class PostDto(
    val id: String,
    val authorId: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String?,
    val caption: String?,
    val location: String?,
    val mediaType: String,
    val likeCount: Int,
    val commentCount: Int,
    val isLiked: Boolean,
    val isSaved: Boolean,
    val isFollowing: Boolean
)

@JsonClass(generateAdapter = true)
data class CreatePostRequest(
    val caption: String?,
    val location: String?,
    val mediaUrls: List<String>,
    val isPrivate: Boolean
)

@JsonClass(generateAdapter = true)
data class LikeResponse(
    val liked: Boolean
)

@JsonClass(generateAdapter = true)
data class SaveResponse(
    val saved: Boolean
)

@JsonClass(generateAdapter = true)
data class CommentItemDto(
    val id: String,
    val authorName: String,
    val content: String,
    val createdAt: String
)

@JsonClass(generateAdapter = true)
data class SendCommentRequest(
    val content: String
)
