const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/i,
  /^(fc|fd)[0-9a-f]{2}:/i, // ULA: fc00::/7
  /^fe80:/i, // link-local
];

const BLOCKED_HOSTNAMES = ['localhost', 'metadata.google.internal'];

/** Validate URL and resolve DNS to check for SSRF. Returns validated URL. */
export async function validateUrl(url: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`HTTPS required. Got: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error(`Private/blocked hostname: ${hostname}`);
  }

  // Check literal IP addresses
  if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/) || hostname.includes(':')) {
    checkPrivateIp(hostname);
  } else {
    // DNS resolution check: resolve hostname (both IPv4 and IPv6) and verify all IPs are public
    const dns = await import('dns');
    const { promisify } = await import('util');
    const resolve4 = promisify(dns.resolve4);
    const resolve6 = promisify(dns.resolve6);

    const allIps: string[] = [];

    try {
      const ipv4s = await resolve4(hostname);
      allIps.push(...ipv4s);
    } catch (err: any) {
      if (err.code === 'ENOTFOUND') throw new Error(`Cannot resolve hostname: ${hostname}`);
      // ENODATA = no A records, might have AAAA only
    }

    try {
      const ipv6s = await resolve6(hostname);
      allIps.push(...ipv6s);
    } catch {
      // ENODATA = no AAAA records
    }

    // If both lookups failed, reject
    if (allIps.length === 0) {
      throw new Error(`Cannot resolve hostname to any IP: ${hostname}`);
    }

    for (const ip of allIps) {
      checkPrivateIp(ip);
    }
  }

  return parsed;
}

function checkPrivateIp(ip: string): void {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    const mappedIpv4 = decodeMappedIpv4(mapped);
    if (mappedIpv4) {
      checkPrivateIp(mappedIpv4);
      return;
    }
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(normalized)) {
      throw new Error(`Private IP address not allowed: ${ip}`);
    }
  }
}

function decodeMappedIpv4(mapped: string): string | null {
  // Dotted form: ::ffff:127.0.0.1
  if (/^\d+\.\d+\.\d+\.\d+$/.test(mapped)) {
    return mapped;
  }

  // Hex form: ::ffff:7f00:1
  const hexMatch = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hexMatch) return null;

  const high = parseInt(hexMatch[1], 16);
  const low = parseInt(hexMatch[2], 16);
  if (!Number.isFinite(high) || !Number.isFinite(low)) return null;

  const a = (high >> 8) & 0xff;
  const b = high & 0xff;
  const c = (low >> 8) & 0xff;
  const d = low & 0xff;
  return `${a}.${b}.${c}.${d}`;
}
