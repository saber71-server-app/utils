export function isDev() {
  return process.env.NODE_ENV === 'dev';
}

export function isProd() {
  return process.env.NODE_ENV === 'prod';
}
