import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import '../i18n';
import App from './App';
import ErrorBoundary from '../components/common/ErrorBoundary';
import reportWebVitals from '../lib/reportWebVitals';

function ScrollToTop() {
	const { pathname } = useLocation();
	useEffect(() => {
		window.scrollTo(0, 0);
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
