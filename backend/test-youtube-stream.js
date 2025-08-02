#!/usr/bin/env node

/**
 * YouTube Streaming Test Script
 * 
 * This script helps debug YouTube streaming issues by:
 * 1. Testing FFmpeg availability
 * 2. Testing RTMP connection to YouTube
 * 3. Sending a test stream to verify configuration
 * 
 * Usage: node test-youtube-stream.js <rtmp_url> <stream_key>
 */

import { spawn } from 'child_process';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node test-youtube-stream.js <rtmp_url> <stream_key>');
  console.log('Example: node test-youtube-stream.js rtmp://a.rtmp.youtube.com/live2 your-stream-key');
  process.exit(1);
}

const [rtmpUrl, streamKey] = args;
const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;

console.log('🧪 YouTube Streaming Test Script');
console.log('================================');
console.log(`📡 RTMP URL: ${rtmpUrl}`);
console.log(`🔑 Stream Key: ${streamKey.substring(0, 8)}...`);
console.log(`🎯 Full URL: ${rtmpUrl}/${streamKey.substring(0, 8)}...`);
console.log('');

// Test 1: Check FFmpeg availability
async function testFFmpegAvailability() {
  console.log('1️⃣ Testing FFmpeg availability...');
  
  return new Promise((resolve, reject) => {
    const ffmpegTest = spawn('ffmpeg', ['-version']);
    
    ffmpegTest.on('close', (code) => {
      if (code === 0) {
        console.log('   ✅ FFmpeg is available');
        resolve(true);
      } else {
        console.log('   ❌ FFmpeg test failed');
        reject(new Error(`FFmpeg test failed with code ${code}`));
      }
    });
    
    ffmpegTest.on('error', (error) => {
      if (error.code === 'ENOENT') {
        console.log('   ❌ FFmpeg is not installed or not in PATH');
        reject(new Error('FFmpeg is not installed or not in PATH'));
      } else {
        console.log('   ❌ FFmpeg error:', error.message);
        reject(error);
      }
    });
    
    setTimeout(() => {
      ffmpegTest.kill();
      reject(new Error('FFmpeg test timed out'));
    }, 5000);
  });
}

// Test 2: Test RTMP connection
async function testRTMPConnection() {
  console.log('2️⃣ Testing RTMP connection...');
  
  return new Promise((resolve, reject) => {
    const testArgs = [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=320x240:rate=1:duration=10',
      '-f', 'lavfi', 
      '-i', 'anullsrc=channel_layout=mono:sample_rate=48000',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', '500k',
      '-c:a', 'aac',
      '-b:a', '64k',
      '-f', 'flv',
      '-timeout', '10000000', // 10 second timeout
      '-y',
      fullRtmpUrl
    ];
    
    console.log('   🔧 FFmpeg command:', 'ffmpeg', testArgs.join(' '));
    
    const testProcess = spawn('ffmpeg', testArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let errorOutput = '';
    let hasStarted = false;
    
    testProcess.stderr.on('data', (data) => {
      const output = data.toString();
      errorOutput += output;
      
      if (output.includes('Stream mapping:') || output.includes('frame=')) {
        if (!hasStarted) {
          console.log('   ✅ RTMP connection established');
          hasStarted = true;
        }
      }
      
      if (output.includes('frame=')) {
        console.log('   📊', output.trim());
      }
      
      // Log specific error details
      if (output.includes('Connection refused')) {
        console.log('   🚫 Connection refused - YouTube stream might not be live');
      }
      
      if (output.includes('Error number -10053') || output.includes('WSAECONNABORTED')) {
        console.log('   🌐 Network connection aborted - check stream status');
      }
      
      if (output.includes('Server returned 4')) {
        console.log('   🔑 Authentication failed - check stream key');
      }
      
      if (output.includes('Operation timed out')) {
        console.log('   ⏰ Connection timed out - network or firewall issue');
      }
    });
    
    testProcess.on('close', (code) => {
      if (code === 0 || hasStarted) {
        console.log('   ✅ RTMP connection test completed successfully');
        resolve(true);
      } else {
        console.log('   ❌ RTMP connection test failed');
        console.log('   📄 Error output:', errorOutput.substring(0, 500));
        
        if (errorOutput.includes('Connection refused') || 
            errorOutput.includes('Error number -10053') ||
            errorOutput.includes('Server returned 4')) {
          reject(new Error('RTMP connection failed: Invalid stream key or YouTube stream not live'));
        } else {
          reject(new Error(`RTMP test failed with code ${code}`));
        }
      }
    });
    
    testProcess.on('error', (error) => {
      console.log('   ❌ Process error:', error.message);
      reject(error);
    });
    
    setTimeout(() => {
      testProcess.kill();
      if (hasStarted) {
        console.log('   ✅ Test completed (killed after timeout)');
        resolve(true);
      } else {
        reject(new Error('RTMP connection test timed out without establishing connection'));
      }
    }, 15000);
  });
}

// Test 3: Test WebM input handling
async function testWebMHandling() {
  console.log('3️⃣ Testing WebM input handling...');
  
  return new Promise((resolve, reject) => {
    // First create a sample WebM file
    const createWebMArgs = [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=640x480:rate=30:duration=5',
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-c:v', 'libvpx',
      '-c:a', 'libvorbis',
      '-f', 'webm',
      '-y',
      'test.webm'
    ];
    
    const createProcess = spawn('ffmpeg', createWebMArgs);
    
    createProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to create test WebM file'));
        return;
      }
      
      // Now test streaming the WebM file
      const streamArgs = [
        '-f', 'webm',
        '-i', 'test.webm',
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-b:v', '1500k',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-f', 'flv',
        '-timeout', '10000000',
        '-y',
        fullRtmpUrl
      ];
      
      console.log('   🔧 Testing WebM to RTMP:', 'ffmpeg', streamArgs.join(' '));
      
      const streamProcess = spawn('ffmpeg', streamArgs);
      let hasStarted = false;
      
      streamProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Stream mapping:') || output.includes('frame=')) {
          if (!hasStarted) {
            console.log('   ✅ WebM streaming started');
            hasStarted = true;
          }
        }
      });
      
      streamProcess.on('close', (code) => {
        // Clean up test file
        try {
          require('fs').unlinkSync('test.webm');
        } catch (e) {}
        
        if (code === 0 || hasStarted) {
          console.log('   ✅ WebM input handling test successful');
          resolve(true);
        } else {
          reject(new Error(`WebM test failed with code ${code}`));
        }
      });
      
      setTimeout(() => {
        streamProcess.kill();
        if (hasStarted) {
          resolve(true);
        } else {
          reject(new Error('WebM test timed out'));
        }
      }, 10000);
    });
  });
}

// Run all tests
async function runTests() {
  try {
    await testFFmpegAvailability();
    console.log('');
    
    await testRTMPConnection();
    console.log('');
    
    await testWebMHandling();
    console.log('');
    
    console.log('🎉 All tests passed! Your YouTube streaming setup should work.');
    console.log('');
    console.log('💡 Troubleshooting tips:');
    console.log('   - Make sure your YouTube stream is set to "Live" status');
    console.log('   - Verify your stream key is correct');
    console.log('   - Check your internet connection');
    console.log('   - Ensure your YouTube account has live streaming enabled');
    
  } catch (error) {
    console.log('');
    console.log('❌ Test failed:', error.message);
    console.log('');
    console.log('💡 Common issues:');
    console.log('   1. FFmpeg not installed: Download from https://ffmpeg.org/');
    console.log('   2. Invalid stream key: Check YouTube Studio > Live streaming');
    console.log('   3. Stream not live: Set your YouTube stream to "Live" status');
    console.log('   4. Network issues: Check firewall/proxy settings');
    process.exit(1);
  }
}

runTests();
