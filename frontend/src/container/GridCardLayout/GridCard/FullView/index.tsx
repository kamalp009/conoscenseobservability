import './WidgetFullView.styles.scss';

import { SyncOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import cx from 'classnames';
import { ToggleGraphProps } from 'components/Graph/types';
import Spinner from 'components/Spinner';
import TimePreference from 'components/TimePreferenceDropDown';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GridPanelSwitch from 'container/GridPanelSwitch';
import {
	timeItems,
	timePreferance,
} from 'container/NewWidget/RightContainer/timeItems';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { useChartMutable } from 'hooks/useChartMutable';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import uPlot from 'uplot';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';
import { getTimeRange } from 'utils/getTimeRange';

import { getLocalStorageGraphVisibilityState } from '../utils';
import { PANEL_TYPES_VS_FULL_VIEW_TABLE } from './contants';
import GraphManager from './GraphManager';
import { GraphContainer, TimeContainer } from './styles';
import { FullViewProps } from './types';

function FullView({
	widget,
	fullViewOptions = true,
	onClickHandler,
	name,
	version,
	originalName,
	yAxisUnit,
	onDragSelect,
	isDependedDataLoaded = false,
	onToggleModelHandler,
	parentChartRef,
}: FullViewProps): JSX.Element {
	const { selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const fullViewRef = useRef<HTMLDivElement>(null);

	const [chartOptions, setChartOptions] = useState<uPlot.Options>();

	const { selectedDashboard, isDashboardLocked } = useDashboard();

	const getSelectedTime = useCallback(
		() =>
			timeItems.find((e) => e.enum === (widget?.timePreferance || 'GLOBAL_TIME')),
		[widget],
	);

	const fullViewChartRef = useRef<ToggleGraphProps>();

	const [selectedTime, setSelectedTime] = useState<timePreferance>({
		name: getSelectedTime()?.name || '',
		enum: widget?.timePreferance || 'GLOBAL_TIME',
	});

	const updatedQuery = useStepInterval(widget?.query);

	const response = useGetQueryRange(
		{
			selectedTime: selectedTime.enum,
			graphType:
				widget.panelTypes === PANEL_TYPES.BAR
					? PANEL_TYPES.TIME_SERIES
					: widget.panelTypes,
			query: updatedQuery,
			globalSelectedInterval: globalSelectedTime,
			variables: getDashboardVariables(selectedDashboard?.data.variables),
		},
		selectedDashboard?.data?.version || version || DEFAULT_ENTITY_VERSION,
		{
			queryKey: `FullViewGetMetricsQueryRange-${selectedTime.enum}-${globalSelectedTime}-${widget.id}`,
			enabled: !isDependedDataLoaded && widget.panelTypes !== PANEL_TYPES.LIST, // Internally both the list view panel has it's own query range api call, so we don't need to call it again
		},
	);

	const [graphsVisibilityStates, setGraphsVisibilityStates] = useState<
		boolean[]
	>(Array(response.data?.payload.data.result.length).fill(true));

	useEffect(() => {
		const {
			graphVisibilityStates: localStoredVisibilityState,
		} = getLocalStorageGraphVisibilityState({
			apiResponse: response.data?.payload.data.result || [],
			name: originalName,
		});
		setGraphsVisibilityStates(localStoredVisibilityState);
	}, [originalName, response.data?.payload.data.result]);

	const canModifyChart = useChartMutable({
		panelType: widget.panelTypes,
		panelTypeAndGraphManagerVisibility: PANEL_TYPES_VS_FULL_VIEW_TABLE,
	});

	if (response.data && widget.panelTypes === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			response.data?.payload.data.result,
		);
		response.data.payload.data.result = sortedSeriesData;
	}

	const chartData = getUPlotChartData(response?.data?.payload, widget.fillSpans);

	const isDarkMode = useIsDarkMode();

	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange(response);

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [maxTime, minTime, globalSelectedInterval, response]);

	useEffect(() => {
		if (!response.isFetching && fullViewRef.current) {
			const width = fullViewRef.current?.clientWidth
				? fullViewRef.current.clientWidth - 45
				: 700;

			const height = fullViewRef.current?.clientWidth
				? fullViewRef.current.clientHeight
				: 300;

			const newChartOptions = getUPlotChartOptions({
				id: originalName,
				yAxisUnit: yAxisUnit || '',
				apiResponse: response.data?.payload,
				dimensions: {
					height,
					width,
				},
				isDarkMode,
				onDragSelect,
				graphsVisibilityStates,
				setGraphsVisibilityStates,
				thresholds: widget.thresholds,
				minTimeScale,
				maxTimeScale,
				softMax: widget.softMax === undefined ? null : widget.softMax,
				softMin: widget.softMin === undefined ? null : widget.softMin,
				panelType: widget.panelTypes,
			});

			setChartOptions(newChartOptions);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [response.isFetching, graphsVisibilityStates, fullViewRef.current]);

	useEffect(() => {
		graphsVisibilityStates?.forEach((e, i) => {
			fullViewChartRef?.current?.toggleGraph(i, e);
		});
	}, [graphsVisibilityStates]);

	const isListView = widget.panelTypes === PANEL_TYPES.LIST;

	if (response.isFetching) {
		return <Spinner height="100%" size="large" tip="Loading..." />;
	}

	return (
		<div className="full-view-container">
			<div className="full-view-header-container">
				{fullViewOptions && (
					<TimeContainer $panelType={widget.panelTypes}>
						<TimePreference
							selectedTime={selectedTime}
							setSelectedTime={setSelectedTime}
						/>
						<Button
							style={{
								marginLeft: '4px',
							}}
							onClick={(): void => {
								response.refetch();
							}}
							type="primary"
							icon={<SyncOutlined />}
						/>
					</TimeContainer>
				)}
			</div>

			<div
				className={cx('graph-container', {
					disabled: isDashboardLocked,
					'list-graph-container': isListView,
				})}
				ref={fullViewRef}
			>
				{chartOptions && (
					<GraphContainer
						style={{
							height: isListView ? '100%' : '90%',
						}}
						isGraphLegendToggleAvailable={canModifyChart}
					>
						<GridPanelSwitch
							panelType={widget.panelTypes}
							data={chartData}
							options={chartOptions}
							onClickHandler={onClickHandler}
							name={name}
							yAxisUnit={yAxisUnit}
							onDragSelect={onDragSelect}
							panelData={response.data?.payload.data.newResult.data.result || []}
							query={widget.query}
							ref={fullViewChartRef}
							thresholds={widget.thresholds}
							selectedLogFields={widget.selectedLogFields}
							dataSource={widget.query.builder.queryData[0].dataSource}
							selectedTracesFields={widget.selectedTracesFields}
							selectedTime={selectedTime}
						/>
					</GraphContainer>
				)}
			</div>

			{canModifyChart && chartOptions && !isDashboardLocked && (
				<GraphManager
					data={chartData}
					name={originalName}
					options={chartOptions}
					yAxisUnit={yAxisUnit}
					onToggleModelHandler={onToggleModelHandler}
					setGraphsVisibilityStates={setGraphsVisibilityStates}
					graphsVisibilityStates={graphsVisibilityStates}
					lineChartRef={fullViewChartRef}
					parentChartRef={parentChartRef}
				/>
			)}
		</div>
	);
}

FullView.defaultProps = {
	fullViewOptions: undefined,
	onClickHandler: undefined,
	yAxisUnit: undefined,
	onDragSelect: undefined,
	isDependedDataLoaded: undefined,
};

FullView.displayName = 'FullView';

export default FullView;
