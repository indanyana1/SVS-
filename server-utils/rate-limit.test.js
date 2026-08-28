const { rateLimit } = require('./rate-limit');

const makeReqRes = (overrides = {}) => {
  const req = { headers: {}, ip: '127.0.0.1', path: '/api/test', baseUrl: '', ...overrides };
  const res = {
    _status: 200,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(name, value) { this._headers[name] = value; },
  };
  return { req, res };
};

describe('rateLimit middleware', () => {
  it('allows requests under the limit and calls next()', () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 3 });
    const next = jest.fn();
    const { req, res } = makeReqRes({ ip: '203.0.113.1' });

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res._status).toBe(200);
    expect(res._headers['X-RateLimit-Remaining']).toBe('2');
  });

  it('blocks the request with 429 once the per-IP limit is exceeded', () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 2 });
    const next = jest.fn();
    const { req, res } = makeReqRes({ ip: '203.0.113.2' });

    middleware(req, res, next); // 1st — allowed
    middleware(req, res, next); // 2nd — allowed
    middleware(req, res, next); // 3rd — blocked

    expect(next).toHaveBeenCalledTimes(2);
    expect(res._status).toBe(429);
    expect(res._headers['Retry-After']).toBeDefined();
  });

  it('tracks separate IPs independently', () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 1 });
    const next = jest.fn();

    const first = makeReqRes({ ip: '203.0.113.3' });
    const second = makeReqRes({ ip: '203.0.113.4' });

    middleware(first.req, first.res, next);
    middleware(second.req, second.res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(first.res._status).toBe(200);
    expect(second.res._status).toBe(200);
  });

  it('prefers the leftmost X-Forwarded-For address over req.ip', () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 1 });
    const next = jest.fn();

    const a = makeReqRes({ ip: '10.0.0.1', headers: { 'x-forwarded-for': '198.51.100.5, 10.0.0.1' } });
    const b = makeReqRes({ ip: '10.0.0.2', headers: { 'x-forwarded-for': '198.51.100.5, 10.0.0.2' } });

    middleware(a.req, a.res, next); // consumes the 198.51.100.5 bucket
    middleware(b.req, b.res, next); // same real client IP behind a different proxy hop -> blocked

    expect(next).toHaveBeenCalledTimes(1);
    expect(b.res._status).toBe(429);
  });
});
