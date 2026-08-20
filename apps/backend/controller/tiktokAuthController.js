const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');
const tiktokOAuthService = require('../services/tiktok/tiktokOAuthService');

const TIKTOK_LOGIN_SCOPE = 'user.info.basic';
const TIKTOK_DEFAULT_EXPIRES_IN = '7d';

const getPrisma = () => getSharedPrismaClient();

function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeState(state) {
  try {
    return JSON.parse(Buffer.from(String(state || ''), 'base64url').toString('utf8'));
  } catch (err) {
    return null;
  }
}

function safeRedirectPath(redirect, fallback) {
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect;
  }
  return fallback || '/';
}

exports.login = async (req, res) => {
  try {
    const companyId = String(req.query.companyId || '').trim();
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId ┘à╪╖┘ä┘ê╪¿' });
    }

    const redirect = safeRedirectPath(req.query.redirect, '/account');
    const state = encodeState({ companyId, redirect });

    const settings = await tiktokOAuthService.getSettings(companyId);
    const { clientKey, clientSecret } = tiktokOAuthService.getAppCredentials(settings);
    if (!clientKey || !clientSecret) {
      return res.redirect(`${redirect}?tiktokAuth=error`);
    }

    const redirectUri = tiktokOAuthService.getRedirectUri();
    const authUrl = tiktokOAuthService.buildAuthUrl(clientKey, redirectUri, TIKTOK_LOGIN_SCOPE, state);
    return res.redirect(authUrl);
  } catch (error) {
    console.error('Γ¥î [TIKTOK-AUTH] login error:', error);
    const companyId = String(req.query.companyId || '').trim();
    const redirect = safeRedirectPath(req.query.redirect, companyId ? `/${companyId}` : '/');
    return res.redirect(`${redirect}?tiktokAuth=error`);
  }
};

exports.callback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    const decoded = decodeState(state);
    const companyId = decoded?.companyId;
    const fallbackRedirect = companyId ? `/${companyId}` : '/';
    const redirect = safeRedirectPath(decoded?.redirect, fallbackRedirect);

    if (error || !code || !companyId) {
      return res.redirect(`${redirect}?tiktokAuth=error`);
    }

    const settings = await tiktokOAuthService.getSettings(companyId);
    const { clientKey, clientSecret } = tiktokOAuthService.getAppCredentials(settings);
    if (!clientKey || !clientSecret) {
      return res.redirect(`${redirect}?tiktokAuth=error`);
    }

    const redirectUri = tiktokOAuthService.getRedirectUri();
    const rawToken = await tiktokOAuthService.exchangeCodeForToken(code, redirectUri, clientKey, clientSecret);

    const tokenData = {
      open_id: rawToken?.open_id ?? rawToken?.data?.open_id,
      access_token: rawToken?.access_token ?? rawToken?.data?.access_token,
      refresh_token: rawToken?.refresh_token ?? rawToken?.data?.refresh_token,
      expires_in: rawToken?.expires_in ?? rawToken?.data?.expires_in,
      scope: rawToken?.scope ?? rawToken?.data?.scope,
    };

    if (!tokenData.access_token) {
      return res.redirect(`${redirect}?tiktokAuth=error`);
    }

    await tiktokOAuthService.saveToken(companyId, tokenData);

    const userInfo = await tiktokOAuthService.fetchUserInfo(tokenData.access_token);
    const openId = userInfo?.open_id;
    if (!openId) {
      return res.redirect(`${redirect}?tiktokAuth=error`);
    }

    const prisma = getPrisma();
    let customer = await prisma.customer.findUnique({
      where: { tiktokId_companyId: { tiktokId: openId, companyId } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: userInfo?.display_name || 'TikTok',
          lastName: 'User',
          tiktokId: openId,
          companyId,
          status: 'LEAD',
        },
      });
    }

    const token = jwt.sign(
      {
        userId: customer.id,
        customerId: customer.id,
        role: 'CUSTOMER',
        companyId: customer.companyId,
      },
      getJwtSecret(),
      { expiresIn: TIKTOK_DEFAULT_EXPIRES_IN }
    );

    const separator = redirect.includes('?') ? '&' : '?';
    return res.redirect(`${redirect}${separator}tiktokAuth=success&token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('Γ¥î [TIKTOK-AUTH] callback error:', err);
    const decoded = decodeState(req.query.state);
    const companyId = decoded?.companyId;
    const redirect = safeRedirectPath(decoded?.redirect, companyId ? `/${companyId}` : '/');
    return res.redirect(`${redirect}?tiktokAuth=error`);
  }
};

exports.me = async (req, res) => {
  try {
    const customerId = req.user?.customerId || req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;

    if (!customerId || !companyId) {
      return res.status(401).json({ success: false, message: '╪▒┘à╪▓ ╪º┘ä┘à╪╡╪º╪»┘é╪⌐ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });
    }

    const prisma = getPrisma();
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
    });

    if (!customer) {
      return res.status(401).json({ success: false, message: '╪º┘ä╪╣┘à┘è┘ä ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });
    }

    return res.json({
      success: true,
      data: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        firstName: customer.firstName,
        lastName: customer.lastName,
        tiktokId: customer.tiktokId,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error('Γ¥î [TIKTOK-AUTH] me error:', error);
    return res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¬╪¡┘à┘è┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╣┘à┘è┘ä' });
  }
};
