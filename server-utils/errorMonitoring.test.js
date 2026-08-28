const mockInit = jest.fn();
const mockCaptureException = jest.fn();

jest.mock('@sentry/node', () => ({
  init: (...args) => mockInit(...args),
  captureException: (...args) => mockCaptureException(...args),
}));

const originalEnv = process.env;

const loadModule = () => {
  let mod;
  jest.isolateModules(() => {
    mod = require('./errorMonitoring');
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

describe('errorMonitoring (server-side)', () => {
  it('does nothing when SENTRY_DSN is not set', () => {
    delete process.env.SENTRY_DSN;
    const { initErrorMonitoring, captureError, isEnabled } = loadModule();

    initErrorMonitoring();
    captureError(new Error('boom'));

    expect(isEnabled).toBe(false);
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('initializes Sentry and forwards captured errors when SENTRY_DSN is set', () => {
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/1';
    const { initErrorMonitoring, captureError, isEnabled } = loadModule();

    initErrorMonitoring();
    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ dsn: process.env.SENTRY_DSN }));

    const error = new Error('dispatch failed');
    captureError(error, { source: 'stripe-webhook' });

    expect(isEnabled).toBe(true);
    expect(mockCaptureException).toHaveBeenCalledWith(error, { extra: { source: 'stripe-webhook' } });
  });

  it('never throws even if the underlying Sentry call itself throws', () => {
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/1';
    mockCaptureException.mockImplementation(() => { throw new Error('sentry sdk exploded'); });
    const { captureError } = loadModule();

    expect(() => captureError(new Error('original error'))).not.toThrow();
  });
});
