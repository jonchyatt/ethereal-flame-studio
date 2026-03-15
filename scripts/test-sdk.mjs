import { query } from '@anthropic-ai/claude-code';

console.log('Testing Claude Code SDK...');
console.log('CLAUDECODE env:', process.env.CLAUDECODE || '(not set)');

try {
  const conversation = query({
    prompt: 'Say hello in 5 words',
    options: {
      cwd: process.cwd(),
      allowedTools: [],
      permissionMode: 'bypassPermissions',
      maxTurns: 1,
    },
  });

  for await (const event of conversation) {
    console.log('Event:', event.type, event.subtype || '');
    if (event.type === 'result') {
      console.log('Result:', event.result);
    }
    if (event.type === 'error') {
      console.log('Error event:', JSON.stringify(event));
    }
  }
  console.log('SDK test: PASS');
} catch (err) {
  console.error('SDK test: FAIL');
  console.error('Error:', err.message);
  console.error('Full error:', err);
}
