import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(import.meta.dirname, '..', '.env.local');
const env = readFileSync(envPath, 'utf8');

// The JSON object we need (reconstructed from the broken env)
const calJson = {
  type: "service_account",
  project_id: "phrasal-indexer-488919-b3",
  private_key_id: "2d029b297ae8d5d4a5ed68471ff91b42507933ee",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQD48JfH0XktkriO\nej480TofLSX6vHJwRqQU2fcI7N7dwPImr0TIuxF6vm/OTaEexgovV23V10l4JImm\n/+awaFkNOTw/47Gxs5agtrhHhOE0o19Fzk80xzf6Z3lApT3e/Vpii2tMekc8BJQ/\n1Q/fogdmNTwuoxy1VeMLknYeXxTjVNlaNpKWA1jkxNB/rWen3kg5sWXPT+QRO+Cr\nG+HE13JMbQ1+17w9DOYXaOY0gQAoh2YLH49tep928+DE8lyQhvVTZQt+rRrRIGWq\n/I5Kj+mYmS37WTIpQXufmJ03i8SF45uUCrL4wBkv9oly32SsGjcmLcVKxl21Wp04\nJS0+Ab1/AgMBAAECggEAK66sM5gCV4jjcbzppupf9JCLlY/z1NfQewg0XRCTmv38\nf+VJgJ+y1YMNQ3pDx46gwuXolBmO/tIKhY9p/5KP7c4ZUGy4BaKpz9HATGx4yC/S\nzAEDzRMYM4xsrndQgAydC6XDUkwyq8lx6jGM84UPH1RAFz7wDrHfgWxV5cZxd+JX\nGM1kVPU2A7kRE/pXaBf0Qy9XZEp9/OmfxePmRYJmiMfq6mJCYwG1yCczHk843tX5\nmWgTZ+PagCPOflH9ADzoEatedIaAp3afUuwucNHcByNhWJ1PNzMLX26GQFLAU7yX\n8vI15sSu7Y6HJ/qBu9KCHeC8JfAgRUd4RISbcOax4QKBgQD9OltrlO3Dqvii+pmj\naJi8N9TBzoxV4wJsHyn5MGS4PzEF2U7Hzae5PW5TGOUPqJDT3kKCdmsg0d2kGeIA\n02ezoNRELQKCWF4X6boelGsaRVnRDYUcZ4LeGHzyXa0JbyjQ23kkD9V4ivdaIr20\nuCKpdYBQL5hLMSR54rRnMyquYwKBgQD7qjf/3KGVBuKZVAb1QYMRad+cWnpPmKPY\n0geK3/Eq41RYcmXawy7XVAka3ZUwvlG96MwGdzXohIjdyiEdF3VxonYQEePTBMBf\nLE0AkB2UFszXoYxR2Y7UrfpT4Zgxo6o8ninkjED2QSWL85QR8CH76tk4w6Tlbd4K\nInz5NXHBNQKBgCoR7+5Hp9jCJtys1amYTwe2Htqz/gym0lg0NTz5FUKm/PYDzFrV\nh+/2jMWxdRzM3ILWgiY6lkG1nCUPR8TrWmc1aQ6Ki8gr9jXy1sEN111d+DYLEPpP\nGCbd2qRJe939YcKRM+cR2l1UeRO4gdvsW5Xbt52ayqpzV6QITgB3N7gRAoGAP+IJ\nrQ1YhvfkdX969K7YkocJmCrveV0J2nQWLg6CrZxfQMRpTorVTRur5AHzaRgmr8p0\nX//K02cxRvuUREo8KchPp+yipGJEYuRf95CdsYXIIcSEVhKfyyUOslRFyfP9tr1/\nbOCdbOVEnq4KHDOUrNoEogAnz4WAI5p1lt0WLzECgYB0YM0KN2YPifapjR39ccgS\nJgS88gNK2E62kNUf3U8a3CCBnk1yyziX410TUYUFh7kYSnx8EBDRB9q4s6fUOgxY\nbhbptz1awEoLT4vaBAjpypeECsxWFL0XhRhNetncX33+OY3HG9AFSzWhfkTLP4cb\nNfAPfzvjVrSwdCMLT13N7w==\n-----END PRIVATE KEY-----\n",
  client_email: "jarvis-calendar-reader@phrasal-indexer-488919-b3.iam.gserviceaccount.com",
  client_id: "102786153009808211659",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/jarvis-calendar-reader%40phrasal-indexer-488919-b3.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

// Verify it parses
const jsonStr = JSON.stringify(calJson);
JSON.parse(jsonStr); // will throw if invalid
console.log('JSON valid, length:', jsonStr.length);

// Replace the line in .env.local - use single quotes to avoid escaping issues
const lines = env.split('\n');
const idx = lines.findIndex(l => l.startsWith('GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON='));
if (idx === -1) { console.error('Line not found'); process.exit(1); }

// Use single quotes around the JSON value
lines[idx] = `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON='${jsonStr}'`;
writeFileSync(envPath, lines.join('\n'));
console.log('Fixed .env.local line', idx + 1);
