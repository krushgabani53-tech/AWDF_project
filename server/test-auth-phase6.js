/**
 * Slate Workspace - Phase 6 End-to-End Verification Test Suite
 * Tests Auth, RBAC, User Data Isolation, Protocol 5, Audit Logging, and Admin Dashboard APIs.
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Simple HTTP request helper supporting cookies and JSON
function request(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = data ? JSON.stringify(data) : null;

    const headers = {
      'Accept': 'application/json'
    };

    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = body;
        }

        // Extract set-cookie headers
        const setCookies = res.headers['set-cookie'] || [];
        const cookieMap = {};
        setCookies.forEach(c => {
          const parts = c.split(';')[0].split('=');
          if (parts.length >= 2) {
            cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
          }
        });

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
          cookies: cookieMap,
          cookieHeader: Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ')
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   SLATE WORKSPACE - PHASE 6 AUTH & RBAC VERIFICATION');
  console.log('======================================================\n');

  try {
    // 1. Health check
    console.log('1. Testing Backend Health...');
    const health = await request('GET', '/api/health');
    assert(health.statusCode === 200 && health.data.success === true, 'GET /api/health responds with 200 OK');

    // 2. Public Registration
    console.log('\n2. Testing Public Registration...');
    const testEmail = `tester_${Date.now()}@example.com`;
    
    // Test validation: Short password
    const shortPwdRes = await request('POST', '/api/auth/register', {
      full_name: 'Short Tester',
      email: testEmail,
      password: '123'
    });
    assert(shortPwdRes.statusCode === 400, 'Registration rejects password under 8 characters (HTTP 400)');

    // Test valid registration - verify role defaults to USER even if ADMIN is requested
    const regRes = await request('POST', '/api/auth/register', {
      full_name: 'Test Regular User',
      email: testEmail,
      password: 'Password123!',
      role: 'ADMIN' // Malicious attempt to register as ADMIN
    });
    assert(regRes.statusCode === 201, 'Registration succeeded with HTTP 201');
    assert(regRes.data.user.role === 'USER', 'Public registration strictly forces USER role (cannot escalate to ADMIN)');
    assert(!regRes.data.user.password && !regRes.data.user.password_hash, 'Password hash is NEVER leaked in registration response');

    // Test duplicate registration
    const dupRes = await request('POST', '/api/auth/register', {
      full_name: 'Duplicate Tester',
      email: testEmail,
      password: 'Password123!'
    });
    assert(dupRes.statusCode === 409, 'Duplicate email registration rejected with HTTP 409 Conflict');

    // 3. Login Flow
    console.log('\n3. Testing Login & Session Token (HTTP-Only Cookie)...');
    
    // Invalid credentials
    const badLogin = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword!'
    });
    assert(badLogin.statusCode === 401, 'Invalid password rejected with HTTP 401 Unauthorized');

    // Standard User Login
    const userLogin = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'Password123!'
    });
    assert(userLogin.statusCode === 200, 'Standard user logged in with HTTP 200');
    assert(!!userLogin.cookies['token'], 'HTTP-only auth cookie set on standard login');
    const userCookie = userLogin.cookieHeader;

    // Verify GET /api/auth/me with standard cookie
    const userMe = await request('GET', '/api/auth/me', null, userCookie);
    assert(userMe.statusCode === 200, 'GET /api/auth/me succeeds with valid cookie');
    assert(userMe.data.user.email === testEmail, 'GET /api/auth/me returns correct user email');
    assert(userMe.data.user.role === 'USER', 'GET /api/auth/me confirms USER role');
    assert(!userMe.data.user.password_hash, 'GET /api/auth/me never exposes password_hash');

    // Admin User Login (Seeded krushgabani53@gmail.com)
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'krushgabani53@gmail.com',
      password: 'Admin123!'
    });
    assert(adminLogin.statusCode === 200, 'Admin logged in with HTTP 200');
    assert(adminLogin.data.user.role === 'ADMIN', 'Admin profile confirms ADMIN role');
    const adminCookie = adminLogin.cookieHeader;

    // 4. Role-Based Access Control (RBAC) on Admin Endpoints
    console.log('\n4. Testing Role-Based Access Control (RBAC)...');
    
    // Standard user blocked from /api/admin/stats
    const userStatsAttempt = await request('GET', '/api/admin/stats', null, userCookie);
    assert(userStatsAttempt.statusCode === 403, 'Standard user blocked from /api/admin/stats (HTTP 403 Forbidden)');

    // Standard user blocked from /api/admin/users
    const userDirAttempt = await request('GET', '/api/admin/users', null, userCookie);
    assert(userDirAttempt.statusCode === 403, 'Standard user blocked from /api/admin/users (HTTP 403 Forbidden)');

    // Standard user blocked from /api/admin/audit-logs
    const userAuditAttempt = await request('GET', '/api/admin/audit-logs', null, userCookie);
    assert(userAuditAttempt.statusCode === 403, 'Standard user blocked from /api/admin/audit-logs (HTTP 403 Forbidden)');

    // Admin successfully accesses /api/admin/stats
    const adminStats = await request('GET', '/api/admin/stats', null, adminCookie);
    assert(adminStats.statusCode === 200 && adminStats.data.success, 'Admin successfully accesses /api/admin/stats');
    assert(adminStats.data.data.total_users >= 2, 'Admin stats report accurate user counts');

    // Admin successfully accesses /api/admin/users
    const adminUsers = await request('GET', '/api/admin/users', null, adminCookie);
    assert(adminUsers.statusCode === 200 && Array.isArray(adminUsers.data.data), 'Admin accesses /api/admin/users');

    // Admin self-demotion prevention
    const selfDemoteRes = await request('PATCH', `/api/admin/users/${adminLogin.data.user.id}/role`, {
      role: 'USER'
    }, adminCookie);
    assert(selfDemoteRes.statusCode === 400, 'Admin self-demotion is prevented (HTTP 400 Bad Request)');

    // Admin promotes test regular user to ADMIN
    const promoteRes = await request('PATCH', `/api/admin/users/${regRes.data.user.id}/role`, {
      role: 'ADMIN'
    }, adminCookie);
    assert(promoteRes.statusCode === 200 && promoteRes.data.data.role === 'ADMIN', 'Admin successfully promotes user role');

    // Admin demotes test regular user back to USER
    const demoteRes = await request('PATCH', `/api/admin/users/${regRes.data.user.id}/role`, {
      role: 'USER'
    }, adminCookie);
    assert(demoteRes.statusCode === 200 && demoteRes.data.data.role === 'USER', 'Admin successfully demotes user back to USER');

    // 5. User Data Isolation
    console.log('\n5. Testing User Data Isolation on Tasks...');
    
    // User creates a personal task
    const userTaskRes = await request('POST', '/api/tasks', {
      title: 'Standard User Secret Task',
      description: 'Confidential deliverable for standard user only',
      priority: 'High'
    }, userCookie);
    assert(userTaskRes.statusCode === 201, 'Standard user creates task (HTTP 201)');
    const userTaskId = userTaskRes.data.data.id;

    // Admin creates an admin task
    const adminTaskRes = await request('POST', '/api/tasks', {
      title: 'Admin Infrastructure Audit',
      description: 'Admin-only critical operations task',
      priority: 'Critical'
    }, adminCookie);
    assert(adminTaskRes.statusCode === 201, 'Admin creates task (HTTP 201)');
    const adminTaskId = adminTaskRes.data.data.id;

    // Standard user fetches tasks -> should ONLY see user's own task, NOT admin task
    const userTaskList = await request('GET', '/api/tasks', null, userCookie);
    const userTaskIds = userTaskList.data.data.map(t => t.id);
    assert(userTaskIds.includes(userTaskId), 'Standard user task list includes their own task');
    assert(!userTaskIds.includes(adminTaskId), 'Standard user CANNOT see admin task (Data Isolation Verified)');

    // Standard user attempts to edit admin task -> HTTP 403 or 404
    const maliciousEdit = await request('PUT', `/api/tasks/${adminTaskId}`, {
      title: 'Tampered by standard user'
    }, userCookie);
    assert(maliciousEdit.statusCode === 403 || maliciousEdit.statusCode === 404, 'Standard user blocked from modifying another user task');

    // Admin fetches tasks -> Admin has global view and can see both
    const adminTaskList = await request('GET', '/api/tasks', null, adminCookie);
    const adminTaskIds = adminTaskList.data.data.map(t => t.id);
    assert(adminTaskIds.includes(userTaskId) && adminTaskIds.includes(adminTaskId), 'Admin has administrative visibility across all tasks');

    // 6. Protocol 5 Enforcement (Non-Reversible Completion)
    console.log('\n6. Testing Protocol 5 (Non-Reversible Completion)...');
    
    // Complete the standard user task
    const completeRes = await request('PATCH', `/api/tasks/${userTaskId}/complete`, {}, userCookie);
    assert(completeRes.statusCode === 200, 'Task completed successfully');

    // Attempt to reopen completed task via PUT
    const reopenRes = await request('PUT', `/api/tasks/${userTaskId}`, {
      status: 'ongoing',
      title: 'Trying to reopen'
    }, userCookie);
    assert(reopenRes.statusCode === 403, 'Modifying completed task is blocked by Protocol 5 (HTTP 403 Forbidden)');

    // Attempt to delete completed task
    const deleteRes = await request('DELETE', `/api/tasks/${userTaskId}`, null, userCookie);
    assert(deleteRes.statusCode === 403, 'Deleting completed task is blocked by Protocol 5 (HTTP 403 Forbidden)');

    // 7. Audit Logging Verification
    console.log('\n7. Testing Immutable Audit Logging...');
    const auditLogsRes = await request('GET', '/api/admin/audit-logs?limit=50', null, adminCookie);
    assert(auditLogsRes.statusCode === 200 && Array.isArray(auditLogsRes.data.data), 'Audit logs retrieved successfully');
    
    const actions = auditLogsRes.data.data.map(l => l.action);
    assert(actions.includes('USER_REGISTER'), 'Audit log contains USER_REGISTER action');
    assert(actions.includes('LOGIN_SUCCESS'), 'Audit log contains LOGIN_SUCCESS action');
    assert(actions.includes('ROLE_CHANGE'), 'Audit log contains ROLE_CHANGE action');
    assert(actions.includes('TASK_CREATE'), 'Audit log contains TASK_CREATE action');
    assert(actions.includes('TASK_COMPLETE'), 'Audit log contains TASK_COMPLETE action');

    // Check that sensitive data is NEVER in audit metadata
    let hasLeak = false;
    for (const log of auditLogsRes.data.data) {
      const metaStr = JSON.stringify(log.metadata || {});
      if (metaStr.includes('password') || metaStr.includes('Password123!') || metaStr.includes('token') || metaStr.includes('hash')) {
        hasLeak = true;
        break;
      }
    }
    assert(!hasLeak, 'Zero sensitive credentials or tokens found in audit metadata (Audit Privacy Verified)');

    // 8. Logout & Session Termination
    console.log('\n8. Testing Logout & Session Termination...');
    const logoutRes = await request('POST', '/api/auth/logout', {}, userCookie);
    assert(logoutRes.statusCode === 200, 'POST /api/auth/logout succeeded (HTTP 200)');
    
    // Request with cleared cookie
    const expiredCookie = logoutRes.cookieHeader;
    const meAfterLogout = await request('GET', '/api/auth/me', null, expiredCookie);
    assert(meAfterLogout.statusCode === 401, 'Session invalidated after logout; /api/auth/me returns 401 Unauthorized');

  } catch (error) {
    console.error('Test execution error:', error);
    testsFailed++;
  }

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${testsPassed} PASSED | ${testsFailed} FAILED`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
