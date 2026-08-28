import { trackPageView, trackEvent } from './analytics';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  hasSupabaseEnv: true,
  supabase: { from: jest.fn() },
}));

const flushInsert = () => {
  // The tracker batches on a 4s timer — advancing fake timers past it
  // triggers the same insert() call a real page-hide/timeout would.
  jest.advanceTimersByTime(4001);
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  window.localStorage.clear();
  const insertMock = jest.fn().mockResolvedValue({ error: null });
  supabase.from.mockReturnValue({ insert: insertMock });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('trackPageView', () => {
  it('batches page views and inserts them into analytics_events on the flush timer', async () => {
    trackPageView('/pet-care-supplies');
    expect(supabase.from).not.toHaveBeenCalled();

    flushInsert();
    await Promise.resolve();

    expect(supabase.from).toHaveBeenCalledWith('analytics_events');
    const insertMock = supabase.from.mock.results[0].value.insert;
    expect(insertMock).toHaveBeenCalledTimes(1);
    const rows = insertMock.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ event_name: 'page_view', page_path: '/pet-care-supplies' });
    expect(typeof rows[0].session_id).toBe('string');
    expect(rows[0].session_id.length).toBeGreaterThan(0);
  });

  it('reuses the same session id across multiple events on this browser', async () => {
    trackPageView('/a');
    flushInsert();
    await Promise.resolve();
    const firstSessionId = supabase.from.mock.results[0].value.insert.mock.calls[0][0][0].session_id;

    trackPageView('/b');
    flushInsert();
    await Promise.resolve();
    const secondSessionId = supabase.from.mock.results[1].value.insert.mock.calls[0][0][0].session_id;

    expect(secondSessionId).toBe(firstSessionId);
  });

  it('batches several events fired within the same window into one insert call', async () => {
    trackPageView('/a');
    trackPageView('/b');
    trackEvent('order_placed', { metadata: { total: 100 } });

    flushInsert();
    await Promise.resolve();

    const insertMock = supabase.from.mock.results[0].value.insert;
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toHaveLength(3);
  });
});

describe('trackEvent', () => {
  it('carries the given metadata through to the inserted row', async () => {
    trackEvent('listing_created', { metadata: { marketKey: 'petCareSupplies' } });
    flushInsert();
    await Promise.resolve();

    const insertMock = supabase.from.mock.results[0].value.insert;
    const row = insertMock.mock.calls[0][0][0];
    expect(row.event_name).toBe('listing_created');
    expect(row.metadata).toEqual({ marketKey: 'petCareSupplies' });
  });

  it('is a no-op when given an empty event name', async () => {
    trackEvent('');
    flushInsert();
    await Promise.resolve();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
