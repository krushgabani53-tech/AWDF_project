const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- STARTING PHASE 3 TASKS MODULE TESTS ---');
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
    // 1. Create a task (Ongoing)
    console.log('\n1. Testing Create Task...');
    const createRes = await axios.post(`${BASE_URL}/tasks`, {
      title: 'Deploy Kubernetes Ingress Controller',
      description: 'Configure TLS cert-manager and ingress rules for microservices',
      priority: 'High',
    });
    assert(
      createRes.status === 201 && createRes.data.success && createRes.data.data.title === 'Deploy Kubernetes Ingress Controller',
      'Create Task (Ongoing)',
      JSON.stringify(createRes.data)
    );
    const task1 = createRes.data.data;

    // Create a 2nd task to test delete
    const createRes2 = await axios.post(`${BASE_URL}/tasks`, {
      title: 'Temporary Test Task to Delete',
      description: 'Will be deleted in ongoing state',
      priority: 'Low',
    });
    const taskToDelete = createRes2.data.data;

    // Create a 3rd task with Critical priority
    const createRes3 = await axios.post(`${BASE_URL}/tasks`, {
      title: 'Security Vulnerability Patch CVE-2026',
      description: 'Urgent patch for SSL handshake vulnerability',
      priority: 'Critical',
    });
    const criticalTask = createRes3.data.data;

    // 2. View all tasks
    console.log('\n2. Testing View All Tasks...');
    const listRes = await axios.get(`${BASE_URL}/tasks`);
    assert(
      listRes.status === 200 && Array.isArray(listRes.data.data) && listRes.data.data.length >= 3,
      'View All Tasks',
      `Found ${listRes.data.data.length} tasks`
    );

    // 3. Edit an ongoing task
    console.log('\n3. Testing Edit Ongoing Task...');
    const editRes = await axios.put(`${BASE_URL}/tasks/${task1.id}`, {
      title: 'Deploy Kubernetes Ingress Controller (Updated v2)',
      description: 'Updated with Let’s Encrypt production certificates',
      priority: 'Critical',
    });
    assert(
      editRes.status === 200 && editRes.data.data.title.includes('(Updated v2)') && editRes.data.data.priority === 'Critical',
      'Edit Ongoing Task',
      JSON.stringify(editRes.data)
    );

    // 4. Delete an ongoing task
    console.log('\n4. Testing Delete Ongoing Task...');
    const deleteRes = await axios.delete(`${BASE_URL}/tasks/${taskToDelete.id}`);
    assert(
      deleteRes.status === 200 && deleteRes.data.success,
      'Delete Ongoing Task',
      JSON.stringify(deleteRes.data)
    );

    // Verify task is gone
    try {
      await axios.get(`${BASE_URL}/tasks/${taskToDelete.id}`);
      assert(false, 'Verify Task Deleted (Should be 404)');
    } catch (err) {
      assert(err.response?.status === 404, 'Verify Task Deleted (Returned 404 as expected)');
    }

    // 5. Mark task as completed
    console.log('\n5. Testing Mark Task as Completed...');
    const completeRes = await axios.patch(`${BASE_URL}/tasks/${task1.id}/complete`);
    assert(
      completeRes.status === 200 &&
      completeRes.data.data.status === 'completed' &&
      Boolean(completeRes.data.data.completed_at),
      'Mark Task as Completed',
      JSON.stringify(completeRes.data)
    );

    // 6, 7, 8, 9, 10: Query list and test filters/counters
    console.log('\n6-10. Testing List, Counters & Filters...');
    const refreshedList = await axios.get(`${BASE_URL}/tasks`);
    const allTasks = refreshedList.data.data;
    const ongoingTasks = allTasks.filter(t => t.status === 'ongoing');
    const completedTasks = allTasks.filter(t => t.status === 'completed');

    assert(allTasks.length >= 2, 'Total tasks count verified');
    assert(ongoingTasks.length >= 1, `Ongoing counter verified (${ongoingTasks.length})`);
    assert(completedTasks.length >= 1, `Completed counter verified (${completedTasks.length})`);

    const criticalTasks = allTasks.filter(t => t.priority.toLowerCase() === 'critical');
    assert(criticalTasks.length >= 1, `Priority filter verified (Critical tasks found: ${criticalTasks.length})`);

    // 11. Try editing a completed task through the API (Protocol 5 Enforcement)
    console.log('\n11. Testing Protocol 5: Try Editing a Completed Task...');
    try {
      await axios.put(`${BASE_URL}/tasks/${task1.id}`, {
        title: 'Attempting to edit locked task',
      });
      assert(false, 'Protocol 5 Edit Rejection (Should have failed)');
    } catch (err) {
      assert(
        err.response?.status === 403 && err.response?.data?.message?.includes('Protocol 5 Violation'),
        'Protocol 5 Edit Rejection (Rejected with HTTP 403 & Protocol 5 message)',
        err.response?.data?.message
      );
    }

    // 12. Try deleting a completed task through the API (Protocol 5 Enforcement)
    console.log('\n12. Testing Protocol 5: Try Deleting a Completed Task...');
    try {
      await axios.delete(`${BASE_URL}/tasks/${task1.id}`);
      assert(false, 'Protocol 5 Delete Rejection (Should have failed)');
    } catch (err) {
      assert(
        err.response?.status === 403 && err.response?.data?.message?.includes('Protocol 5 Violation'),
        'Protocol 5 Delete Rejection (Rejected with HTTP 403 & Protocol 5 message)',
        err.response?.data?.message
      );
    }

    // 13. Try changing a completed task back to ongoing (Protocol 5 Enforcement)
    console.log('\n13. Testing Protocol 5: Try Reversing Completed to Ongoing...');
    try {
      await axios.put(`${BASE_URL}/tasks/${task1.id}`, {
        status: 'ongoing',
      });
      assert(false, 'Protocol 5 Reversal Rejection (Should have failed)');
    } catch (err) {
      assert(
        err.response?.status === 403 && err.response?.data?.message?.includes('Protocol 5 Violation'),
        'Protocol 5 Reversal Rejection (Rejected with HTTP 403 & Protocol 5 message)',
        err.response?.data?.message
      );
    }

    console.log(`\n===================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`===================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (globalErr) {
    console.error('Fatal test error:', globalErr.response?.data || globalErr.message);
    process.exit(1);
  }
}

runTests();

