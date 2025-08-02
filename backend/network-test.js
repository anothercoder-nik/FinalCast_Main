#!/usr/bin/env node

/**
 * Network Connectivity Test for YouTube RTMP
 * Tests basic network connectivity to YouTube's RTMP servers
 */

import { spawn } from 'child_process';
import { createConnection } from 'net';

console.log('🌐 Network Connectivity Test for YouTube RTMP');
console.log('==============================================');
console.log('');

// Test 1: Basic TCP connection to YouTube RTMP server
function testTCPConnection() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣ Testing TCP connection to YouTube RTMP server...');
    
    const socket = createConnection({
      host: 'a.rtmp.youtube.com',
      port: 1935,
      timeout: 5000
    });
    
    socket.on('connect', () => {
      console.log('   ✅ TCP connection successful to a.rtmp.youtube.com:1935');
      socket.end();
      resolve(true);
    });
    
    socket.on('error', (error) => {
      console.log('   ❌ TCP connection failed:', error.message);
      if (error.code === 'ENOTFOUND') {
        console.log('   💡 DNS resolution failed - check internet connection');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   💡 Connection refused - port might be blocked');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('   💡 Connection timeout - firewall might be blocking');
      }
      reject(error);
    });
    
    socket.on('timeout', () => {
      console.log('   ❌ TCP connection timeout');
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

// Test 2: Test with curl (if available)
function testWithCurl() {
  return new Promise((resolve, reject) => {
    console.log('2️⃣ Testing HTTP connectivity to YouTube...');
    
    const curlProcess = spawn('curl', [
      '-I',
      '--connect-timeout', '10',
      '--max-time', '15',
      'https://www.youtube.com'
    ]);
    
    let output = '';
    
    curlProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    curlProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    curlProcess.on('close', (code) => {
      if (code === 0) {
        console.log('   ✅ HTTP connection to YouTube successful');
        resolve(true);
      } else {
        console.log('   ⚠️ HTTP test failed or curl not available');
        resolve(false); // Don't fail the entire test for this
      }
    });
    
    curlProcess.on('error', (error) => {
      console.log('   ⚠️ Curl not available, skipping HTTP test');
      resolve(false); // Don't fail for missing curl
    });
  });
}

// Test 3: Simple FFmpeg connectivity test
function testFFmpegConnectivity() {
  return new Promise((resolve, reject) => {
    console.log('3️⃣ Testing FFmpeg RTMP connectivity...');
    
    // Very simple test - just try to connect without sending data
    const testArgs = [
      '-f', 'lavfi',
      '-i', 'testsrc2=size=160x120:rate=1:duration=1',
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=mono:sample_rate=44100',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-b:v', '50k',
      '-c:a', 'aac',
      '-b:a', '32k',
      '-f', 'flv',
      '-t', '1', // Only 1 second
      'rtmp://a.rtmp.youtube.com/live2/test'
    ];
    
    const testProcess = spawn('ffmpeg', testArgs);
    let errorOutput = '';
    
    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (errorOutput.includes('Cannot open connection') || 
          errorOutput.includes('Error number -10049')) {
        console.log('   ❌ FFmpeg cannot connect to RTMP server');
        console.log('   💡 This confirms network connectivity issues');
        reject(new Error('RTMP connectivity failed'));
      } else if (errorOutput.includes('Server returned 404') || 
                 errorOutput.includes('Connection refused')) {
        console.log('   ✅ FFmpeg can reach RTMP server (got expected auth error)');
        resolve(true);
      } else {
        console.log('   ⚠️ Unexpected FFmpeg output');
        console.log('   📄 Last output:', errorOutput.substring(errorOutput.length - 200));
        resolve(false);
      }
    });
    
    testProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Run all tests
async function runNetworkTests() {
  try {
    await testTCPConnection();
    console.log('');
    
    await testWithCurl();
    console.log('');
    
    await testFFmpegConnectivity();
    console.log('');
    
    console.log('🎉 Network connectivity tests completed!');
    console.log('');
    console.log('💡 If TCP connection works but RTMP fails:');
    console.log('   - Your network can reach YouTube');
    console.log('   - The issue is likely with stream configuration');
    console.log('   - Check your YouTube stream key and stream status');
    
  } catch (error) {
    console.log('');
    console.log('❌ Network connectivity test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('   1. Check your internet connection');
    console.log('   2. Disable VPN if active');
    console.log('   3. Check Windows Firewall settings');
    console.log('   4. Try from a different network');
    console.log('   5. Contact your ISP about RTMP port blocking');
    process.exit(1);
  }
}

runNetworkTests();
