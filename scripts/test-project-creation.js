// Browser Console Testing Script
// Run this in the browser console while on the projects page

// Test 1: Check if repositories are loaded
async function checkRepositories() {
  const response = await fetch('/api/repositories?workspace_id=' + getWorkspaceId());
  const data = await response.json();
  console.log('Available repositories:', data.repositories);
  return data.repositories?.length > 0;
}

// Test 2: Create a test project
async function createTestProject(repoId) {
  const testData = {
    workspace_id: getWorkspaceId(),
    repository_id: repoId,
    name: `Test Project ${Date.now()}`,
    description: 'Created via production test script'
  };
  
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });
  
  const result = await response.json();
  console.log('Create project result:', result);
  return result;
}

// Test 3: Verify project creation
async function verifyProjects() {
  const response = await fetch('/api/projects?workspace_id=' + getWorkspaceId());
  const data = await response.json();
  console.log('Current projects:', data.projects);
  return data.projects;
}

// Helper to get workspace ID from the page
function getWorkspaceId() {
  // This assumes the workspace ID is available in your app's state
  // Adjust based on your implementation
  return localStorage.getItem('activeWorkspaceId') || 
         prompt('Enter workspace ID:');
}

// Run all tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function runTests() {
  console.log('🧪 Starting project creation tests...');
  
  try {
    // Check repositories
    const hasRepos = await checkRepositories();
    if (!hasRepos) {
      console.error('❌ No repositories found. Connect a repository first.');
      return;
    }
    
    // Get first repository
    const repos = (await checkRepositories()) || [];
    const repoId = repos[0]?.id;
    
    if (!repoId) {
      console.error('❌ Could not get repository ID');
      return;
    }
    
    // Create project
    console.log('📝 Creating test project...');
    const project = await createTestProject(repoId);
    
    if (project.error) {
      console.error('❌ Project creation failed:', project.error);
      return;
    }
    
    console.log('✅ Project created successfully!');
    
    // Verify it exists
    console.log('🔍 Verifying project exists...');
    const projects = await verifyProjects();
    const found = projects.find(p => p.id === project.project?.id);
    
    if (found) {
      console.log('✅ Project verified in list!');
      console.log('🎉 All tests passed!');
    } else {
      console.error('❌ Project not found in list');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Instructions
console.log(`
📋 Project Creation Test Script
==============================
Run these commands:
1. checkRepositories() - List available repos
2. createTestProject('repo-id') - Create a test project
3. verifyProjects() - List all projects
4. runTests() - Run all tests automatically
`);