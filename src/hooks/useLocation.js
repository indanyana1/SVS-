import { useCallback, useEffect, useState } from 'react';

const DEFAULT_LOCATION_STATE = {
  city: '',
  province: '',
  country: '',
  formattedAddress: '',
  locationLabel: '',
  isLoading: true,
  error: '',
  hasApproximateLocation: false,
};

const getFallbackLocationLabel = (state) => {
  const parts = [state.city, state.province, state.country].filter(Boolean);
  return parts.join(', ');
};

const resolveIpLocation = async () => {
  const response = await fetch('/api/address-ip');
  if (!response.ok) {
    throw new Error('Unable to detect location from API.');
  }

  const payload = await response.json();
  const locationLabel = [payload.city, payload.province, payload.country].filter(Boolean).join(', ');

  return {
    city: payload.city || '',
    province: payload.province || '',
    country: payload.country || '',
    formattedAddress: payload.formattedAddress || '',
    locationLabel,
    isLoading: false,
    error: locationLabel ? '' : 'Location detection returned an empty area.',
    hasApproximateLocation: true,
  };
};

const useLocation = () => {
  const [locationState, setLocationState] = useState(DEFAULT_LOCATION_STATE);

  const refreshLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return resolveIpLocation()
        .then((detectedState) => {
          setLocationState(detectedState);
          return detectedState;
        })
        .catch(() => {
          const fallbackState = {
            city: '',
            province: '',
            country: '',
            formattedAddress: '',
            locationLabel: '',
            isLoading: false,
            error: 'Location services are not available in this browser.',
            hasApproximateLocation: true,
          };
          setLocationState(fallbackState);
          return fallbackState;
        });
    }

    setLocationState((current) => ({ ...current, isLoading: true, error: '' }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch('/api/address-reverse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            });

            if (!response.ok) {
              const ipLocation = await resolveIpLocation().catch(() => null);
              if (ipLocation) {
                setLocationState(ipLocation);
                resolve(ipLocation);
                return;
              }

              const fallbackState = {
                city: '',
                province: '',
                country: '',
                formattedAddress: '',
                locationLabel: '',
                isLoading: false,
                error: '',
                hasApproximateLocation: true,
              };

              setLocationState(fallbackState);
              resolve(fallbackState);
              return;
            }

            const payload = await response.json();
            const locationLabel = [payload.city, payload.province, payload.country].filter(Boolean).join(', ');
            const nextState = {
              city: payload.city || '',
              province: payload.province || '',
              country: payload.country || '',
              formattedAddress: payload.formattedAddress || '',
              locationLabel: locationLabel || getFallbackLocationLabel(payload),
              isLoading: false,
              error: '',
              hasApproximateLocation: false,
            };

            setLocationState(nextState);
            resolve(nextState);
          } catch (_error) {
            const ipLocation = await resolveIpLocation().catch(() => null);
            if (ipLocation) {
              setLocationState(ipLocation);
              resolve(ipLocation);
              return;
            }

            const fallbackState = {
              city: '',
              province: '',
              country: '',
              formattedAddress: '',
              locationLabel: '',
              isLoading: false,
              error: 'Unable to detect your location.',
              hasApproximateLocation: true,
            };

            setLocationState((current) => ({
              ...current,
              ...fallbackState,
            }));
            resolve(fallbackState);
          }
        },
        async (error) => {
          const ipLocation = await resolveIpLocation().catch(() => null);
          if (ipLocation) {
            setLocationState(ipLocation);
            resolve(ipLocation);
            return;
          }

          const fallbackState = {
            city: '',
            province: '',
            country: '',
            formattedAddress: '',
            locationLabel: '',
            isLoading: false,
            error: error?.code === error.PERMISSION_DENIED
              ? 'Location permission was not granted and API detection was unavailable.'
              : 'Unable to detect location from browser or API.',
            hasApproximateLocation: true,
          };

          setLocationState((current) => ({
            ...current,
            ...fallbackState,
          }));
          resolve(fallbackState);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
      );
    });
  }, []);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  return {
    ...locationState,
    refreshLocation,
  };
};

export default useLocation;
