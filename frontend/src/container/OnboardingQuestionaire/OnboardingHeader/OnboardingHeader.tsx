import './OnboardingHeader.styles.scss';

export function OnboardingHeader(): JSX.Element {
	return (
		<div className="header-container">
			<div className="logo-container">
				<img src="/Logos/signoz-brand-logo.svg" alt="Conoscense" />
				<span className="logo-text">Conoscense</span>
			</div>
		</div>
	);
}
