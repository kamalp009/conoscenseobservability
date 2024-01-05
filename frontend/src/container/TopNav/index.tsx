import { Col, Row, Space } from 'antd';
import ROUTES from 'constants/routes';
import { useMemo } from 'react';
import { matchPath, useHistory } from 'react-router-dom';

import NewExplorerCTA from '../NewExplorerCTA';
import DateTimeSelector from './DateTimeSelection';
import { routesToDisable, routesToSkip } from './DateTimeSelection/config';

function TopNav(): JSX.Element | null {
	const { location } = useHistory();

	const isRouteToSkip = useMemo(
		() =>
			routesToSkip.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	const isDisabled = useMemo(
		() =>
			routesToDisable.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	const isSignUpPage = useMemo(
		() => matchPath(location.pathname, { path: ROUTES.SIGN_UP, exact: true }),
		[location.pathname],
	);

	if (isSignUpPage || isDisabled) {
		return null;
	}

	return (
		<Row>
			{!isRouteToSkip && (
				<Col span={24} style={{ marginTop: '1rem' }}>
					<Row justify="end">
						<Space align="start" size={60} direction="horizontal">
							<NewExplorerCTA />
							<div>
								<DateTimeSelector />
							</div>
						</Space>
					</Row>
				</Col>
			)}
		</Row>
	);
}

export default TopNav;
