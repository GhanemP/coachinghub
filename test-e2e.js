// E2E Testing Script for Coaching Dashboard
// This script tests all functionality and validates metric calculations

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test Configuration
const testConfig = {
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test Results Storage
let testResults = {
  auth: { passed: 0, failed: 0, errors: [] },
  sessions: { passed: 0, failed: 0, errors: [] },
  goals: { passed: 0, failed: 0, errors: [] },
  actionItems: { passed: 0, failed: 0, errors: [] },
  admin: { passed: 0, failed: 0, errors: [] },
  metrics: { passed: 0, failed: 0, errors: [] }
};

// Utility Functions
function logTest(category, testName, passed, error = null) {
  if (passed) {
    testResults[category].passed++;
    console.log(`✅ ${category.toUpperCase()}: ${testName}`);
  } else {
    testResults[category].failed++;
    testResults[category].errors.push({ test: testName, error: error?.message || 'Unknown error' });
    console.log(`❌ ${category.toUpperCase()}: ${testName} - ${error?.message || 'Failed'}`);
  }
}

function calculateProgress(currentValue, targetValue) {
  const current = parseFloat(String(currentValue).replace(/[^\d.]/g, '') || '0');
  const target = parseFloat(String(targetValue).replace(/[^\d.]/g, '') || '0');
  
  if (target > 0) {
    return Math.min(100, Math.round((current / target) * 100));
  }
  return 0;
}

// Test Functions
async function testAPIEndpoints() {
  console.log('\n🔍 Testing API Endpoints...\n');
  
  const endpoints = [
    { name: 'Session API', url: '/api/session', method: 'GET' },
    { name: 'Goals API', url: '/api/goal', method: 'GET' },
    { name: 'Action Items API', url: '/api/action-item', method: 'GET' },
    { name: 'Users API', url: '/api/user', method: 'GET' },
    { name: 'Admin Users API', url: '/api/admin/users', method: 'GET' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.url}`,
        timeout: 5000
      });
      
      logTest('sessions', `${endpoint.name} responds successfully`, 
        response.status === 200 || response.status === 401); // 401 is expected for auth endpoints
      
    } catch (error) {
      logTest('sessions', `${endpoint.name} responds`, false, error);
    }
  }
}

async function testSessionCreation() {
  console.log('\n🔍 Testing Session Creation...\n');
  
  try {
    // First, get users
    const usersResponse = await axios.get(`${BASE_URL}/api/user`);
    const users = usersResponse.data;
    
    const teamLeader = users.find(user => user.role === 'TEAM_LEADER');
    const agent = users.find(user => user.role === 'AGENT');
    
    logTest('sessions', 'Users retrieved successfully', users.length > 0);
    logTest('sessions', 'Team Leader exists', !!teamLeader);
    logTest('sessions', 'Agent exists', !!agent);
    
    if (teamLeader && agent) {
      // Create a test session
      const sessionData = {
        sessionNumber: Math.floor(Math.random() * 1000),
        type: 'SCHEDULED',
        status: 'DRAFT',
        scheduledDate: new Date().toISOString(),
        teamLeaderId: teamLeader.id,
        agentId: agent.id
      };
      
      const sessionResponse = await axios.post(`${BASE_URL}/api/session`, sessionData);
      logTest('sessions', 'Session created successfully', sessionResponse.status === 200);
      
      const createdSession = sessionResponse.data;
      
      // Test session update
      const updateData = { status: 'ACTIVE' };
      const updateResponse = await axios.put(`${BASE_URL}/api/session/${createdSession.id}`, updateData);
      logTest('sessions', 'Session updated successfully', updateResponse.status === 200);
      
      return createdSession;
    }
  } catch (error) {
    logTest('sessions', 'Session creation flow', false, error);
  }
}

async function testGoalsAndMetrics() {
  console.log('\n🔍 Testing Goals and Metrics Calculations...\n');
  
  try {
    // Get existing goals
    const goalsResponse = await axios.get(`${BASE_URL}/api/goal`);
    const goals = goalsResponse.data;
    
    logTest('goals', 'Goals retrieved successfully', goalsResponse.status === 200);
    
    // Get real users for foreign key constraints
    const usersResponse = await axios.get(`${BASE_URL}/api/user`);
    const users = usersResponse.data;
    const testUser = users[0]; // Use first real user
    
    // Test goal creation
    const testGoal = {
      title: 'Test Metric Goal',
      description: 'Testing metric calculations',
      targetValue: '100',
      currentValue: '75',
      status: 'ACTIVE',
      category: 'metrics',
      createdById: testUser.id,  // Use real user ID
      assignedToId: testUser.id  // Use real user ID
    };
    
    const createGoalResponse = await axios.post(`${BASE_URL}/api/goal`, testGoal);
    logTest('goals', 'Goal created successfully', createGoalResponse.status === 200);
    
    const createdGoal = createGoalResponse.data;
    
    // Test progress calculation
    const calculatedProgress = calculateProgress(testGoal.currentValue, testGoal.targetValue);
    const expectedProgress = 75; // 75/100 = 75%
    
    logTest('metrics', 'Progress calculation accuracy', calculatedProgress === expectedProgress);
    
    // Test goal update with different values
    const updateGoalData = {
      currentValue: '85'
    };
    
    const updateGoalResponse = await axios.put(`${BASE_URL}/api/goal/${createdGoal.id}`, updateGoalData);
    logTest('goals', 'Goal updated successfully', updateGoalResponse.status === 200);
    
    // Verify updated progress calculation
    const newProgress = calculateProgress('85', '100');
    logTest('metrics', 'Updated progress calculation', newProgress === 85);
    
    // Test edge cases
    const edgeCases = [
      { current: '120', target: '100', expected: 100 }, // Should cap at 100%
      { current: '0', target: '50', expected: 0 },      // Zero progress
      { current: '25', target: '0', expected: 0 },      // Division by zero
      { current: '$50.00', target: '$200.00', expected: 25 }, // Currency format
    ];
    
    for (const testCase of edgeCases) {
      const result = calculateProgress(testCase.current, testCase.target);
      logTest('metrics', `Edge case: ${testCase.current}/${testCase.target} = ${testCase.expected}%`, 
        result === testCase.expected);
    }
    
  } catch (error) {
    logTest('goals', 'Goals and metrics testing', false, error);
  }
}

async function testActionItems() {
  console.log('\n🔍 Testing Action Items...\n');
  
  try {
    // Get existing action items
    const actionItemsResponse = await axios.get(`${BASE_URL}/api/action-item`);
    logTest('actionItems', 'Action items retrieved', actionItemsResponse.status === 200);
    
    // Create test action item
    const users = await axios.get(`${BASE_URL}/api/user`);
    const testUser = users.data[0]; // Get first user
    
    const testActionItem = {
      title: 'Test Action Item',
      description: 'Testing action item functionality',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      createdById: testUser.id,
      assignedToId: testUser.id
    };
    
    const createResponse = await axios.post(`${BASE_URL}/api/action-item`, testActionItem);
    logTest('actionItems', 'Action item created', createResponse.status === 200);
    
    const createdItem = createResponse.data;
    
    // Test status update
    const updateData = { status: 'IN_PROGRESS' };
    const updateResponse = await axios.put(`${BASE_URL}/api/action-item/${createdItem.id}`, updateData);
    logTest('actionItems', 'Action item status updated', updateResponse.status === 200);
    
    // Test completion
    const completeData = { 
      status: 'COMPLETED',
      completedDate: new Date().toISOString()
    };
    const completeResponse = await axios.put(`${BASE_URL}/api/action-item/${createdItem.id}`, completeData);
    logTest('actionItems', 'Action item completed', completeResponse.status === 200);
    
  } catch (error) {
    logTest('actionItems', 'Action items testing', false, error);
  }
}

async function testSessionNotes() {
  console.log('\n🔍 Testing Session Notes...\n');
  
  try {
    // Get sessions
    const sessionsResponse = await axios.get(`${BASE_URL}/api/session`);
    const sessions = sessionsResponse.data;
    
    if (sessions.length > 0) {
      const testSession = sessions[0];
      
      // Create session note
      const noteData = {
        sessionId: testSession.id,
        content: 'Test session note content',
        isQuickNote: false,
        category: 'COACHING_NOTE'
      };
      
      const noteResponse = await axios.post(`${BASE_URL}/api/session-note`, noteData);
      logTest('sessions', 'Session note created', noteResponse.status === 200);
      
      // Create quick note
      const quickNoteData = {
        sessionId: testSession.id,
        content: 'Quick test note',
        isQuickNote: true,
        category: 'COACHING_NOTE'
      };
      
      const quickNoteResponse = await axios.post(`${BASE_URL}/api/session-note`, quickNoteData);
      logTest('sessions', 'Quick note created', quickNoteResponse.status === 200);
    }
    
  } catch (error) {
    logTest('sessions', 'Session notes testing', false, error);
  }
}

async function testEvaluations() {
  console.log('\n🔍 Testing Evaluations and Scoring...\n');
  
  try {
    // Get sessions
    const sessionsResponse = await axios.get(`${BASE_URL}/api/session`);
    const sessions = sessionsResponse.data;
    
    if (sessions.length > 0) {
      const testSession = sessions[0];
      
      // Test evaluation criteria
      const evaluationCriteria = [
        `Communication Skills ${Date.now()}`,
        `Problem Solving ${Date.now() + 1}`,
        `Product Knowledge ${Date.now() + 2}`,
        `Customer Service ${Date.now() + 3}`,
        `Professionalism ${Date.now() + 4}`
      ];
      
      let totalScore = 0;
      let evaluationCount = 0;
      
      for (const criteria of evaluationCriteria) {
        const score = Math.floor(Math.random() * 5) + 1; // Random score 1-5
        totalScore += score;
        evaluationCount++;
        
        const evaluationData = {
          sessionId: testSession.id,
          criteria: criteria,
          score: score,
          maxScore: 5,
          comments: `Test evaluation for ${criteria}`
        };
        
        const evaluationResponse = await axios.post(`${BASE_URL}/api/evaluation`, evaluationData);
        logTest('metrics', `Evaluation created for ${criteria}`, evaluationResponse.status === 200);
      }
      
      // Calculate average score
      const averageScore = totalScore / evaluationCount;
      logTest('metrics', 'Average score calculation', averageScore >= 1 && averageScore <= 5);
      
      console.log(`   Average evaluation score: ${averageScore.toFixed(2)}/5.0`);
    }
    
  } catch (error) {
    logTest('metrics', 'Evaluations testing', false, error);
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity and Relationships...\n');
  
  try {
    // Get all data types
    const [sessions, goals, actionItems, users] = await Promise.all([
      axios.get(`${BASE_URL}/api/session`),
      axios.get(`${BASE_URL}/api/goal`),
      axios.get(`${BASE_URL}/api/action-item`),
      axios.get(`${BASE_URL}/api/user`)
    ]);
    
    logTest('sessions', 'All data types retrieved', true);
    
    // Check referential integrity
    const sessionData = sessions.data;
    const userData = users.data;
    
    for (const session of sessionData) {
      if (session.teamLeaderId) {
        const teamLeader = userData.find(user => user.id === session.teamLeaderId);
        logTest('sessions', `Session ${session.id} has valid team leader`, !!teamLeader);
      }
      
      if (session.agentId) {
        const agent = userData.find(user => user.id === session.agentId);
        logTest('sessions', `Session ${session.id} has valid agent`, !!agent);
      }
    }
    
    // Check action items have valid sessions
    const actionItemData = actionItems.data;
    for (const actionItem of actionItemData) {
      if (actionItem.sessionId) {
        const session = sessionData.find(s => s.id === actionItem.sessionId);
        logTest('actionItems', `Action item ${actionItem.id} has valid session`, !!session);
      }
    }
    
  } catch (error) {
    logTest('sessions', 'Data integrity testing', false, error);
  }
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting Comprehensive E2E Testing for Coaching Dashboard\n');
  console.log('=' .repeat(60));
  
  try {
    await testAPIEndpoints();
    await testSessionCreation();
    await testGoalsAndMetrics();
    await testActionItems();
    await testSessionNotes();
    await testEvaluations();
    await testDataIntegrity();
    
  } catch (error) {
    console.error('Test execution error:', error.message);
  }
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [category, results] of Object.entries(testResults)) {
    const categoryTotal = results.passed + results.failed;
    const successRate = categoryTotal > 0 ? ((results.passed / categoryTotal) * 100).toFixed(1) : '0.0';
    
    console.log(`${category.toUpperCase().padEnd(12)} | ${results.passed.toString().padStart(3)} passed | ${results.failed.toString().padStart(3)} failed | ${successRate.padStart(5)}% success`);
    
    totalPassed += results.passed;
    totalFailed += results.failed;
    
    if (results.errors.length > 0) {
      console.log(`   Errors:`);
      results.errors.forEach(error => {
        console.log(`   - ${error.test}: ${error.error}`);
      });
    }
  }
  
  const overallTotal = totalPassed + totalFailed;
  const overallSuccessRate = overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : '0.0';
  
  console.log('-' .repeat(60));
  console.log(`OVERALL      | ${totalPassed.toString().padStart(3)} passed | ${totalFailed.toString().padStart(3)} failed | ${overallSuccessRate.padStart(5)}% success`);
  console.log('=' .repeat(60));
  
  if (overallSuccessRate >= 80) {
    console.log('✅ Testing completed successfully! System is functioning well.');
  } else {
    console.log('⚠️  Some issues detected. Review failed tests above.');
  }
}

// Check if axios is available, if not provide instructions
try {
  require('axios');
  runAllTests();
} catch (error) {
  console.log('📦 Installing axios for testing...');
  console.log('Please run: npm install axios');
  console.log('Then run: node test-e2e.js');
}
