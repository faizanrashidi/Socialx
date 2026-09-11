package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.components.CommentBottomSheet
import com.example.ui.components.SocialXTopBar
import com.example.ui.components.StoryViewerDialog
import com.example.ui.screens.*
import com.example.ui.theme.BrandMagenta
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.SocialXViewModel

sealed class AppScreen(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    object Home : AppScreen("home", "Feed", Icons.Filled.Home, Icons.Outlined.Home)
    object Explore : AppScreen("explore", "Explore", Icons.Filled.Search, Icons.Outlined.Search)
    object Create : AppScreen("create", "Create", Icons.Filled.AddBox, Icons.Outlined.AddBox)
    object Reels : AppScreen("reels", "Reels", Icons.Filled.PlayCircle, Icons.Outlined.PlayCircle)
    object Profile : AppScreen("profile", "Profile", Icons.Filled.AccountCircle, Icons.Outlined.AccountCircle)
}

class MainActivity : ComponentActivity() {
    private val viewModel: SocialXViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                SocialXApp(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun SocialXApp(viewModel: SocialXViewModel) {
    var currentScreen by remember { mutableStateOf<AppScreen>(AppScreen.Home) }
    var activeSubScreen by remember { mutableStateOf<String?>(null) } // "messages", "notifications"

    val posts by viewModel.posts.collectAsStateWithLifecycle()
    val savedPosts by viewModel.savedPosts.collectAsStateWithLifecycle()
    val stories by viewModel.stories.collectAsStateWithLifecycle()
    val reels by viewModel.reels.collectAsStateWithLifecycle()
    val notifications by viewModel.notifications.collectAsStateWithLifecycle()
    val messages by viewModel.currentMessages.collectAsStateWithLifecycle()
    val userProfile by viewModel.currentUserProfile.collectAsStateWithLifecycle()
    val activeStory by viewModel.activeStory.collectAsStateWithLifecycle()
    val activeCommentPost by viewModel.activeCommentPost.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val serverUrl by viewModel.serverUrl.collectAsStateWithLifecycle()

    val navItems = listOf(
        AppScreen.Home,
        AppScreen.Explore,
        AppScreen.Create,
        AppScreen.Reels,
        AppScreen.Profile
    )

    val unreadNotifs = remember(notifications) {
        notifications.count { !it.isRead }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            if (activeSubScreen == null && currentScreen != AppScreen.Reels && currentScreen != AppScreen.Profile) {
                SocialXTopBar(
                    unreadNotifications = unreadNotifs,
                    onOpenMessages = { activeSubScreen = "messages" },
                    onOpenNotifications = { activeSubScreen = "notifications" }
                )
            }
        },
        bottomBar = {
            if (activeSubScreen == null) {
                NavigationBar(
                    modifier = Modifier.testTag("main_bottom_nav"),
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 6.dp
                ) {
                    navItems.forEach { item ->
                        val selected = currentScreen == item
                        NavigationBarItem(
                            selected = selected,
                            onClick = { currentScreen = item },
                            icon = {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = item.title
                                )
                            },
                            label = { Text(item.title) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = BrandMagenta,
                                indicatorColor = BrandMagenta.copy(alpha = 0.15f)
                            ),
                            modifier = Modifier.testTag("nav_${item.route}")
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (activeSubScreen) {
                "messages" -> {
                    MessagesScreen(
                        messages = messages,
                        onSendMessage = { text -> viewModel.onSendMessage(text) },
                        onReactMessage = { msgId, emoji -> viewModel.onReactMessage(msgId, emoji) },
                        onBack = { activeSubScreen = null }
                    )
                }
                "notifications" -> {
                    NotificationsScreen(
                        notifications = notifications,
                        onMarkAllRead = { viewModel.onMarkAllNotificationsRead() },
                        onBack = { activeSubScreen = null }
                    )
                }
                else -> {
                    when (currentScreen) {
                        AppScreen.Home -> {
                            HomeScreen(
                                posts = posts,
                                stories = stories,
                                userAvatarUrl = userProfile?.avatarUrl,
                                onAddStoryClick = { currentScreen = AppScreen.Create },
                                onStoryClick = { story -> viewModel.onSelectStory(story) },
                                onToggleLike = { post -> viewModel.onToggleLike(post) },
                                onToggleSave = { post -> viewModel.onToggleSave(post) },
                                onOpenComments = { post -> viewModel.onOpenComments(post) },
                                onUserClick = { currentScreen = AppScreen.Profile }
                            )
                        }
                        AppScreen.Explore -> {
                            ExploreScreen(
                                posts = posts,
                                searchQuery = searchQuery,
                                onQueryChange = { q -> viewModel.onSearchQueryChange(q) },
                                onPostClick = { post -> viewModel.onOpenComments(post) }
                            )
                        }
                        AppScreen.Create -> {
                            CreateScreen(
                                onCreatePost = { caption, location, mediaUrl ->
                                    viewModel.onCreatePost(caption, location, mediaUrl) {
                                        currentScreen = AppScreen.Home
                                    }
                                },
                                onCreateStory = { text, mediaUrl, bgHex ->
                                    viewModel.onCreateStory(text, mediaUrl, bgHex) {
                                        currentScreen = AppScreen.Home
                                    }
                                }
                            )
                        }
                        AppScreen.Reels -> {
                            ReelsScreen(
                                reels = reels,
                                onToggleLike = { reel -> viewModel.onToggleReelLike(reel) }
                            )
                        }
                        AppScreen.Profile -> {
                            ProfileScreen(
                                userProfile = userProfile,
                                userPosts = posts.filter { it.authorId == "me" || it.username == "alex_dev" },
                                savedPosts = savedPosts,
                                serverUrl = serverUrl,
                                onUpdateProfile = { name, bio, web -> viewModel.onUpdateProfile(name, bio, web) },
                                onUpdateServerUrl = { url -> viewModel.onUpdateServerUrl(url) }
                            )
                        }
                    }
                }
            }
        }
    }

    // Active Story Viewer Dialog
    activeStory?.let { story ->
        StoryViewerDialog(
            story = story,
            onClose = { viewModel.onCloseStory() },
            onReaction = { /* React */ }
        )
    }

    // Active Comments Bottom Sheet
    activeCommentPost?.let { post ->
        CommentBottomSheet(
            post = post,
            onDismiss = { viewModel.onCloseComments() },
            onPostComment = { text -> viewModel.onAddComment(post.id, text) }
        )
    }
}
