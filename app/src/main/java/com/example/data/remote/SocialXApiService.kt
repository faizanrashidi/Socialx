package com.example.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface SocialXApiService {
    @POST("auth/login")
    suspend fun login(@Body req: LoginRequest): Response<AuthResponse>

    @POST("auth/register")
    suspend fun register(@Body req: RegisterRequest): Response<AuthResponse>

    @GET("posts/feed")
    suspend fun getFeed(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10
    ): Response<FeedResponse>

    @POST("posts")
    suspend fun createPost(@Body req: CreatePostRequest): Response<PostDto>

    @POST("posts/{id}/like")
    suspend fun likePost(@Path("id") postId: String): Response<LikeResponse>

    @POST("posts/{id}/save")
    suspend fun savePost(@Path("id") postId: String): Response<SaveResponse>

    @POST("posts/{id}/comments")
    suspend fun addComment(
        @Path("id") postId: String,
        @Body req: SendCommentRequest
    ): Response<CommentItemDto>
}
