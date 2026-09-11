package com.example.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// SocialX Signature Brand Palette
val BrandMagenta = Color(0xFFFF007A)
val BrandPurple = Color(0xFF7928CA)
val BrandCyan = Color(0xFF00DFD8)

val SocialXDarkBackground = Color(0xFF0C0916)
val SocialXDarkSurface = Color(0xFF161224)
val SocialXDarkSurfaceVariant = Color(0xFF221D36)
val SocialXDarkBorder = Color(0xFF2E2749)

val SocialXLightBackground = Color(0xFFF7F8FC)
val SocialXLightSurface = Color(0xFFFFFFFF)
val SocialXLightSurfaceVariant = Color(0xFFECEFF8)

val TextPrimaryDark = Color(0xFFFFFFFF)
val TextSecondaryDark = Color(0xFFA5A1BA)
val TextMutedDark = Color(0xFF716C8A)

val BrandGradient = Brush.linearGradient(
    colors = listOf(BrandMagenta, BrandPurple, BrandCyan)
)

val StoryGradient = Brush.sweepGradient(
    colors = listOf(BrandMagenta, Color(0xFFFF8A00), BrandPurple, BrandCyan, BrandMagenta)
)
