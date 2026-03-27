import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import logo from '../../assets/icons/logo.jpeg';
import { DEFAULT_LANGUAGE_CODE, getLanguageByCode, isRtlLanguage, SUPPORTED_LANGUAGES } from '../../lib/languages';

const getThemePreference = () => {
	if (typeof window === 'undefined') {
		return 'light';
	}

	const storedTheme = window.localStorage.getItem('svs-theme');
	if (storedTheme === 'dark' || storedTheme === 'light') {
		return storedTheme;
	}

	return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const StandalonePageShell = ({ title, brandHref = '/', children, mainClassName = 'px-4 py-8 sm:px-6 sm:py-10' }) => {
	const { t, i18n } = useTranslation();
	const [theme, setTheme] = useState(getThemePreference);
	const isDarkMode = theme === 'dark';
	const activeLanguage = getLanguageByCode(i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE_CODE);

	useEffect(() => {
		window.localStorage.setItem('svs-theme', theme);
		document.body.classList.toggle('theme-dark', isDarkMode);
		document.body.classList.toggle('theme-light', !isDarkMode);
	}, [isDarkMode, theme]);

	useEffect(() => {
		const nextLanguage = getLanguageByCode(i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE_CODE);
		document.documentElement.setAttribute('lang', nextLanguage.code);
		document.documentElement.setAttribute('dir', isRtlLanguage(nextLanguage.code) ? 'rtl' : 'ltr');
	}, [i18n.language, i18n.resolvedLanguage]);

	const handleLanguageChange = async (languageCode) => {
		const nextLanguage = getLanguageByCode(languageCode);
		await i18n.changeLanguage(nextLanguage.code);
		window.localStorage.setItem('svs-language', nextLanguage.code);
		document.documentElement.setAttribute('lang', nextLanguage.code);
		document.documentElement.setAttribute('dir', isRtlLanguage(nextLanguage.code) ? 'rtl' : 'ltr');
	};

	return (
		<div className={`min-h-screen bg-[var(--svs-bg)] text-[var(--svs-text)] ${isDarkMode ? 'theme-dark' : 'theme-light'}`.trim()}>
			<header className="border-b border-[var(--svs-border)] bg-[var(--svs-surface)]/95 backdrop-blur-sm">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
					<div className="flex min-w-0 items-center gap-3">
						<Link to={brandHref} aria-label="Back to SVS E-Commerce" className="shrink-0">
							<img src={logo} alt="SVS E-Commerce" className="h-10 w-auto rounded-lg" />
						</Link>
						<h1 className="truncate text-2xl font-black text-[var(--svs-text)]">{title}</h1>
					</div>

					<div className="flex items-center gap-2">
						<label className="inline-flex items-center gap-2 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)]">
							<span className="sr-only">{t('languageModal.title')}</span>
							<span aria-hidden="true">{activeLanguage.flag}</span>
							<select
								value={activeLanguage.code}
								onChange={(event) => {
									void handleLanguageChange(event.target.value);
								}}
								className="min-w-0 bg-transparent text-sm font-semibold text-[var(--svs-text)] outline-none"
								aria-label={t('languageModal.title')}
							>
								{SUPPORTED_LANGUAGES.map((language) => (
									<option key={language.code} value={language.code}>
										{language.englishName}
									</option>
								))}
							</select>
						</label>
						<button
							type="button"
							onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
							className="inline-flex items-center gap-2 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)]"
							aria-label={t('theme.toggleAria')}
						>
							{isDarkMode ? <Sun className="h-4 w-4 text-[var(--svs-primary)]" /> : <Moon className="h-4 w-4 text-[var(--svs-primary-strong)]" />}
							<span>{isDarkMode ? t('theme.light') : t('theme.dark')}</span>
						</button>
					</div>
				</div>
			</header>
			<main className={mainClassName}>{children}</main>
		</div>
	);
};

export default StandalonePageShell;