# FFmpeg Setup for YouTube Streaming

The YouTube streaming feature requires FFmpeg to be installed on your system.

## Windows Installation

### Option 1: Download from Official Website
1. Go to https://ffmpeg.org/download.html
2. Click on "Windows" and then "Windows builds by BtbN"
3. Download the latest release (ffmpeg-master-latest-win64-gpl.zip)
4. Extract the zip file to `C:\ffmpeg`
5. Add `C:\ffmpeg\bin` to your system PATH:
   - Open System Properties → Advanced → Environment Variables
   - Edit the "Path" variable in System Variables
   - Add `C:\ffmpeg\bin`
   - Restart your terminal/command prompt

### Option 2: Using Chocolatey
```powershell
# Install Chocolatey if you haven't already
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install FFmpeg
choco install ffmpeg
```

### Option 3: Using Winget
```powershell
winget install FFmpeg
```

## macOS Installation

### Using Homebrew
```bash
# Install Homebrew if you haven't already
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install FFmpeg
brew install ffmpeg
```

## Linux Installation

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg
```

### CentOS/RHEL/Fedora
```bash
# CentOS/RHEL
sudo yum install ffmpeg

# Fedora
sudo dnf install ffmpeg
```

## Verify Installation

After installation, verify FFmpeg is working:

```bash
ffmpeg -version
```

You should see FFmpeg version information and available codecs.

## Troubleshooting

### Common Issues

1. **"ffmpeg command not found"**
   - Make sure FFmpeg is installed and in your system PATH
   - Restart your terminal after installation
   - On Windows, make sure you added the `bin` folder to PATH
   
   **Quick fix for VS Code on Windows:**
   ```powershell
   # Check if FFmpeg is installed but not in PATH
   Test-Path "C:\ffmpeg\bin\ffmpeg.exe"
   
   # If true, add to current session
   $env:PATH += ";C:\ffmpeg\bin"
   
   # Test FFmpeg
   ffmpeg -version
   ```
   
   **Permanent fix:** Add `C:\ffmpeg\bin` to your system PATH through Windows Environment Variables
   
   **Alternative permanent fix using PowerShell (Run as Administrator):**
   ```powershell
   # Add FFmpeg to system PATH permanently
   $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
   if ($currentPath -notlike "*C:\ffmpeg\bin*") {
       [Environment]::SetEnvironmentVariable("PATH", $currentPath + ";C:\ffmpeg\bin", "Machine")
       Write-Host "FFmpeg added to system PATH. Please restart VS Code."
   }
   ```

2. **"Permission denied"**
   - On Linux/macOS, you might need to use `sudo` for installation
   - Make sure the FFmpeg binary has execute permissions

3. **Codec issues**
   - Make sure you downloaded the "GPL" version which includes all codecs
   - The "LGPL" version has limited codec support

### Testing YouTube Streaming

Once FFmpeg is installed, you can test the YouTube streaming feature:

1. Start your FinalCast session
2. Click "Go Live" button
3. Enter your YouTube RTMP URL and stream key
4. The system should now successfully stream to YouTube

## Additional Notes

- FFmpeg is used to encode and stream video to YouTube's RTMP servers
- The application will show an error if FFmpeg is not available
- You can check the backend logs for detailed FFmpeg output during streaming
