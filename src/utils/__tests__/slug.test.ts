// import { generateSlug, generateTenderSlug } from '../slug';

// describe('utils/slug', () => {
//   describe('generateSlug', () => {
//     it('converts text to lowercase and replaces spaces with hyphens', () => {
//       expect(generateSlug('Hello World')).toBe('hello-world');
//     });

//     it('strips special characters and trims whitespace', () => {
//       expect(generateSlug('  Special @#$ Project %^& 2026!  ')).toBe(
//         'special-dollar-project-percentand-2026',
//       );
//     });

//     it('handles empty or special character only strings', () => {
//       expect(generateSlug('!!!')).toBe('');
//     });
//   });

//   describe('generateTenderSlug', () => {
//     it('combines title and reference number into a URL-safe slug', () => {
//       const slug = generateTenderSlug('Construction Project NYC', '2024-001');
//       expect(slug).toBe('construction-project-nyc-2024-001');
//     });

//     it('truncates title portion to 60 characters and strips trailing hyphens before adding ref', () => {
//       const longTitle = 'a'.repeat(70);
//       const slug = generateTenderSlug(longTitle, 'REF-123');
//       expect(slug).toBe(`${'a'.repeat(60)}-ref-123`);
//     });

//     it('handles special characters in both title and reference number', () => {
//       const slug = generateTenderSlug('RFP #100: Highway Maintenance & Repair', 'REF/2026/001');
//       expect(slug).toBe('rfp-100-highway-maintenance-and-repair-ref2026001');
//     });
//   });
// });
