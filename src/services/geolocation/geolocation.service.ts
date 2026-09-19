// import {
//   DisabledGeoIpProvider,
//   type GeoLocationProvider,
//   IpApiProvider,
//   LocalGeoIpProvider,
// } from './providers/geolocation.provider';

// import { env } from '@/config/env';
// import { CacheService } from '@/services/cache.service';

// const CACHE_PREFIX = 'geoip:';
// const CACHE_TTL_SECONDS = 86400; // 24 hours

// export class GeoLocationService {
//   private static readonly provider: GeoLocationProvider = GeoLocationService.createProvider();

//   private static createProvider(): GeoLocationProvider {
//     if (!env.GEOLOCATION_ENABLED || env.GEOLOCATION_PROVIDER === 'disabled') {
//       return new DisabledGeoIpProvider();
//     }
//     if (env.GEOLOCATION_PROVIDER === 'local') {
//       return new LocalGeoIpProvider();
//     }
//     return new IpApiProvider();
//   }

//   public static isLocalIp(ip: string): boolean {
//     return (
//       ip === '127.0.0.1' ||
//       ip === '::1' ||
//       ip.startsWith('192.168.') ||
//       ip.startsWith('10.') ||
//       ip.startsWith('172.16.') ||
//       ip.startsWith('::ffff:127.0.0.1')
//     );
//   }

//   /**
//    * Resolves physical location description for an IP address.
//    * Utilizes CacheService (L1 memory + L2 Redis) before invoking external providers.
//    */
//   public static async resolveIpLocation(ip: string | null): Promise<string> {
//     if (!ip) {
//       return 'Unknown';
//     }

//     if (!env.GEOLOCATION_ENABLED || env.GEOLOCATION_PROVIDER === 'disabled') {
//       return 'Disabled';
//     }

//     const cleanIp = ip.trim().split(',')[0] ?? '';

//     if (this.isLocalIp(cleanIp)) {
//       return 'Localhost';
//     }

//     const cacheKey = `${CACHE_PREFIX}${cleanIp}`;

//     // L1 / L2 Cache lookup
//     const cached = await CacheService.get<string>(cacheKey);
//     if (cached) {
//       return cached;
//     }

//     // Resolve via provider
//     const location = await this.provider.resolve(cleanIp);

//     if (location && location !== 'Unknown') {
//       await CacheService.set(cacheKey, location, CACHE_TTL_SECONDS);
//     }

//     return location;
//   }
// }
