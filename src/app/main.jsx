import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import '../i18n';
import App from './App';
import ErrorBoundary from '../components/common/ErrorBoundary';
import reportWebVitals from '../lib/reportWebVitals';
import { trackPageView } from '../lib/analytics';
import { initErrorMonitoring, setErrorMonitoringUser } from '../lib/errorMonitoring';

// Off unless REACT_APP_SENTRY_DSN is set — see src/lib/errorMonitoring.js.
initErrorMonitoring();
if (typeof window !== 'undefined') {
	try {
		setErrorMonitoringUser(window.localStorage.getItem('svs-user-email'));
	} catch (_error) { /* storage unavailable — fine, just no user tag yet */ }
	window.addEventListener('svs-auth-changed', () => {
		try {
			setErrorMonitoringUser(window.localStorage.getItem('svs-user-email'));
		} catch (_error) { /* ignore */ }
	});
}

function ScrollToTop() {
	const { pathname } = useLocation();
	useEffect(() => {
		window.scrollTo(0, 0);
		trackPageView(pathname);
	}, [pathname]);
	return null;
}

const rootElement = document.getElementById('root');

if (rootElement) {
	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<ErrorBoundary>
				<BrowserRouter>
					<ScrollToTop />
					<App />
				</BrowserRouter>
			</ErrorBoundary>
		</React.StrictMode>
	);
}

reportWebVitals();

// Register the service worker so the app is installable as a PWA and the
// "Install App" affordance can surface the native install prompt.
//
// Production only: the worker's fetch handler caches JS bundle requests
// cache-first (see public/service-worker.js), which is exactly wrong for
// `npm start` — the dev server's bundle URL doesn't change between rebuilds,
// so once the SW caches it, every reload replays that stale snapshot
// forever regardless of how many times the source changes, even surviving
// hard refreshes. Production builds get cache-busted hashed filenames, so
// the same strategy is safe there.
if ('serviceWorker' in navigator) {
	if (process.env.NODE_ENV === 'production') {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {
				/* registration failed — app still works, just not installable */
			});
		});
	} else {
		// Self-heal anyone who already has a stale dev-mode registration
		// (e.g. from before this guard existed, or from a prior `serve -s
		// build` test on this same port) so the next reload stops replaying
		// cached old bundles without needing manual DevTools steps.
		navigator.serviceWorker.getRegistrations()
			.then((registrations) => registrations.forEach((registration) => registration.unregister()))
			.catch(() => {});
		if (window.caches) {
			caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => {});
		}
	}
}
