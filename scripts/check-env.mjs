// Tiny script to print CLAUDECODE env when run by PM2
console.log('CLAUDECODE=' + JSON.stringify(process.env.CLAUDECODE));
console.log('Has CLAUDECODE:', 'CLAUDECODE' in process.env);
process.exit(0);
