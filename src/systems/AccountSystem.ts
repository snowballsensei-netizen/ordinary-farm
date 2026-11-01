// Local accounts: no verification, stored in this browser's localStorage.
// Passwords are kept only as salted PBKDF2 hashes.
const ACCOUNTS_KEY = 'ordinaryfarm_accounts';
const SESSION_KEY = 'ordinaryfarm_session';
const ITERATIONS = 150000;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 32;

interface Account {
  id: string;   // lowercase username, used in save keys
  name: string; // username as typed
  salt: string;
  hash: string;
}

export type AccountResult = { ok: true } | { ok: false; error: string };

function readAccounts(): Account[] {
  try {
    const list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITERATIONS },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export const Accounts = {
  /** The signed-in account, or null. Survives page reloads until Log Out. */
  current(): { id: string; name: string } | null {
    try {
      const id = localStorage.getItem(SESSION_KEY);
      const a = readAccounts().find((x) => x.id === id);
      return a ? { id: a.id, name: a.name } : null;
    } catch {
      return null;
    }
  },

  any(): boolean {
    return readAccounts().length > 0;
  },

  validate(username: string, password: string): string | null {
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters.`;
    if (!/^[A-Za-z0-9_-]+$/.test(username)) return 'Username: letters, numbers, _ and - only.';
    if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
    if (password.length > PASSWORD_MAX) return `Password must be ${PASSWORD_MAX} characters or fewer.`;
    return null;
  },

  async register(username: string, password: string): Promise<AccountResult> {
    const invalid = this.validate(username, password);
    if (invalid) return { ok: false, error: invalid };
    const list = readAccounts();
    const id = username.toLowerCase();
    if (list.some((a) => a.id === id)) return { ok: false, error: 'That username is already taken here.' };
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashPassword(password, salt);
    list.push({ id, name: username, salt, hash });
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
      localStorage.setItem(SESSION_KEY, id);
    } catch {
      return { ok: false, error: 'This browser would not save the account.' };
    }
    return { ok: true };
  },

  async login(username: string, password: string): Promise<AccountResult> {
    const id = username.toLowerCase();
    const a = readAccounts().find((x) => x.id === id);
    if (a && (await hashPassword(password, a.salt)) === a.hash) {
      localStorage.setItem(SESSION_KEY, id);
      return { ok: true };
    }
    return { ok: false, error: 'Wrong username or password.' };
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },
};
