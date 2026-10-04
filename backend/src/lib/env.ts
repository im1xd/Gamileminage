// Environment access is lazy on purpose: a missing variable must fail the request that needs it,
// never the `next build` step (route modules are imported at build time).

function read(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function secret(name: string, minLength: number): string {
  const value = read(name);
  if (value.length < minLength) throw new Error(`${name} must be at least ${minLength} characters long`);
  return value;
}

const stripSlash = (value: string): string => value.replace(/\/+$/, '');

export const env = {
  get isProd(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  get databaseUrl(): string {
    return read('DATABASE_URL');
  },
  get jwtSecret(): string {
    return secret('JWT_SECRET', 32);
  },
  get proxySecret(): string {
    return secret('PROXY_SECRET', 24);
  },
  get revalidateSecret(): string {
    return secret('REVALIDATE_SECRET', 24);
  },
  get frontendUrl(): string {
    return stripSlash(read('FRONTEND_URL'));
  },
  get allowedOrigins(): string[] {
    const extra = (process.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((item) => stripSlash(item.trim()))
      .filter(Boolean);
    const list = [stripSlash(read('FRONTEND_URL')), ...extra];
    if (!this.isProd) list.push('http://localhost:3000');
    return list;
  },
  get cloudName(): string {
    return read('CLOUDINARY_CLOUD_NAME');
  },
  get cloudKey(): string {
    return read('CLOUDINARY_API_KEY');
  },
  get cloudSecret(): string {
    return read('CLOUDINARY_API_SECRET');
  },
};
