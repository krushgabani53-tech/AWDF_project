const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runSupportTests() {
  console.log('--- STARTING PHASE 5 SUPPORT & CONTACT MODULE TESTS ---');
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
    // 1. Test SMTP Status Endpoint
    console.log('\n1. Testing SMTP Status Endpoint...');
    const statusRes = await axios.get(`${BASE_URL}/support/status`);
    assert(
      statusRes.status === 200 && statusRes.data.success && Boolean(statusRes.data.smtp?.status),
      'GET /api/support/status returns valid status structure',
      JSON.stringify(statusRes.data)
    );
    assert(
      !statusRes.data.smtp.password && !statusRes.data.smtp.SMTP_PASS,
      'No SMTP credentials or secrets exposed to frontend'
    );
    console.log(`   Reported SMTP Status: ${statusRes.data.smtp.status}`);

    // 2. Test Validation: Empty Form Submission
    console.log('\n2. Testing Validation: Empty Form Submission...');
    try {
      await axios.post(`${BASE_URL}/support/tickets`, {});
      assert(false, 'Empty submission rejection (Should return 400)');
    } catch (err) {
      assert(
        err.response?.status === 400,
        'Empty submission rejected with HTTP 400',
        err.response?.data?.message
      );
    }

    // 3. Test Validation: Invalid Email Format
    console.log('\n3. Testing Validation: Invalid Email Format...');
    try {
      await axios.post(`${BASE_URL}/support/tickets`, {
        full_name: 'Test User',
        email: 'invalid-email-format',
        category: 'Bug Report',
        message: 'This is a valid long description message for bug testing.',
      });
      assert(false, 'Invalid email rejection (Should return 400)');
    } catch (err) {
      assert(
        err.response?.status === 400 && err.response?.data?.message?.includes('valid email'),
        'Invalid email rejected with HTTP 400',
        err.response?.data?.message
      );
    }

    // 4. Test Validation: Short Message (< 10 characters)
    console.log('\n4. Testing Validation: Short Message...');
    try {
      await axios.post(`${BASE_URL}/support/tickets`, {
        full_name: 'Test User',
        email: 'test@example.com',
        category: 'Technical Issue',
        message: 'Too short',
      });
      assert(false, 'Short message rejection (Should return 400)');
    } catch (err) {
      assert(
        err.response?.status === 400 && err.response?.data?.message?.includes('at least 10 characters'),
        'Short message rejected with HTTP 400',
        err.response?.data?.message
      );
    }

    // 5. Test Valid Ticket Submission
    console.log('\n5. Testing Valid Ticket Submission...');
    const ticketPayload = {
      full_name: 'Krush Gabani',
      email: 'krushgabani53@gmail.com',
      category: 'Technical Issue',
      message: 'Persistent latency anomaly observed in audit log ingestion service.',
    };

    const submitRes = await axios.post(`${BASE_URL}/support/tickets`, ticketPayload);
    assert(
      submitRes.status === 201 && submitRes.data.success && Boolean(submitRes.data.data.ticket_reference),
      'Valid Ticket Submission (HTTP 201 & Reference Generated)',
      JSON.stringify(submitRes.data)
    );
    const createdTicket = submitRes.data.data;
    console.log(`   Generated Ticket Reference: ${createdTicket.ticket_reference}`);

    // 6. Test Default Status & Priority in PostgreSQL
    console.log('\n6. Verifying Ticket Fields & Default Constraints...');
    assert(createdTicket.status === 'Open', 'Default status is "Open"');
    assert(createdTicket.priority === 'Standard', 'Default priority is "Standard"');
    assert(Boolean(createdTicket.created_at), 'Timestamp recorded');

    // 7. Test Ticket Lookup with Verified Email
    console.log('\n7. Testing Ticket Lookup with Verified Email...');
    const lookupRes = await axios.get(
      `${BASE_URL}/support/tickets/${createdTicket.ticket_reference}?email=${encodeURIComponent('krushgabani53@gmail.com')}`
    );
    assert(
      lookupRes.status === 200 &&
      lookupRes.data.success &&
      lookupRes.data.data.ticket_reference === createdTicket.ticket_reference,
      'Ticket Lookup with Verified Email (Success)',
      JSON.stringify(lookupRes.data)
    );

    // 8. Test Ticket Lookup with Incorrect Email (Security Check)
    console.log('\n8. Testing Security: Ticket Lookup with Wrong Email...');
    try {
      await axios.get(
        `${BASE_URL}/support/tickets/${createdTicket.ticket_reference}?email=unauthorized@example.com`
      );
      assert(false, 'Wrong email rejection (Should return 404/security rejection)');
    } catch (err) {
      assert(
        err.response?.status === 404,
        'Wrong email rejected with HTTP 404 (Access Denied / Verification Failed)',
        err.response?.data?.message
      );
    }

    // 9. Test Ticket Lookup Missing Email
    console.log('\n9. Testing Security: Ticket Lookup Missing Email Parameter...');
    try {
      await axios.get(`${BASE_URL}/support/tickets/${createdTicket.ticket_reference}`);
      assert(false, 'Missing email rejection (Should return 400)');
    } catch (err) {
      assert(
        err.response?.status === 400,
        'Missing email parameter rejected with HTTP 400',
        err.response?.data?.message
      );
    }

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

runSupportTests();

