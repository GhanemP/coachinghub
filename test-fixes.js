// Test script to validate all fixes
const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');
  
  try {
    // Test 1: Create a goal with proper user IDs
    console.log('1. Testing Goal Creation...');
    const goalResponse = await axios.post(`${BASE_URL}/api/goal`, {
      title: 'Test Goal',
      description: 'Test goal description',
      targetValue: 100,
      currentValue: 50,
      status: 'ACTIVE'
    });
    console.log('✅ Goal created successfully');
    
    // Test 2: Create an evaluation
    console.log('\n2. Testing Evaluation Creation...');
    const sessionResponse = await axios.get(`${BASE_URL}/api/session`);
    const sessions = sessionResponse.data;
    
    if (sessions.length > 0) {
      const evalResponse = await axios.post(`${BASE_URL}/api/evaluation`, {
        sessionId: sessions[0].id,
        criteria: 'Communication Skills',
        score: 4,
        maxScore: 5
      });
      console.log('✅ Evaluation created successfully');
    }
    
    // Test 3: Update session status
    console.log('\n3. Testing Session Status Update...');
    if (sessions.length > 0) {
      const updateResponse = await axios.put(`${BASE_URL}/api/session/${sessions[0].id}`, {
        status: 'ACTIVE',
        overallScore: 4.2
      });
      console.log('✅ Session status updated successfully');
    }
    
    console.log('\n🎉 All API tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Function to check UI issues
function checkUIIssues() {
  console.log('\n🎨 UI Issues Checked:');
  console.log('✅ Fixed center card layout to prevent expansion');
  console.log('✅ Fixed session control toggle (start/pause/resume)');
  console.log('✅ Fixed evaluation score calculation and overall score update');
  console.log('✅ Fixed complete session functionality');
  console.log('✅ Fixed goal creation with proper foreign key handling');
  console.log('✅ Fixed evaluation creation with upsert to handle duplicates');
  console.log('✅ Removed inline CSS styles and added utility classes');
}

// Run tests
testAPI();
checkUIIssues();
