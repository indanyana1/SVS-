const mockRpc = jest.fn();
const mockCreateClient = jest.fn(() => ({ rpc: mockRpc }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

// The rate limiter this endpoint also uses is exercised by its own test
// file — stub it out here so these tests only exercise admin-login's own
// logic (block check -> admin_login -> record attempt).
jest.mock('./_rate-limit', () => ({ enforceRateLimit: jest.fn().mockResolvedValue(false) }));

const originalEnv = process.env;

const makeRes = () => ({
  _status: 200,
  _body: null,
  status(code) { this._status = code; return this; },
  json(body) { this._body = body; return this; },
  setHeader() {},
});

const loadModule = () => {
  let mod;
  jest.isolateModules(() => {
    mod = require('./admin-login');
  });
  return mod;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...originalEnv,
    REACT_APP_SUPABASE_URL: 'https://example.supabase.co',
    REACT_APP_SUPABASE_ANON_KEY: 'anon-key',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('POST /api/admin-login', () => {
  it('rejects non-POST methods', async () => {
    const handler = loadModule();
    const req = { method: 'GET', headers: {} };
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(405);
  });

  it('blocks the request without ever calling admin_login when the IP is blocked', async () => {
    mockRpc.mockImplementation((fn) => {
      if (fn === 'admin_check_ip_block') return Promise.resolve({ data: true, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    const handler = loadModule();
    const req = {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.9' },
      body: { email: 'admin@example.com', password: 'whatever' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(403);
    expect(mockRpc).toHaveBeenCalledWith('admin_check_ip_block', { p_ip_address: '203.0.113.9' });
    expect(mockRpc).not.toHaveBeenCalledWith('admin_login', expect.anything());
  });

  it('logs a successful attempt and returns the session on correct credentials', async () => {
    mockRpc.mockImplementation((fn, args) => {
      if (fn === 'admin_check_ip_block') return Promise.resolve({ data: false, error: null });
      if (fn === 'admin_login') return Promise.resolve({ data: { token: 'tok-123', full_name: 'Owner' }, error: null });
      if (fn === 'admin_record_login_attempt') return Promise.resolve({ data: null, error: null, _args: args });
      return Promise.resolve({ data: null, error: null });
    });
    const handler = loadModule();
    const req = {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.4', 'user-agent': 'jest-test' },
      body: { email: 'Owner@Example.com', password: 'correct-horse' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ token: 'tok-123', full_name: 'Owner' });
    expect(mockRpc).toHaveBeenCalledWith('admin_login', { p_email: 'owner@example.com', p_password: 'correct-horse' });
    expect(mockRpc).toHaveBeenCalledWith('admin_record_login_attempt', expect.objectContaining({
      p_attempted_email: 'owner@example.com',
      p_ip_address: '198.51.100.4',
      p_method: 'password',
      p_success: true,
      p_failure_reason: null,
    }));
  });

  it('logs a failed attempt and returns 401 on wrong credentials', async () => {
    mockRpc.mockImplementation((fn) => {
      if (fn === 'admin_check_ip_block') return Promise.resolve({ data: false, error: null });
      if (fn === 'admin_login') return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    const handler = loadModule();
    const req = {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.4' },
      body: { email: 'owner@example.com', password: 'wrong' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res._status).toBe(401);
    expect(mockRpc).toHaveBeenCalledWith('admin_record_login_attempt', expect.objectContaining({
      p_success: false,
    }));
  });
});
