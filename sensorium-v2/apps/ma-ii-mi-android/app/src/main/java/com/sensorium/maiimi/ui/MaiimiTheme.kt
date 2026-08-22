package com.sensorium.maiimi.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val MaiimiColors = darkColorScheme(
    primary = Color(0xFF79F3D4),
    onPrimary = Color(0xFF06201D),
    primaryContainer = Color(0xFF103A34),
    onPrimaryContainer = Color(0xFFC8FFF2),
    secondary = Color(0xFFB6A2FF),
    tertiary = Color(0xFFFFC36E),
    background = Color(0xFF061614),
    surface = Color(0xFF0C2421),
    surfaceVariant = Color(0xFF14332F),
    onBackground = Color(0xFFE5FBF5),
    onSurface = Color(0xFFE5FBF5),
    onSurfaceVariant = Color(0xFFABC9C0),
    outline = Color(0xFF48675E),
    error = Color(0xFFFFB4AB),
)

@Composable
fun MaiimiTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = MaiimiColors, content = content)
}
