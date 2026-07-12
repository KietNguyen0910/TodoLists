const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'admin';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'dev-auth-token';
const AUTH_USER_LABEL = process.env.AUTH_USER_LABEL || AUTH_USERNAME;

const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

function getAuthUser(req) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (token && token === AUTH_TOKEN) {
    return { username: AUTH_USERNAME, label: AUTH_USER_LABEL };
  }

  return null;
}

function requireAuth(req, res, next) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Login required.' });
  }

  req.authUser = user;
  next();
}

function login(req, res) {
  const { username, password } = req.body || {};
  const isUsernameValid = normalizeUsername(username) === normalizeUsername(AUTH_USERNAME);
  const isPasswordValid = String(password || '') === AUTH_PASSWORD;

  if (isUsernameValid && isPasswordValid) {
    return res.json({
      token: AUTH_TOKEN,
      user: { username: AUTH_USERNAME, label: AUTH_USER_LABEL },
    });
  }

  return res.status(401).json({ message: 'Invalid username or password.' });
}

module.exports = {
  getAuthUser,
  requireAuth,
  login,
};
