async function testEndpoint() {
  const url = 'http://localhost:3000/api/pricing';
  const start = Date.now();
  try {
    const res = await fetch(url);
    const text = await res.text();
    return { status: res.status, time: Date.now() - start, success: res.ok, text: text.substring(0, 50) };
  } catch (e) {
    return { status: 'error', time: Date.now() - start, success: false, text: e.message };
  }
}

async function runLoadTest(concurrent, total) {
  console.log(`Starting load test: ${total} requests, ${concurrent} concurrent...`);
  const promises = [];
  let completed = 0;
  let successes = 0;
  let failures = 0;
  
  const worker = async () => {
    while (completed < total) {
      completed++;
      const res = await testEndpoint();
      if (res.success) successes++;
      else {
        failures++;
        if (failures === 1) console.log("First failure text:", res.text);
      }
      if (completed % 100 === 0) console.log(`Progress: ${completed}/${total} (Success: ${successes}, Fail: ${failures})`);
    }
  };

  const workers = Array.from({ length: concurrent }, worker);
  const start = Date.now();
  await Promise.all(workers);
  const duration = Date.now() - start;
  
  console.log('--- Load Test Results ---');
  console.log(`Total Requests: ${total}`);
  console.log(`Time taken: ${duration}ms`);
  console.log(`Req/sec: ${(total / (duration / 1000)).toFixed(2)}`);
  console.log(`Successes: ${successes}`);
  console.log(`Failures: ${failures}`);
}

runLoadTest(200, 1000);
