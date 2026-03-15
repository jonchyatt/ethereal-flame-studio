import { query } from '@anthropic-ai/claude-code';

// Simulate the same env as PM2 jarvis-web (WITH CLAUDECODE)
process.env.CLAUDECODE = '1';

console.log('Testing SDK with CLAUDECODE=1 but passing clean env...');

const cleanEnv = {};
for (const [k, v] of Object.entries(process.env)) {
  if (k !== 'CLAUDECODE' && v !== undefined) cleanEnv[k] = v;
}

try {
  const conversation = query({
    prompt: 'Say hello in 5 words',
    options: {
      cwd: process.cwd(),
      allowedTools: [],
      permissionMode: 'bypassPermissions',
      env: cleanEnv,
      maxTurns: 1,
    },
  });

  for await (const event of conversation) {
    console.log('Event:', event.type, event.subtype || '');
    if (event.type === 'result') console.log('Result:', event.result);
  }
  console.log('SDK test: PASS');
} catch (err) {
  console.error('SDK test: FAIL:', err.message);
}
