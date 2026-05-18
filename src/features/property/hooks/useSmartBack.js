import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Returns a back handler that uses browser history when possible and falls
// back to the given route otherwise (e.g. when the page was opened directly
// via URL or as the first navigation in the session).
export const useSmartBack = (fallback = '/property-hub') => {
	const navigate = useNavigate();
	const location = useLocation();

	return useCallback(() => {
		const idx = location.key && location.key !== 'default' ? window.history.state?.idx : 0;
		if (typeof idx === 'number' && idx > 0) {
			navigate(-1);
			return;
		}
		navigate(fallback);
	}, [navigate, location.key, fallback]);
};
