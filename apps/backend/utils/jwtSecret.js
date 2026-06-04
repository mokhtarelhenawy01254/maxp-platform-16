const buildMissingSecretError = (name) => {
  const error = new Error(`${name} is not configured`);
  error.code = 'AUTH_SECRET_MISSING';
  error.secretName = name;
  error.status = 500;
  return error;
};

const requireEnvSecret = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw buildMissingSecretError(name);
  }
  return value;
};

const getJwtSecret = () => requireEnvSecret('JWT_SECRET');

const getJwtRefreshSecret = () => {
  const refreshSecret = String(process.env.JWT_REFRESH_SECRET || '').trim();
  return refreshSecret || getJwtSecret();
};

const isMissingAuthSecretError = (error) => error?.code === 'AUTH_SECRET_MISSING';

module.exports = {
  getJwtSecret,
  getJwtRefreshSecret,
  isMissingAuthSecretError
};
