#!/usr/bin/env node

/**
 * Create Test Device Token Script
 * 
 * This script creates a test device token entry for testing push notifications
 * when the app hasn't properly registered one yet.
 */

const https = require('https');

// Configuration
const SUPABASE_URL = 'https://fezdmxvqurczeqmqvgzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    userId: '4e4da279-7195-4663-a4ce-4164057ece65', // Known user from logs
    deviceToken: null,
    deviceType: 'ios'
  };

  args.forEach(arg => {
    if (arg.startsWith('--user-id=')) {
      config.userId = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--token=')) {
      config.deviceToken = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--type=')) {
      config.deviceType = arg.split('=')[1].replace(/"/g, '');
    }
  });

  return config;
}

// Generate a fake device token for testing
function generateFakeToken(type = 'ios') {
  if (type === 'ios') {
    // iOS tokens are 64 character hex strings
    return Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  } else {
    // Android tokens are longer base64-like strings
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    return Array.from({length: 152}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}

// Create device token entry
function createDeviceToken(config) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      user_id: config.userId,
      device_token: config.deviceToken,
      device_type: config.deviceType,
      app_version: '1.0.0',
      device_info: {
        platform: config.deviceType,
        created_by: 'test-script',
        timestamp: new Date().toISOString()
      },
      is_active: true
    });

    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      port: 443,
      path: '/rest/v1/device_tokens',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Length': Buffer.byteLength(payload),
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// Main function
async function main() {
  console.log('🧪 Create Test Device Token');
  console.log('============================\n');

  const config = parseArgs();

  // Generate fake token if not provided
  if (!config.deviceToken) {
    config.deviceToken = generateFakeToken(config.deviceType);
  }

  console.log('📋 Configuration:');
  console.log(`   User ID: ${config.userId}`);
  console.log(`   Device Type: ${config.deviceType.toUpperCase()}`);
  console.log(`   Token: ${config.deviceToken.substring(0, 30)}...`);
  console.log();

  try {
    console.log('📱 Creating device token entry...');
    const response = await createDeviceToken(config);

    if (response.status === 201) {
      console.log('✅ Test device token created successfully!');
      console.log('   Response:', response.data);
      
      console.log('\n🎯 Next steps:');
      console.log('   1. Test with: node scripts/get-user-info.js --list-recent');
      console.log(`   2. Send notification: node scripts/test-push.js --user-id="${config.userId}"`);
      console.log();
      console.log('⚠️  Note: This is a fake token for testing the script flow.');
      console.log('   Real push notifications require actual device tokens from the app.');
      
    } else if (response.status === 409) {
      console.log('⚠️  Device token already exists for this user');
      console.log('   Try using: node scripts/get-user-info.js --list-recent');
      
    } else {
      console.error('❌ Failed to create device token');
      console.error(`   Status: ${response.status}`);
      console.error(`   Response:`, response.data);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}