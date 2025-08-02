#!/usr/bin/env node

/**
 * Simple YouTube Stream Key Validator
 * Tests if a YouTube stream key is valid and the stream is live
 */

import { spawn } from 'child_process';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node validate-stream.js <rtmp_url> <stream_key>');
  console.log('Example: node validate-stream.js rtmp://a.rtmp.youtube.com/live2 your-stream-key');
  process.exit(1);
}

const [rtmpUrl, streamKey] = args;
const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;

console.log('🔍 YouTube Stream Validator');
console.log('===========================');
console.log(`📡 RTMP URL: ${rtmpUrl}`);
console.log(`🔑 Stream Key: ${streamKey.substring(0, 8)}...`);
console.log('');

// Simple 5-second test with minimal data
function testConnection() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Testing connection with minimal test stream...');
    
    const testArgs = [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=160x120:rate=1:duration=5',
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=mono:sample_rate=44100',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-b:v', '100k',
      '-c:a', 'aac',
      '-b:a', '32k',
      '-f', 'flv',
      '-timeout', '5000000', // 5 second timeout
      '-loglevel', 'verbose',
      fullRtmpUrl
    ];
    
    console.log('🔧 Command: ffmpeg', testArgs.join(' '));
    console.log('');
    
    const process = spawn('ffmpeg', testArgs);
    let output = '';
    let errorOutput = '';
    let connectionEstablished = false;
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      
      // Real-time feedback
      if (text.includes('Opening \'rtmp://')) {
        console.log('   🔗 Attempting RTMP connection...');
      }
      
      if (text.includes('Stream mapping:')) {
        console.log('   ✅ Stream mapping successful');
        connectionEstablished = true;
      }
      
      if (text.includes('frame=')) {
        if (!connectionEstablished) {
          console.log('   ✅ Connection established, streaming frames');
          connectionEstablished = true;
        }
        // Extract frame info
        const frameMatch = text.match(/frame=\s*(\d+)/);
        if (frameMatch) {
          console.log(`   📊 Frame ${frameMatch[1]} sent`);
        }
      }
      
      // Error detection
      if (text.includes('Connection refused')) {
        console.log('   ❌ Connection refused - Stream not live or invalid URL');
      }
      
      if (text.includes('Error number -10053')) {
        console.log('   ❌ Connection aborted (Error -10053) - Stream might not be ready');
      }
      
      if (text.includes('Server returned 404')) {
        console.log('   ❌ Server returned 404 - Invalid stream key');
      }
      
      if (text.includes('Server returned 403')) {
        console.log('   ❌ Server returned 403 - Access forbidden');
      }
      
      if (text.includes('timeout')) {
        console.log('   ⏰ Connection timeout');
      }
    });
    
    process.on('close', (code) => {
      console.log('');
      console.log(`🏁 Process finished with exit code: ${code}`);
      
      if (connectionEstablished || code === 0) {
        console.log('✅ SUCCESS: Stream connection works!');
        console.log('');
        console.log('💡 Your YouTube stream setup is correct. The error might be:');
        console.log('   - Temporary network issues');
        console.log('   - YouTube server load');
        console.log('   - Rate limiting from previous attempts');
        resolve(true);
      } else {
        console.log('❌ FAILED: Could not establish stream connection');
        console.log('');
        console.log('🔍 Troubleshooting steps:');
        console.log('   1. Check YouTube Studio > Live > Stream settings');
        console.log('   2. Ensure stream status is "Live" (not just created)');
        console.log('   3. Copy a fresh stream key');
        console.log('   4. Wait 30 seconds between attempts');
        console.log('   5. Check your internet connection');
        console.log('');
        console.log('📄 Last error output:');
        console.log(errorOutput.substring(errorOutput.length - 500));
        reject(new Error(`Stream test failed with code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      console.log('❌ Process error:', error.message);
      reject(error);
    });
  });
}

// Run the test
testConnection().catch(() => {
  process.exit(1);
});
