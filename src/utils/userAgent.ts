// import { UAParser } from 'ua-parser-js';

// import type { Request } from 'express';

// export interface ParsedUserAgent {
//   browser: string;
//   browserVersion: string | null;
//   os: string;
//   osVersion: string | null;
//   device:
//     'desktop' | 'mobile' | 'tablet' | 'smarttv' | 'wearable' | 'embedded' | 'console' | 'unknown';
// }

// /**
//  * Safely parses a raw User-Agent header into structured browser, OS, and device classification metadata.
//  */
// export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
//   if (!userAgent) {
//     return {
//       browser: 'Unknown',
//       browserVersion: null,
//       os: 'Unknown',
//       osVersion: null,
//       device: 'unknown',
//     };
//   }

//   const parser = new UAParser(userAgent);
//   const result = parser.getResult();

//   return {
//     browser: result.browser.name ?? 'Unknown',
//     browserVersion: result.browser.major ?? null,
//     os: result.os.name ?? 'Unknown',
//     osVersion: result.os.version ?? null,
//     device: (result.device.type ?? 'desktop') as ParsedUserAgent['device'],
//   };
// }

// /**
//  * Masks IP address for user privacy protection (IPv4 e.g. 192.168.15.xxx, IPv6 e.g. 2001:db8:abcd::/64).
//  */
// export function maskIpAddress(ipAddress: string | null): string | null {
//   if (!ipAddress || typeof ipAddress !== 'string') return null;
//   const ip = ipAddress.trim();

//   if (ip.includes('.')) {
//     const parts = ip.split('.');
//     if (parts.length === 4) {
//       return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
//     }
//   } else if (ip.includes(':')) {
//     const parts = ip.split(':');
//     if (parts.length >= 3) {
//       return `${parts[0]}:${parts[1]}:${parts[2]}::/64`;
//     }
//   }

//   return ip;
// }

// export interface RequestMetadata {
//   ipAddress: string;
//   userAgent: string | null;
// }

// export const getRequestMetadata = (req: Request): RequestMetadata => ({
//   ipAddress: req.ip as string,
//   userAgent: req.get('user-agent') ?? null,
// });
