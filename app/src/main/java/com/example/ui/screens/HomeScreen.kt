package com.example.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.data.local.PostEntity
import com.example.data.local.StoryEntity
import com.example.ui.components.PostCard
import com.example.ui.components.StoriesTray

@Composable
fun HomeScreen(
    posts: List<PostEntity>,
    stories: List<StoryEntity>,
    userAvatarUrl: String?,
    onAddStoryClick: () -> Unit,
    onStoryClick: (StoryEntity) -> Unit,
    onToggleLike: (PostEntity) -> Unit,
    onToggleSave: (PostEntity) -> Unit,
    onOpenComments: (PostEntity) -> Unit,
    onUserClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("home_feed_list")
    ) {
        // Top 24-hour stories tray
        item {
            StoriesTray(
                stories = stories,
                userAvatarUrl = userAvatarUrl,
                onAddStoryClick = onAddStoryClick,
                onStoryClick = onStoryClick
            )
            Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), thickness = 0.5.dp)
        }

        // Post cards
        items(posts, key = { it.id }) { post ->
            PostCard(
                post = post,
                onToggleLike = { onToggleLike(post) },
                onToggleSave = { onToggleSave(post) },
                onOpenComments = { onOpenComments(post) },
                onShare = { /* Share intent */ },
                onUserClick = onUserClick
            )
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}
