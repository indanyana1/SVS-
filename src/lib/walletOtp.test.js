import { requestWalletOtp, verifyWalletOtp } from './walletOtp';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  hasSupabaseEnv: true,
  supabase: { rpc: jest.fn() },
}));

const originalEnv = process.env;
const originalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  global.fetch = jest.fn();
});

afterAll(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
});

describe('requestWalletOtp', () => {
  it('rejects when no email is provided', async () => {
    const result = await requestWalletOtp({ email: '', name: 'Test', purpose: 'topup' });
    expect(result.ok).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('generates a code via the wallet_request_otp RPC and emails it', async () => {
    process.env.REACT_APP_EMAILJS_SERVICE_ID = 'service-1';
    process.env.REACT_APP_EMAILJS_TEMPLATE_ID = 'template-1';
    process.env.REACT_APP_EMAILJS_PUBLIC_KEY = 'public-1';
    supabase.rpc.mockResolvedValue({ data: '123456', error: null });
    global.fetch.mockResolvedValue({ ok: true });

    const result = await requestWalletOtp({ email: 'Buyer@Example.com', name: 'Buyer', purpose: 'withdraw' });

    expect(supabase.rpc).toHaveBeenCalledWith('wallet_request_otp', {
      p_email: 'buyer@example.com',
      p_purpose: 'withdraw',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.emailjs.com/api/v1.0/email/send',
      expect.objectContaining({ method: 'POST' }),
    );
    const emailBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(emailBody.template_params.otp_code).toBe('123456');
    expect(emailBody.template_params.to_email).toBe('buyer@example.com');
    expect(result).toEqual({ ok: true, delivered: true });
  });

  it('still succeeds (without a real code leak) when EmailJS is not configured', async () => {
    delete process.env.REACT_APP_EMAILJS_SERVICE_ID;
    delete process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    delete process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
    supabase.rpc.mockResolvedValue({ data: '999999', error: null });

    const result = await requestWalletOtp({ email: 'buyer@example.com', name: 'Buyer', purpose: 'spend' });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.delivered).toBe(false);
  });

  it('surfaces an error message when the RPC fails', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'seller not found' } });

    const result = await requestWalletOtp({ email: 'buyer@example.com', purpose: 'topup' });

    expect(result).toEqual({ ok: false, error: 'seller not found' });
  });
});

describe('verifyWalletOtp', () => {
  it('rejects an empty code before calling the RPC', async () => {
    const result = await verifyWalletOtp({ email: 'buyer@example.com', purpose: 'topup', code: '' });
    expect(result.ok).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('returns a verification id on a correct code', async () => {
    supabase.rpc.mockResolvedValue({ data: 'verif-abc-123', error: null });

    const result = await verifyWalletOtp({ email: 'Buyer@Example.com', purpose: 'transfer', code: ' 654321 ' });

    expect(supabase.rpc).toHaveBeenCalledWith('wallet_verify_otp', {
      p_email: 'buyer@example.com',
      p_purpose: 'transfer',
      p_code: '654321',
    });
    expect(result).toEqual({ ok: true, verificationId: 'verif-abc-123' });
  });

  it('reports an error for an incorrect or expired code', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'Incorrect or expired code.' } });

    const result = await verifyWalletOtp({ email: 'buyer@example.com', purpose: 'topup', code: '000000' });

    expect(result).toEqual({ ok: false, error: 'Incorrect or expired code.' });
  });
});
