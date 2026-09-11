package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.ui.theme.BrandCyan
import com.example.ui.theme.BrandMagenta
import com.example.ui.theme.BrandPurple

@Composable
fun CreateScreen(
    onCreatePost: (caption: String, location: String, mediaUrl: String) -> Unit,
    onCreateStory: (text: String, mediaUrl: String, bgColorHex: String) -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) } // 0: Post, 1: Story

    // Preset curated photo samples for instant testing
    val sampleImages = listOf(
        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800",
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800"
    )

    var selectedImageUrl by remember { mutableStateOf(sampleImages[0]) }
    var customUrlInput by remember { mutableStateOf("") }
    var caption by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }

    // Story state
    var storyText by remember { mutableStateOf("") }
    var selectedStoryBg by remember { mutableStateOf("#FF007A") }
    val storyColors = listOf("#FF007A", "#7928CA", "#00DFD8", "#1E1E2E", "#FF8A00")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
            .testTag("create_screen")
    ) {
        // Tab Selector (Post vs Story)
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = BrandMagenta,
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("New Post", fontWeight = FontWeight.Bold) },
                modifier = Modifier.testTag("tab_new_post")
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("24h Story", fontWeight = FontWeight.Bold) },
                modifier = Modifier.testTag("tab_new_story")
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (selectedTab == 0) {
            // --- NEW POST MODE ---
            Text(
                text = "Select Photo / Media",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Large preview
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1.2f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.DarkGray)
            ) {
                AsyncImage(
                    model = if (customUrlInput.isNotBlank()) customUrlInput else selectedImageUrl,
                    contentDescription = "Selected media preview",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Presets row
            Text(text = "Quick Presets:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(6.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(sampleImages) { url ->
                    val isSelected = selectedImageUrl == url && customUrlInput.isBlank()
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .border(
                                width = if (isSelected) 2.5.dp else 1.dp,
                                color = if (isSelected) BrandMagenta else MaterialTheme.colorScheme.outline,
                                shape = RoundedCornerShape(8.dp)
                            )
                            .clickable {
                                selectedImageUrl = url
                                customUrlInput = ""
                            }
                    ) {
                        AsyncImage(
                            model = url,
                            contentDescription = "Preset image",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Caption
            OutlinedTextField(
                value = caption,
                onValueChange = { caption = it },
                label = { Text("Write a caption (#tags, @mentions)...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("create_caption_input"),
                shape = RoundedCornerShape(12.dp),
                maxLines = 4
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Location
            OutlinedTextField(
                value = location,
                onValueChange = { location = it },
                label = { Text("Add Location") },
                leadingIcon = {
                    Icon(imageVector = Icons.Default.LocationOn, contentDescription = "Location", tint = BrandCyan)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("create_location_input"),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Publish Button
            Button(
                onClick = {
                    val finalUrl = if (customUrlInput.isNotBlank()) customUrlInput else selectedImageUrl
                    onCreatePost(caption, location, finalUrl)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("publish_post_button"),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandMagenta)
            ) {
                Text("Share to SocialX", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
            }
        } else {
            // --- STORY MODE ---
            Text(
                text = "Story Preview",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Story Card Preview
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(android.graphics.Color.parseColor(selectedStoryBg))),
                contentAlignment = Alignment.Center
            ) {
                if (selectedImageUrl.isNotBlank() && customUrlInput.isNotBlank()) {
                    AsyncImage(
                        model = customUrlInput,
                        contentDescription = "Story preview",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }

                Text(
                    text = if (storyText.isNotBlank()) storyText else "Your story text goes here ✨",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier.padding(24.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Story Text
            OutlinedTextField(
                value = storyText,
                onValueChange = { storyText = it },
                label = { Text("Story Message / Overlay") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("create_story_text_input"),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Color Palette Picker
            Text(text = "Background Color:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                storyColors.forEach { hex ->
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(android.graphics.Color.parseColor(hex)))
                            .border(
                                width = if (selectedStoryBg == hex) 2.5.dp else 1.dp,
                                color = if (selectedStoryBg == hex) Color.White else Color.Transparent,
                                shape = RoundedCornerShape(8.dp)
                            )
                            .clickable { selectedStoryBg = hex },
                        contentAlignment = Alignment.Center
                    ) {
                        if (selectedStoryBg == hex) {
                            Icon(imageVector = Icons.Default.Check, contentDescription = "Selected", tint = Color.White)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Publish Story
            Button(
                onClick = {
                    val finalUrl = if (customUrlInput.isNotBlank()) customUrlInput else ""
                    onCreateStory(storyText, finalUrl, selectedStoryBg)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("publish_story_button"),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandPurple)
            ) {
                Text("Share to Your Story (24h)", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(80.dp))
    }
}
