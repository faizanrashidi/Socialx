package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.*
import com.example.data.remote.ApiClient
import com.example.data.repository.SocialRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class SocialXViewModel(application: Application) : AndroidViewModel(application) {
    private val database = SocialXDatabase.getInstance(application)
    private val repository = SocialRepository(database, application)

    val posts: StateFlow<List<PostEntity>> = repository.allPosts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val savedPosts: StateFlow<List<PostEntity>> = repository.savedPosts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val stories: StateFlow<List<StoryEntity>> = repository.activeStories
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val reels: StateFlow<List<ReelEntity>> = repository.allReels
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val notifications: StateFlow<List<NotificationEntity>> = repository.notifications
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _activeConversationId = MutableStateFlow("conv-maya")
    val activeConversationId: StateFlow<String> = _activeConversationId.asStateFlow()

    val currentMessages: StateFlow<List<MessageEntity>> = _activeConversationId
        .flatMapLatest { convId -> repository.getMessages(convId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _currentUserProfile = MutableStateFlow<UserProfileEntity?>(null)
    val currentUserProfile: StateFlow<UserProfileEntity?> = _currentUserProfile.asStateFlow()

    private val _activeStory = MutableStateFlow<StoryEntity?>(null)
    val activeStory: StateFlow<StoryEntity?> = _activeStory.asStateFlow()

    private val _activeCommentPost = MutableStateFlow<PostEntity?>(null)
    val activeCommentPost: StateFlow<PostEntity?> = _activeCommentPost.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _serverUrl = MutableStateFlow(ApiClient.getBaseUrl())
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    init {
        ApiClient.initialize(application)
        viewModelScope.launch {
            repository.seedInitialDataIfNeeded()
            loadUserProfile()
        }
    }

    private fun loadUserProfile() {
        viewModelScope.launch {
            _currentUserProfile.value = repository.getUserProfile("me")
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun onToggleLike(post: PostEntity) {
        viewModelScope.launch {
            repository.toggleLike(post.id, post.isLiked, post.likeCount)
        }
    }

    fun onToggleSave(post: PostEntity) {
        viewModelScope.launch {
            repository.toggleSave(post.id, post.isSaved)
        }
    }

    fun onToggleReelLike(reel: ReelEntity) {
        viewModelScope.launch {
            repository.toggleReelLike(reel.id, reel.isLiked, reel.likeCount)
        }
    }

    fun onOpenComments(post: PostEntity) {
        _activeCommentPost.value = post
    }

    fun onCloseComments() {
        _activeCommentPost.value = null
    }

    fun onAddComment(postId: String, text: String) {
        if (text.isBlank()) return
        viewModelScope.launch {
            repository.addComment(postId, text)
        }
    }

    fun onCreatePost(caption: String, location: String, mediaUrl: String, onComplete: () -> Unit) {
        viewModelScope.launch {
            repository.createPost(caption, location, mediaUrl)
            loadUserProfile()
            onComplete()
        }
    }

    fun onCreateStory(text: String, mediaUrl: String, bgColorHex: String, onComplete: () -> Unit) {
        viewModelScope.launch {
            repository.createStory(text.ifBlank { null }, mediaUrl, bgColorHex)
            onComplete()
        }
    }

    fun onSelectStory(story: StoryEntity) {
        _activeStory.value = story
        viewModelScope.launch {
            repository.markStoryViewed(story.id)
        }
    }

    fun onCloseStory() {
        _activeStory.value = null
    }

    fun onSendMessage(text: String) {
        if (text.isBlank()) return
        viewModelScope.launch {
            repository.sendMessage(_activeConversationId.value, text)
        }
    }

    fun onReactMessage(messageId: String, emoji: String) {
        viewModelScope.launch {
            repository.reactMessage(messageId, emoji)
        }
    }

    fun onMarkAllNotificationsRead() {
        viewModelScope.launch {
            repository.markAllNotificationsRead()
        }
    }

    fun onUpdateProfile(name: String, bio: String, website: String) {
        viewModelScope.launch {
            repository.updateProfile(name, bio, website)
            loadUserProfile()
        }
    }

    fun onUpdateServerUrl(newUrl: String) {
        ApiClient.updateBaseUrl(getApplication(), newUrl)
        _serverUrl.value = ApiClient.getBaseUrl()
    }
}
