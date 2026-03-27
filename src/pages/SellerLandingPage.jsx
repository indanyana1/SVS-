import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, ChevronDown, Globe, Package, ShieldCheck, Store, Truck, Users } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';

const steps = [
	{
		step: 1,
		title: 'Choose your email and password',
		body: 'If you already have a buyer account on SVS, you can use the same email and password to sign in as a seller.',
	},
	{
		step: 2,
		title: 'Provide your seller information',
		body: 'Add your full name, contact details, and account information so your store can be identified correctly.',
	},
	{
		step: 3,
		title: 'Set up your store',
		body: 'Choose your store identity and start preparing listings across categories like groceries, electronics, and wellness.',
	},
	{
		step: 4,
		title: 'Upload your products',
		body: 'Use the Seller Upload flow to add title, images, price, and quantity. Products are published directly to SVS markets.',
	},
	{
		step: 5,
		title: 'Manage orders and fulfilment',
		body: 'Track incoming orders in your dashboard and update statuses from confirmed to shipped and delivered.',
	},
];

const features = [
	{
		icon: Package,
		title: 'Easy Listings',
		body: 'Publish products quickly with image uploads, pricing, and stock controls.',
	},
	{
		icon: BarChart3,
		title: 'Seller Dashboard',
		body: 'See your listings, orders, and order status updates in one place.',
	},
	{
		icon: Globe,
		title: 'Multi-Market Selling',
		body: 'Sell across SVS categories from one account and one login.',
	},
	{
		icon: ShieldCheck,
		title: 'Trusted Checkout',
		body: 'Orders run through SVS checkout options, including card and offline methods.',
	},
	{
		icon: Truck,
		title: 'Fulfilment Flow',
		body: 'Keep buyers updated by moving orders through status milestones.',
	},
	{
		icon: Users,
		title: 'Built-In Buyer Base',
		body: 'Reach the same customers already shopping in your existing SVS project.',
	},
];

const SellerLandingPage = () => {
	return (
		<StandalonePageShell title="Seller Central" brandHref="/sell" mainClassName="pb-12">
			<section className="border-b border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-20">
				<div className="mx-auto max-w-6xl text-center">
					<p className="text-sm font-semibold text-[var(--svs-primary)]">Seller Central</p>
					<h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
						Grow your store on SVS E-COMMERCE
					</h1>
					<p className="mx-auto mt-5 max-w-3xl text-base text-[var(--svs-muted)] sm:text-lg">
						Use the same account credentials as buyers, then switch into seller tools to upload products,
						manage orders, and scale across marketplace categories.
					</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Link
							to="/sell/signup"
							className="inline-flex items-center gap-2 rounded-full bg-[var(--svs-primary)] px-7 py-3 text-sm font-bold text-white transition hover:brightness-110"
						>
							Sign up to sell
							<ArrowRight className="h-4 w-4" />
						</Link>
						<Link
							to="/sell/signin"
							className="inline-flex items-center gap-2 rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-7 py-3 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)]"
						>
							Already registered? Sign in
						</Link>
					</div>
				</div>
			</section>

			<section className="px-4 py-14">
				<div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
					{[
						{ value: '50,000+', label: 'Active buyers' },
						{ value: '20+', label: 'Market categories' },
						{ value: '0', label: 'Registration fee' },
						{ value: '24/7', label: 'Seller tools' },
					].map((stat) => (
						<div key={stat.label} className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-4">
							<p className="text-3xl font-black text-[var(--svs-primary)]">{stat.value}</p>
							<p className="mt-1 text-sm text-[var(--svs-muted)]">{stat.label}</p>
						</div>
					))}
				</div>
			</section>

			<section className="px-4 py-8" id="sell">
				<div className="mx-auto max-w-5xl">
					<h2 className="text-center text-3xl font-black">How registration works</h2>
					<p className="mx-auto mt-3 max-w-2xl text-center text-[var(--svs-muted)]">
						Complete seller onboarding with the same account system used by buyers, then continue into your seller dashboard.
					</p>
					<div className="mt-8 space-y-3">
						{steps.map((item) => (
							<details key={item.step} className="group rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)]">
								<summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
									<div className="flex items-center gap-3">
										<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--svs-cyan-surface)] text-sm font-bold text-[var(--svs-primary)]">
											{item.step}
										</span>
										<span className="font-semibold">{item.title}</span>
									</div>
									<ChevronDown className="h-4 w-4 text-[var(--svs-muted)] transition group-open:rotate-180" />
								</summary>
								<div className="border-t border-[var(--svs-border)] px-5 py-4 text-sm text-[var(--svs-muted)]">
									{item.body}
								</div>
							</details>
						))}
					</div>
				</div>
			</section>

			<section className="px-4 py-16" id="fulfil">
				<div className="mx-auto max-w-6xl">
					<h2 className="text-center text-3xl font-black">Everything you need to sell</h2>
					<div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => (
							<div key={feature.title} className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6">
								<div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--svs-cyan-surface)]">
									<feature.icon className="h-5 w-5 text-[var(--svs-primary)]" />
								</div>
								<h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
								<p className="mt-2 text-sm text-[var(--svs-muted)]">{feature.body}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="px-4 pb-20 pt-6" id="grow">
				<div className="mx-auto max-w-4xl rounded-3xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-10 text-center">
					<Store className="mx-auto h-10 w-10 text-[var(--svs-primary)]" />
					<h2 className="mt-4 text-3xl font-black">Ready to grow your business?</h2>
					<p className="mx-auto mt-3 max-w-2xl text-[var(--svs-muted)]">
						Start selling on SVS today with a familiar login system and seller tooling that fits directly into this project.
					</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Link
							to="/sell/signup"
							className="inline-flex items-center gap-2 rounded-full bg-[var(--svs-primary)] px-8 py-3 text-sm font-bold text-white transition hover:brightness-110"
						>
							Create seller account
							<ArrowRight className="h-4 w-4" />
						</Link>
						<Link
							to="/sell/signin"
							className="inline-flex items-center gap-2 rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-8 py-3 text-sm font-semibold"
						>
							Sign in to Seller Central
						</Link>
					</div>
				</div>
			</section>
		</StandalonePageShell>
	);
};

export default SellerLandingPage;
