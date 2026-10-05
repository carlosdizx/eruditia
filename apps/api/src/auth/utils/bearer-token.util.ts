const extractBearerToken = (authorization?: string): string | null => {
  if (!authorization) return null;

  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length) return null;

  return token;
};

export default extractBearerToken;
