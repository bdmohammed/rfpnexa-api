import { Router } from 'express';

import { adminAuthBootstrapRoutes } from './admin/routes/auth.admin.bootstrap.routes';
import { adminAuthPublicRoutes } from './admin/routes/auth.admin.public.routes';
import { emailAuthRoutes } from './credentials/routes/auth.email.routes';
import { authPasswordRoutes } from './credentials/routes/auth.password.routes';
import { customerAuthPrivateRoutes } from './customer/routes/auth.customer.private.routes';
import { customerAuthPublicRoutes } from './customer/routes/auth.customer.public.routes';
import { oauthAuthRoutes } from './oauth/auth.oauth.routes';
import { sessionAuthRoutes } from './session/auth.session.routes';
import { tokenAuthRoutes } from './token/auth.token.routes';

const router = Router();

// ─── Customer Authentication (Public & Private) ──────────────────────────────
router.use(customerAuthPublicRoutes);
router.use(customerAuthPrivateRoutes);

// ─── Social OAuth Authentication ─────────────────────────────────────────────
router.use(oauthAuthRoutes);

// ─── Session & Token Management ──────────────────────────────────────────────
router.use(tokenAuthRoutes);
router.use(sessionAuthRoutes);

// ─── Email & Password Management ─────────────────────────────────────────────
router.use(emailAuthRoutes);
router.use(authPasswordRoutes);

// ─── Admin Authentication & Bootstrap ─────────────────────────────────────────
router.use('/admin', adminAuthPublicRoutes);
router.use('/admin', adminAuthBootstrapRoutes);

export { router as authRouter };
