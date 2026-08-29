import {
  createAddressLookupSessionToken,
  lookupAddressSuggestions,
  lookupAddressDetails,
} from './addressLookup';

const originalFetch = global.fetch;

const jsonResponse = (body, ok = true) => ({
  ok,
  json: async () => body,
});

beforeEach(() => {
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('createAddressLookupSessionToken', () => {
  it('returns a non-empty, unique token on each call', () => {
    const first = createAddressLookupSessionToken();
    const second = createAddressLookupSessionToken();
    expect(typeof first).toBe('string');
    expect(first.length).toBeGreaterThan(0);
    expect(first).not.toBe(second);
  });
});

describe('lookupAddressSuggestions', () => {
  it('returns suggestions from the local API when it responds ok', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      suggestions: [{ placeId: 'N1', fullText: '1 Main Rd, Cape Town' }],
    }));

    const result = await lookupAddressSuggestions({ input: '1 Main Rd', sessionToken: 'tok' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/address');
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).type).toBe('autocomplete');
    expect(result).toEqual([{ placeId: 'N1', fullText: '1 Main Rd, Cape Town' }]);
  });

  it('falls back to Nominatim directly when the local API is unreachable', async () => {
    global.fetch
      .mockRejectedValueOnce(new Error('network down')) // local API call throws
      .mockResolvedValueOnce(jsonResponse([
        {
          osm_type: 'node',
          osm_id: '123',
          display_name: '1 Main Rd, Cape Town, Western Cape, South Africa',
          address: { house_number: '1', road: 'Main Rd', city: 'Cape Town', state: 'Western Cape' },
          lat: '-33.9',
          lon: '18.4',
        },
      ]));

    const result = await lookupAddressSuggestions({ input: '1 Main Rd', countryCode: 'za' });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(String(global.fetch.mock.calls[1][0])).toContain('nominatim.openstreetmap.org/search');
    expect(result).toHaveLength(1);
    expect(result[0].placeId).toBe('N123');
    expect(result[0].fullText).toBe('1 Main Rd, Cape Town, Western Cape, South Africa');
  });

  it('falls back to Nominatim when the local API responds with an error status', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ error: 'boom' }, false))
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await lookupAddressSuggestions({ input: 'Nowhere Street' });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual([]);
  });
});

describe('lookupAddressDetails', () => {
  it('uses the local API result when it already has usable coordinates', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      formattedAddress: '1 Main Rd, Cape Town',
      address1: '1 Main Rd',
      city: 'Cape Town',
      province: 'GP',
      postalCode: '8001',
      latitude: -33.9,
      longitude: 18.4,
    }));

    const result = await lookupAddressDetails({ placeId: 'N123', sessionToken: 'tok' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    // Province alias normalization still applies to the local API's payload.
    expect(result.province).toBe('Gauteng');
    expect(result.latitude).toBe(-33.9);
  });

  it('falls back to Nominatim when the local API has no coordinates', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ formattedAddress: '', latitude: null, longitude: null }))
      .mockResolvedValueOnce(jsonResponse([
        {
          display_name: '1 Main Rd, Cape Town, Western Cape, South Africa',
          address: { house_number: '1', road: 'Main Rd', city: 'Cape Town', state: 'KZN', postcode: '4001' },
          lat: '-33.9',
          lon: '18.4',
        },
      ]));

    const result = await lookupAddressDetails({ placeId: 'N123' });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(String(global.fetch.mock.calls[1][0])).toContain('nominatim.openstreetmap.org/lookup');
    // Province alias normalization applies to the Nominatim fallback too.
    expect(result.province).toBe('KwaZulu-Natal');
    expect(result.latitude).toBe(-33.9);
  });

  it('throws when neither the local API nor Nominatim can find the place', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ latitude: null, longitude: null }))
      .mockResolvedValueOnce(jsonResponse([]));

    await expect(lookupAddressDetails({ placeId: 'missing' })).rejects.toThrow('Address details not found.');
  });
});
