import http from 'http';
import assert from 'assert';

const API_URL = 'http://localhost:3100';
const INTERNAL_SECRET = process.env.SMO_AI_SECRET || 'test-secret';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Starting /summarize route tests...\n');

  try {
    // Test 1: Valid request with title, description, and answers
    console.log('Test 1: Valid request with title, description, and 2 answers');
    const test1 = await request('POST', '/summarize', {
      title: 'How to fix React rendering issues?',
      description: 'I have a React component that is not re-rendering when state changes',
      answers: [
        'Use useCallback to memoize your functions',
        'Check if you are mutating state directly',
      ],
    });
    assert.strictEqual(test1.status, 200, `Expected 200, got ${test1.status}`);
    assert(test1.data.summary, 'Response should contain summary');
    console.log(`✓ Response: ${test1.data.summary}\n`);

    // Test 2: Valid request with only title and description (no answers)
    console.log('Test 2: Valid request with title and description (no answers)');
    const test2 = await request('POST', '/summarize', {
      title: 'What is the difference between let and const?',
      description: 'I am confused about when to use let vs const in JavaScript',
    });
    assert.strictEqual(test2.status, 200, `Expected 200, got ${test2.status}`);
    assert(test2.data.summary, 'Response should contain summary');
    console.log(`✓ Response: ${test2.data.summary}\n`);

    // Test 3: Valid request with a single top answer (one answer is normal)
    console.log('Test 3: Valid request with one answer');
    const test3 = await request('POST', '/summarize', {
      title: 'Best practice for error handling in Node.js?',
      description: 'What are the best practices for handling errors in Node.js applications?',
      answers: [
        'Use try-catch blocks for synchronous code and .catch() for promise chains',
      ],
    });
    assert.strictEqual(test3.status, 200, `Expected 200, got ${test3.status}`);
    assert(test3.data.summary, 'Response should contain summary');
    console.log(`✓ Response: ${test3.data.summary}\n`);

    // Test 4: Missing title (should fail)
    console.log('Test 4: Missing title (should fail with 400)');
    const test4 = await request('POST', '/summarize', {
      description: 'Some description',
    });
    assert.strictEqual(test4.status, 400, `Expected 400, got ${test4.status}`);
    assert(test4.data.error, 'Response should contain error message');
    console.log(`✓ Error: ${test4.data.error}\n`);

    // Test 5: Missing description (should fail)
    console.log('Test 5: Missing description (should fail with 400)');
    const test5 = await request('POST', '/summarize', {
      title: 'Some title',
    });
    assert.strictEqual(test5.status, 400, `Expected 400, got ${test5.status}`);
    assert(test5.data.error, 'Response should contain error message');
    console.log(`✓ Error: ${test5.data.error}\n`);

    // Test 6: Too many answers (should fail)
    console.log('Test 6: More than 3 answers (should fail with 400)');
    const test6 = await request('POST', '/summarize', {
      title: 'Test title',
      description: 'Test description',
      answers: ['Answer 1', 'Answer 2', 'Answer 3', 'Answer 4'],
    });
    assert.strictEqual(test6.status, 400, `Expected 400, got ${test6.status}`);
    assert(test6.data.error, 'Response should contain error message');
    console.log(`✓ Error: ${test6.data.error}\n`);

    // Test 7: Empty answers array
    console.log('Test 7: Empty answers array (should succeed)');
    const test7 = await request('POST', '/summarize', {
      title: 'TypeScript generics tutorial',
      description: 'How do I use generics in TypeScript?',
      answers: [],
    });
    assert.strictEqual(test7.status, 200, `Expected 200, got ${test7.status}`);
    assert(test7.data.summary, 'Response should contain summary');
    console.log(`✓ Response: ${test7.data.summary}\n`);

    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

// Wait for server to be ready
setTimeout(runTests, 1000);
