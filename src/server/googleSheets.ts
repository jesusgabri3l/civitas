/** Appends a row to a Google Sheet with a service account: JWT signed by hand (Web Crypto) + the REST API. No googleapis. */
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export interface SheetsConfig {
  email: string;
  privateKey: string;
  sheetId: string;
}

const base64Url = (input: string | ArrayBuffer) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function signJwt({ email, privateKey }: SheetsConfig): Promise<string> {
  const pem = privateKey.replace(/\\n/g, '\n').replace(/-----(BEGIN|END) PRIVATE KEY-----|\s/g, '');
  const der = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${base64Url(signature)}`;
}

async function fetchAccessToken(config: SheetsConfig): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: await signJwt(config) }),
  });
  if (!response.ok) throw new Error(`Google token request failed (${response.status})`);
  const { access_token } = (await response.json()) as { access_token?: string };
  if (!access_token) throw new Error('Google token response had no access_token');
  return access_token;
}

export async function appendRow(config: SheetsConfig, row: string[]): Promise<void> {
  const token = await fetchAccessToken(config);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheetId)}/values/A:E:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  if (!response.ok) throw new Error(`Sheets append failed (${response.status})`);
}
