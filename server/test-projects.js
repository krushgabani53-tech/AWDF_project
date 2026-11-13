const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runProjectTests() {
  console.log('--- STARTING PHASE 4 PROJECTS PORTFOLIO TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  try {
    // 1. Load all projects
    console.log('\n1. Testing Load Projects from PostgreSQL...');
    const listRes = await axios.get(`${BASE_URL}/projects`);
    assert(
      listRes.status === 200 && Array.isArray(listRes.data.data),
      'Load Projects',
      JSON.stringify(listRes.data)
    );
    const initialProjects = listRes.data.data;

    // 2. Verify all three sample projects exist
    console.log('\n2. Verifying the 3 Sample Projects...');
    const p1 = initialProjects.find(p => p.project_code === 'ENG-2026-01');
    const p2 = initialProjects.find(p => p.project_code === 'UI-2026-04');
    const p3 = initialProjects.find(p => p.project_code === 'NOTIF-2026-09');

    assert(Boolean(p1), 'Sample Project 1 (ENG-2026-01) present');
    assert(Boolean(p2), 'Sample Project 2 (UI-2026-04) present');
    assert(Boolean(p3), 'Sample Project 3 (NOTIF-2026-09) present');

    // Verify no duplicates of sample project codes
    const codes = initialProjects.map(p => p.project_code);
    const uniqueCodes = new Set(codes);
    assert(codes.length === uniqueCodes.size, 'No duplicate project codes in database');

    // 3. Test Create New Project
    console.log('\n3. Testing Create New Project...');
    const newProjectData = {
      name: 'Zero-Trust Network Access Proxy',
      category: 'Backend & Infrastructure',
      project_lead: 'DevOps Guild',
      deadline: '2026-12-20',
      status: 'Active',
      progress: 45,
      tags: ['WireGuard', 'OAuth2', 'Go', 'Docker'],
      tasks_completed: 4,
      tasks_total: 12,
      description: 'Enterprise zero-trust perimeter gateway with posture verification.',
    };

    const createRes = await axios.post(`${BASE_URL}/projects`, newProjectData);
    assert(
      createRes.status === 201 && createRes.data.success && Boolean(createRes.data.data.project_code),
      'Create New Project with Auto-generated Code',
      JSON.stringify(createRes.data)
    );
    const createdProject = createRes.data.data;
    console.log(`   Generated Project Code: ${createdProject.project_code}`);

    // 4. Test Get Project by ID
    console.log('\n4. Testing Get Project Details by ID...');
    const detailRes = await axios.get(`${BASE_URL}/projects/${createdProject.id}`);
    assert(
      detailRes.status === 200 && detailRes.data.data.name === 'Zero-Trust Network Access Proxy',
      'Get Project Details by ID',
      JSON.stringify(detailRes.data)
    );

    // Also test lookup by project_code
    const codeLookupRes = await axios.get(`${BASE_URL}/projects/${createdProject.project_code}`);
    assert(
      codeLookupRes.status === 200 && codeLookupRes.data.data.id === createdProject.id,
      'Get Project Details by Project Code'
    );

    // 5. Test Edit Project
    console.log('\n5. Testing Edit Project...');
    const editRes = await axios.put(`${BASE_URL}/projects/${createdProject.id}`, {
      name: 'Zero-Trust Network Access Proxy (v2)',
      progress: 85,
      status: 'Review',
      tags: ['WireGuard', 'OAuth2', 'Go', 'Docker', 'eBPF'],
    });
    assert(
      editRes.status === 200 &&
      editRes.data.data.name.includes('(v2)') &&
      editRes.data.data.progress === 85 &&
      editRes.data.data.status === 'Review',
      'Edit Project Updates in PostgreSQL',
      JSON.stringify(editRes.data)
    );

    // 6. Test Search and Filter
    console.log('\n6. Testing Search & Filters...');
    // Search by name
    const searchRes = await axios.get(`${BASE_URL}/projects?search=Zero-Trust`);
    assert(
      searchRes.data.data.some(p => p.id === createdProject.id),
      'Search by project name'
    );

    // Search by code
    const codeSearchRes = await axios.get(`${BASE_URL}/projects?search=${createdProject.project_code}`);
    assert(
      codeSearchRes.data.data.some(p => p.id === createdProject.id),
      'Search by project ID / code'
    );

    // Filter by Category
    const catRes = await axios.get(`${BASE_URL}/projects?category=Backend%20%26%20Infrastructure`);
    assert(
      catRes.data.data.length >= 2,
      'Category filter returns matches'
    );

    // Filter by Status
    const statusRes = await axios.get(`${BASE_URL}/projects?status=Review`);
    assert(
      statusRes.data.data.some(p => p.id === createdProject.id),
      'Status filter returns matches'
    );

    // 7. Test Delete Project
    console.log('\n7. Testing Delete Project...');
    const deleteRes = await axios.delete(`${BASE_URL}/projects/${createdProject.id}`);
    assert(
      deleteRes.status === 200 && deleteRes.data.success,
      'Delete Project',
      JSON.stringify(deleteRes.data)
    );

    // Verify deleted
    try {
      await axios.get(`${BASE_URL}/projects/${createdProject.id}`);
      assert(false, 'Verify project is removed (Should return 404)');
    } catch (err) {
      assert(err.response?.status === 404, 'Verify project is removed (Returned 404 as expected)');
    }

    // 8. Re-verify the 3 core sample projects remain intact
    console.log('\n8. Verifying Core Sample Projects Persist...');
    const finalCheck = await axios.get(`${BASE_URL}/projects`);
    assert(
      finalCheck.data.data.some(p => p.project_code === 'ENG-2026-01') &&
      finalCheck.data.data.some(p => p.project_code === 'UI-2026-04') &&
      finalCheck.data.data.some(p => p.project_code === 'NOTIF-2026-09'),
      'Core sample projects persist across queries'
    );

    console.log(`\n===================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`===================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runProjectTests();

