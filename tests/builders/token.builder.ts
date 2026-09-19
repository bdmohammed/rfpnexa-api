// /**
//  * tests/builders/token.builder.ts
//  *
//  * Test Token Builder and Factory for EmailToken entities.
//  */
// import { AppDataSource } from '@/config/database';
// import { createEmailToken } from '@/services/token.service';
// import { EmailTokenType } from '@/types/enums';

// export class EmailTokenBuilder {
//   private userId: string = '';
//   private tokenType: EmailTokenType = EmailTokenType.EMAIL_VERIFICATION;

//   forUser(userId: string): this {
//     this.userId = userId;
//     return this;
//   }

//   withType(type: EmailTokenType): this {
//     this.tokenType = type;
//     return this;
//   }

//   async create(): Promise<{ rawToken: string }> {
//     if (!this.userId) {
//       throw new Error('EmailTokenBuilder requires a userId. Call .forUser(userId) first.');
//     }

//     let rawToken = '';
//     await AppDataSource.transaction(async (manager) => {
//       rawToken = await createEmailToken(this.userId, this.tokenType, manager);
//     });

//     return { rawToken };
//   }
// }
