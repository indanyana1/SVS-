import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import '../i18n';
import App from './App';

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
			<BrowserRouter>
				<ScrollToTop />
				<App />
			</BrowserRouter>
		</React.StrictMode>
	);
}
