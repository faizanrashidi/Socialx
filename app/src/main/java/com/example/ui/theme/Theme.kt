package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = BrandMagenta,
    onPrimary = Color.White,
    primaryContainer = BrandPurple,
    onPrimaryContainer = Color.White,
    secondary = BrandCyan,
    onSecondary = Color.Black,
    secondaryContainer = Color(0xFF003837),
    onSecondaryContainer = BrandCyan,
    tertiary = BrandPurple,
    background = SocialXDarkBackground,
    onBackground = TextPrimaryDark,
    surface = SocialXDarkSurface,
    onSurface = TextPrimaryDark,
    surfaceVariant = SocialXDarkSurfaceVariant,
    onSurfaceVariant = TextSecondaryDark,
    outline = SocialXDarkBorder
)

private val LightColorScheme = lightColorScheme(
    primary = BrandMagenta,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFD9E6),
    secondary = Color(0xFF007A76),
    onSecondary = Color.White,
    tertiary = BrandPurple,
    background = SocialXLightBackground,
    onBackground = Color(0xFF1B1B1F),
    surface = SocialXLightSurface,
    onSurface = Color(0xFF1B1B1F),
    surfaceVariant = SocialXLightSurfaceVariant,
    onSurfaceVariant = Color(0xFF47464F),
    outline = Color(0xFFC7C5D0)
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Use our signature theme by default for distinctive branding
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
