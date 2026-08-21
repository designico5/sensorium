// Prevents additional console window on Windows in release, DO NOT USE IN DEBUG
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    sensorium_v2_tauri::run();
}