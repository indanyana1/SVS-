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

/* ============================================================
   Desktop-down-scale system
   - The app is laid out at a fixed virtual width of 1280px.
   - On smaller screens, we apply a CSS transform: scale(ratio)
     so the entire desktop UI shrinks to fit the device width.
   - The body height is set to (rootHeight * ratio) so the page
     scrolls correctly without leaving empty space below.
   - At >=1280px we use scale(1) and let layout flow naturally.
   ============================================================ */
const VIRTUAL_DESKTOP_WIDTH = 1280;
const applyDesktopScale = () => {
	if (!rootElement) return;
	// clientWidth EXCLUDES the vertical scrollbar so icons aren't hidden under it.
	const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
	const ratio = Math.min(1, viewportWidth / VIRTUAL_DESKTOP_WIDTH);
	rootElement.style.setProperty('--app-scale', String(ratio));
	// Reflect the scaled height onto the body so the document scrolls correctly.
	const scaledHeight = rootElement.getBoundingClientRect().height; // already scaled
	document.body.style.height = `${Math.ceil(scaledHeight)}px`;
};

window.addEventListener('resize', applyDesktopScale);
window.addEventListener('orientationchange', applyDesktopScale);
// Re-measure whenever the React tree changes size (route changes, async data, etc.)
if (rootElement && typeof ResizeObserver !== 'undefined') {
	const ro = new ResizeObserver(() => applyDesktopScale());
	ro.observe(rootElement);
}
// Initial pass + a delayed pass to catch web-fonts / images.
requestAnimationFrame(applyDesktopScale);
setTimeout(applyDesktopScale, 500);

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
