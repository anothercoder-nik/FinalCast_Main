#!/usr/bin/env node

/**
 * YouTube Stream Key Validator
 * Tests if your specific YouTube stream key is working
 */

import { spawn } from 'child_process';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node validate-stream-key.js <stream_key>');
  console.log('Example: node validate-stream-key.js ufj9-mx45-m2we-aw58-efab');
  process.exit(1);
}

const streamKey = args[0];
const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;

console.log('🔑 YouTube Stream Key Validator');
console.log('===============================');
console.log(`🎯 Testing stream key: ${streamKey.substring(0, 8)}...`);
console.log(`📡 Full RTMP URL: rtmp://a.rtmp.youtube.com/live2/${streamKey.substring(0, 8)}...`);
console.log('');

function testStreamKey() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Sending test video to your YouTube stream...');
    console.log('⏱️ This will take 10 seconds...');
    console.log('');
    
    // Simple 10-second test with colorful pattern
    const testArgs = [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=1280x720:rate=30:duration=10',
      '-f', 'lavfi',
      '-i', 'sine=frequency=440:sample_rate=48000',
      
      // Standard YouTube settings
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-b:v', '2500k',
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-g', '60',
      '-pix_fmt', 'yuv420p',
      
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '48000',
      '-ac', '2',
      
      '-f', 'flv',
      rtmpUrl
    ];
    
    console.log('🔧 FFmpeg command: ffmpeg', testArgs.join(' '));
    console.log('');
    
    const process = spawn('ffmpeg', testArgs);
    let errorOutput = '';
    let hasStartedStreaming = false;
    let frameCount = 0;
    
    process.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      
      // Check for successful connection
      if (text.includes('Stream mapping:') && !hasStartedStreaming) {
        console.log('✅ CONNECTED: Successfully connected to YouTube!');
        console.log('📺 Your stream should now be visible in YouTube Studio');
        hasStartedStreaming = true;
      }
      
      // Count frames being sent
      const frameMatch = text.match(/frame=\s*(\d+)/);
      if (frameMatch) {
        const currentFrame = parseInt(frameMatch[1]);
        if (currentFrame > frameCount) {
          frameCount = currentFrame;
          if (frameCount % 30 === 0) { // Every second at 30fps
            console.log(`📊 Streaming... ${Math.floor(frameCount/30)} seconds (${frameCount} frames sent)`);
          }
        }
      }
      
      // Error detection
      if (text.includes('Cannot open connection')) {
        console.log('❌ Cannot connect to YouTube RTMP server');
      }
      
      if (text.includes('Error number -10049')) {
        console.log('❌ Network error - cannot reach RTMP server');
      }
      
      if (text.includes('Error number -10053')) {
        console.log('❌ Connection was aborted by YouTube');
      }
      
      if (text.includes('Server returned 404')) {
        console.log('❌ Invalid stream key - YouTube returned 404');
      }
      
      if (text.includes('Server returned 403')) {
        console.log('❌ Access denied - check your stream permissions');
      }
      
      if (text.includes('Connection refused')) {
        console.log('❌ Connection refused - stream might not be live');
      }
    });
    
    process.on('close', (code) => {
      console.log('');
      console.log(`🏁 Test completed with exit code: ${code}`);
      
      if (hasStartedStreaming && frameCount > 0) {
        console.log('');
        console.log('🎉 SUCCESS! Your YouTube stream key is working!');
        console.log(`📊 Successfully sent ${frameCount} frames to YouTube`);
        console.log('');
        console.log('💡 What this means:');
        console.log('   ✅ Your stream key is valid');
        console.log('   ✅ Your YouTube stream is live and accepting video');
        console.log('   ✅ Network connectivity is working');
        console.log('   ✅ FFmpeg can successfully stream to YouTube');
        console.log('');
        console.log('🚀 You can now use this stream key in your application!');
        resolve(true);
      } else {
        console.log('');
        console.log('❌ FAILED: Could not stream to YouTube');
        console.log('');
        console.log('🔍 Possible issues:');
        console.log('   1. YouTube stream is not set to "Live" status');
        console.log('   2. Stream key is invalid or expired');
        console.log('   3. Stream was recently created and needs time to activate');
        console.log('   4. YouTube account doesn\'t have live streaming enabled');
        console.log('');
        console.log('📋 Next steps:');
        console.log('   1. Go to YouTube Studio > Live');
        console.log('   2. Check that your stream status shows "Live"');
        console.log('   3. Copy a fresh stream key');
        console.log('   4. Wait 1-2 minutes after creating the stream');
        console.log('');
        console.log('📄 Error details:');
        console.log(errorOutput.substring(Math.max(0, errorOutput.length - 800)));
        reject(new Error('Stream key validation failed'));
      }
    });
    
    process.on('error', (error) => {
      console.log('❌ Process error:', error.message);
      reject(error);
    });
  });
}

// Run the test
testStreamKey().catch(() => {
  process.exit(1);
});
