import CookieManager from '@react-native-cookies/cookies';

const convertSameSite = sameSite => {
  switch (sameSite) {
    case 'strict':
      return 'Strict';
    case 'lax':
      return 'Lax';
    case 'no_restriction':
    case 'unspecified':
    default:
      return 'None';
  }
};

const convertCookie = cookie => ({
  name: cookie.name,
  value: cookie.value,
  expires: typeof cookie.expirationDate === 'number' ? new Date(cookie.expirationDate * 1000).toISOString() : null,
  domain: cookie.domain,
  path: cookie.path,
  secure: cookie.secure,
  httpOnly: cookie.httpOnly,
  sameSite: convertSameSite(cookie.sameSite),
});

const addCookies = async (cookies) => {
  if (!cookies || !Array.isArray(cookies)) {
    throw new Error('Cookies must be an array');
  }
  if (!cookies.some(c => c.name === 'SOCS')) {
    cookies.push({
      domain: '.youtube.com',
      hostOnly: false,
      httpOnly: false,
      name: 'SOCS',
      path: '/',
      sameSite: 'Lax',
      secure: true,
      session: false,
      value: 'CAI',
    });
  }
  for (const cookie of cookies) {
    const convertedCookie = convertCookie(cookie);
    await CookieManager.set('https://www.youtube.com', convertedCookie);
  }
};

const addCookiesFromString = async (cookieString) => {
  if (!cookieString || typeof cookieString !== 'string') {
    throw new Error('Cookies must be a string');
  }
  const cookies = cookieString
    .split(';')
    .map(c => {
      const [key, value] = c.split('=');
      return { name: key.trim(), value: value.trim() };
    })
    .filter(Boolean);
  await addCookies(cookies);
};

const createAgent = async (cookies = []) => {
  await addCookies(cookies);
  // React Native does not have a direct equivalent for `agent` functionality.
  return {
    jar: null, // Placeholder if a jar-like structure is needed
  };
};

const createProxyAgent = (options, cookies = []) => {
  console.warn('Proxy agents are not directly supported in React Native. Consider implementing a manual proxy.');
  return {
    dispatcher: null,
    agent: null,
    jar: null,
  };
};

export default {
  addCookies,
  addCookiesFromString,
  createAgent,
  createProxyAgent,
};
