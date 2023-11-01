import { Typography } from 'antd';
import axios from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import Graph from 'container/GridCardLayout/GridCard';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import { Widgets } from 'types/api/dashboard/getAll';

import { ClickHandlerType } from '../Overview';

function TopLevelOperation({
	name,
	opName,
	topLevelOperationsIsError,
	topLevelOperationsError,
	onDragSelect,
	handleGraphClick,
	widget,
	topLevelOperationsIsLoading,
}: TopLevelOperationProps): JSX.Element {
	return (
		<Card>
			{topLevelOperationsIsError ? (
				<Typography>
					{axios.isAxiosError(topLevelOperationsError)
						? topLevelOperationsError.response?.data
						: SOMETHING_WENT_WRONG}
				</Typography>
			) : (
				<GraphContainer>
					<Graph
						name={name}
						widget={widget}
						onClickHandler={handleGraphClick(opName)}
						onDragSelect={onDragSelect}
						isQueryEnabled={!topLevelOperationsIsLoading}
					/>
				</GraphContainer>
			)}
		</Card>
	);
}

interface TopLevelOperationProps {
	name: string;
	opName: string;
	topLevelOperationsIsError: boolean;
	topLevelOperationsError: unknown;
	onDragSelect: (start: number, end: number) => void;
	handleGraphClick: (type: string) => ClickHandlerType;
	widget: Widgets;
	topLevelOperationsIsLoading: boolean;
}

export default TopLevelOperation;
