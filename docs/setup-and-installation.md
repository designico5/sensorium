# Setup and Installation Guide

## Sensorium Bridge Matrix v2.5.0

This guide will help you set up and install the Sensorium Bridge Matrix - a comprehensive MIDI diagnostic and production management system for Ableton Live integration.

## Prerequisites

### System Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Node.js**: Version 18.0 or higher
- **Python**: Version 3.11+ (for audio processing modules)
- **Ableton Live**: Version 12 with Remote Script support
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: 500MB free disk space

### Required Software

- Node.js and npm
- Python 3.11+ with pip
- Git (for cloning the repository)
- Ableton Live 12

## Installation Methods

### Method 1: Development Setup (Recommended for Developers)

#### Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/sensorium-midi-ableton-diagnostician.git
cd sensorium-midi-ableton-diagnostician
```

#### Step 2: Install Dependencies

```bash
npm install
```

This will install all required Node.js dependencies including:
- React 19.0.1
- D3.js for data visualization
- Motion for animations
- Express for the web server
- Tailwind CSS for styling

#### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

Required Python packages:
- librosa (audio analysis)
- essentia (audio feature extraction)
- madmom (BPM detection)
- demucs (stem separation)

#### Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
OSC_PORT=5125
```

Get your Gemini API key from [AI Studio](https://ai.studio/).

#### Step 5: Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Method 2: Standalone Executable (Windows)

**Not available yet.** The GitHub Releases page is the only approved source for a Windows binary. Do not run an unsigned or unverified executable, do not add a Defender exclusion, and do not start the application as Administrator. This section becomes active only after the signed artifact, checksum, provenance, installer smoke test, and rollback test are published.

### Method 3: Web Deployment

#### Step 1: Build the Application

```bash
npm run build
```

#### Step 2: Start the Production Server

```bash
npm start
```

The production server will run on the configured port (default: 3000).

## Ableton Live Integration

### Step 1: Install Remote Script

The SetupGuide component will automatically install the remote script, or you can do it manually:

1. Navigate to your Ableton User Library:
   - Windows: `%USERPROFILE%\Documents\Ableton\User Library\MIDI Remote Scripts`
   - macOS: `~/Documents/Ableton/User Library/MIDI Remote Scripts`

2. Copy the `Sensorium.py` file to this directory

3. Restart Ableton Live

### Step 2: Configure MIDI Ports

1. Open Ableton Live Preferences
2. Go to the MIDI/Sync tab
3. Enable "Track" and "Sync" for your MIDI controllers
4. Select "Sensorium" as the Control Surface

### Step 3: Verify Connection

1. Open the Sensorium web interface
2. Check the "Remote Script Status" indicator
3. It should show "CONNECTED" in green

## Troubleshooting

### Common Issues

#### MIDI Devices Not Detected

**Problem**: MIDI devices are not showing up in the interface.

**Solution**:
1. Verify devices are connected and powered on
2. Check Windows Device Manager for MIDI driver issues
3. Restart the Sensorium application
4. Try a different USB port

#### High Latency Detected

**Problem**: Latency readings are above 10ms.

**Solution**:
1. Increase buffer size in your audio interface settings
2. Disable power saving on USB ports
3. Close other applications using audio
4. Use the Latency Safety Buffer feature in Sensorium

#### Remote Script Not Connecting

**Problem**: Ableton shows "DISCONNECTED" for remote script.

**Solution**:
1. Verify Sensorium.py is in the correct directory
2. Check Ableton Log.txt for errors
3. Ensure Ableton Live 12 is running
4. Restart both Ableton and Sensorium

#### OSC Communication Failed

**Problem**: OSC messages are not being received.

**Solution**:
1. Check firewall settings for port 5125
2. Verify localhost is not blocked
3. Check the OSC_PORT environment variable
4. Restart the application

### Performance Optimization

#### Reduce CPU Usage

1. Disable ML segmentation when not needed
2. Reduce polling rate for USB monitoring
3. Close unused visualization widgets
4. Enable high-performance mode in settings

#### Reduce Memory Usage

1. Limit latency history length
2. Disable 3D spatial views
3. Clear old system logs
4. Use the minimal dashboard layout

## Uninstallation

### Development Setup

```bash
# Remove node_modules
rm -rf node_modules

# Remove build files
npm run clean

# Remove Python virtual environment (if used)
deactivate
rm -rf venv
```

### Standalone Executable

1. Close the application
2. Delete the Sensorium folder
3. Remove Windows Defender exclusion
4. Delete Ableton Remote Script from MIDI Remote Scripts folder

## Updating

### Development Setup

```bash
git pull origin main
npm install
npm run build
```

### Standalone Executable

1. Download the new version
2. Extract to a new folder
3. Copy your configuration files from the old folder
4. Delete the old version

## Support

For issues and questions:
- GitHub Issues: [repository/issues](https://github.com/your-repo/sensorium-midi-ableton-diagnostician/issues)
- Documentation: [docs/](./)
- Email: icon.maedler@gmail.com

## License

Proprietary & Confidential Engine Architecture
Copyright (c) 2026 Nico Maedler. All Rights Reserved.
