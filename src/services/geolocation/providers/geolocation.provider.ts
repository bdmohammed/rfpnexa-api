// import { env } from '@/config/env';
// import { logger } from '@/config/logger';

// export interface GeoLocationProvider {
//   resolve(ip: string): Promise<string>;
// }

// export class DisabledGeoIpProvider implements GeoLocationProvider {
//   public async resolve(_ip: string): Promise<string> {
//     return 'Disabled';
//   }
// }

// export class LocalGeoIpProvider implements GeoLocationProvider {
//   public async resolve(_ip: string): Promise<string> {
//     return 'Localhost';
//   }
// }

// export class IpApiProvider implements GeoLocationProvider {
//   public async resolve(cleanIp: string): Promise<string> {
//     const controller = new AbortController();
//     const timeoutMs = env.GEOLOCATION_TIMEOUT_MS ?? 2000;
//     const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

//     try {
//       const url = (env.GEOLOCATION_API_URL || 'https://ipapi.co/{ip}/json/').replace(
//         '{ip}',
//         cleanIp,
//       );
//       const response = await fetch(url, {
//         signal: controller.signal,
//         headers: {
//           'User-Agent': 'RFPNexa-SecurityService/1.0',
//         },
//       });

//       if (!response.ok) {
//         return 'Unknown';
//       }

//       const data = (await response.json()) as Record<string, string>;
//       if (data.city || data.country_name) {
//         const parts = [data.city, data.region, data.country_name].filter(Boolean);
//         return parts.join(', ') || 'Unknown';
//       }
//     } catch (err) {
//       logger.warn({ err, ip: cleanIp }, 'IP geolocation lookup failed or timed out');
//     } finally {
//       clearTimeout(timeoutId);
//     }

//     return 'Unknown';
//   }
// }
