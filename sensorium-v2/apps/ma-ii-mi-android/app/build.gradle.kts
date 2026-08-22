plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Optional local override keeps large intermediates off a constrained system volume.
providers.environmentVariable("SENSORIUM_ANDROID_BUILD_ROOT").orNull?.let { buildRoot ->
    layout.buildDirectory.set(file(buildRoot).resolve("ma-ii-mi-app"))
}

android {
    namespace = "com.sensorium.maiimi"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.sensorium.maiimi"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0-demo"
    }

    buildFeatures { compose = true; buildConfig = true }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
}
