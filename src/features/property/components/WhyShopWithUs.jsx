import { Award, BadgeCheck, ShieldCheck, Tags } from 'lucide-react';

const PILLARS = [
	{
		icon: Award,
		title: 'Trusted Agents',
		body: 'Work with experienced real estate professionals who help you buy, sell, or rent properties with confidence.',
	},
	{
		icon: BadgeCheck,
		title: 'Verified Listings',
		body: 'Explore authentic properties carefully verified by our expert team for a secure and reliable property search.',
	},
	{
		icon: ShieldCheck,
		title: 'Secure Transactions',
		body: 'Your payments and personal data are fully protected with secure, bank-level encryption.',
	},
	{
		icon: Tags,
		title: 'Best Prices',
		body: 'Affordable, competitive pricing with complete transparency guaranteed, giving you the best value every time.',
	},
];

const WhyShopWithUs = () => (
	<section className="relative mt-10 overflow-hidden rounded-2xl bg-[#0d2a33] px-6 py-12 text-white">
		<div
			className="absolute inset-0 bg-cover bg-center opacity-30"
			style={{
				backgroundImage:
					"url('https://images.pexels.com/photos/1571463/pexels-photo-1571463.jpeg?auto=compress&cs=tinysrgb&w=1600')",
			}}
			aria-hidden="true"
		/>
		<div className="absolute inset-0 bg-gradient-to-b from-[#0d2a33]/85 to-[#0d2a33]/95" aria-hidden="true" />
		<div className="relative mx-auto max-w-5xl text-center">
			<h2 className="text-xl font-bold sm:text-2xl">Why Shop With Us</h2>
			<p className="mx-auto mt-2 max-w-2xl text-sm text-white/80">
				We're committed to providing you with the best online shopping experience, combining quality, convenience, and trust.
			</p>
			<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{PILLARS.map(({ icon: Icon, title, body }) => (
					<div
						key={title}
						className="rounded-xl bg-white/95 p-5 text-center text-[var(--svs-text)] shadow"
					>
						<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--svs-primary)]">
							<Icon className="h-5 w-5 text-white" />
						</div>
						<h3 className="mt-3 text-sm font-bold">{title}</h3>
						<p className="mt-2 text-xs text-slate-600">{body}</p>
					</div>
				))}
			</div>
		</div>
	</section>
);

export default WhyShopWithUs;
