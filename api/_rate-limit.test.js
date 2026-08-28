const mockRpc = jest.fn();
const mockCreateClient = jest.fn(() => ({ rpc: mockRpc }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

const originalEnv = process.env;

const makeRes = () => ({
  _status: 200,
  _headers: {},
  _body: null,
  status(code) { this._status = code; return this; },
  json(body) { this._body = body; return this; },
  setHeader(name, value) { this._headers[name] = value; },
});

// Loaded fresh in each test (via jest.resetModules + require inside the
// test) so the module's cached Supabase client picks up that test's own
// env vars instead of whatever an earlier test left behind.
const loadModule = () => {
  let mod;
  jest.isolateModules(() => {
    mod = require('./_rate-limit');
  });
  return mod;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('enforceRateLimit', () => {
  it('fails open (allows the request) when Supabase env vars are not configured', async () => {
    delete process.env.REACT_APP_SUPABASE_URL;
    delete process.env.REACT_APP_SUPABASE_ANON_KEY;
    const { enforceRateLimit } = loadModule();

    const req = { headers: {} };
    const res = makeRes();
    const blocked = await enforceRateLimit(req, res, { name: 'test', max: 5 });

    expect(blocked).toBe(false);
    expect(res._status).toBe(200);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('allows the request through and sets rate-limit headers when under the limit', async () => {
    process.env.REACT_APP_SUPABASE_URL = 'https://example.supabase.co';
    process.env.REACT_APP_SUPABASE_ANON_KEY = 'anon-key';
    mockRpc.mockResolvedValue({ data: [{ allowed: true, current_count: 3 }], error: null });
    const { enforceRateLimit } = loadModule();

    const req = { headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' } };
    const res = makeRes();
    const blocked = await enforceRateLimit(req, res, { name: 'address-autocomplete', windowSeconds: 60, max: 120 });

    expect(blocked).toBe(false);
    expect(mockRpc).toHaveBeenCalledWith('check_and_record_rate_limit', {
      p_bucket_key: 'address-autocomplete:198.51.100.7',
      p_window_seconds: 60,
      p_max: 120,
    });
    expect(res._headers['X-RateLimit-Limit']).toBe('120');
    expect(res._headers['X-RateLimit-Remaining']).toBe('117');
  });

  it('blocks the request with a 429 and Retry-After header once the limit is exceeded', async () => {
    process.env.REACT_APP_SUPABASE_URL = 'https://example.supabase.co';
    process.env.REACT_APP_SUPABASE_ANON_KEY = 'anon-key';
    mockRpc.mockResolvedValue({ data: [{ allowed: false, current_count: 10 }], error: null });
    const { enforceRateLimit } = loadModule();

    const req = { headers: { 'x-forwarded-for': '203.0.113.9' } };
    const res = makeRes();
    const blocked = await enforceRateLimit(req, res, { name: 'send-email', windowSeconds: 60, max: 10 });

    expect(blocked).toBe(true);
    expect(res._status).toBe(429);
    expect(res._body).toEqual({ error: 'Too many requests. Please slow down and try again shortly.' });
    expect(res._headers['Retry-After']).toBe('60');
  });

  it('fails open when the RPC call itself errors', async () => {
    process.env.REACT_APP_SUPABASE_URL = 'https://example.supabase.co';
    process.env.REACT_APP_SUPABASE_ANON_KEY = 'anon-key';
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
    const { enforceRateLimit } = loadModule();

    const req = { headers: {} };
    const res = makeRes();
    const blocked = await enforceRateLimit(req, res, { name: 'test', max: 5 });

    expect(blocked).toBe(false);
    expect(res._status).toBe(200);
  });

  it('fails open when the RPC call throws (e.g. network failure)', async () => {
    process.env.REACT_APP_SUPABASE_URL = 'https://example.supabase.co';
    process.env.REACT_APP_SUPABASE_ANON_KEY = 'anon-key';
    mockRpc.mockRejectedValue(new Error('fetch failed'));
    const { enforceRateLimit } = loadModule();

    const req = { headers: {} };
    const res = makeRes();
    const blocked = await enforceRateLimit(req, res, { name: 'test', max: 5 });

    expect(blocked).toBe(false);
    expect(res._status).toBe(200);
  });

  it('uses keyOverride instead of the IP address when provided', async () => {
    process.env.REACT_APP_SUPABASE_URL = 'https://example.supabase.co';
    process.env.REACT_APP_SUPABASE_ANON_KEY = 'anon-key';
    mockRpc.mockResolvedValue({ data: [{ allowed: true, current_count: 1 }], error: null });
    const { enforceRateLimit } = loadModule();

    const req = { headers: { 'x-forwarded-for': '198.51.100.7' } };
    const res = makeRes();
    await enforceRateLimit(req, res, { name: 'wallet-otp', max: 5, keyOverride: 'buyer@example.com' });

    expect(mockRpc).toHaveBeenCalledWith('check_and_record_rate_limit', expect.objectContaining({
      p_bucket_key: 'wallet-otp:buyer@example.com',
    }));
  });
});
