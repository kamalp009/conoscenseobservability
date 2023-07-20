import { TabsProps } from 'antd';
import LogDetail from 'components/LogDetail';
import TabLabel from 'components/TabLabel';
import { QueryParams } from 'constants/query';
import {
	initialAutocompleteData,
	initialQueriesMap,
	OPERATORS,
	PANEL_TYPES,
	QueryBuilderKeys,
} from 'constants/queryBuilder';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import ROUTES from 'constants/routes';
import { DEFAULT_PER_PAGE_VALUE } from 'container/Controls/config';
import ExportPanel from 'container/ExportPanel';
import GoToTop from 'container/GoToTop';
import LogsExplorerChart from 'container/LogsExplorerChart';
import LogsExplorerList from 'container/LogsExplorerList';
import LogsExplorerTable from 'container/LogsExplorerTable';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { SIGNOZ_VALUE } from 'container/QueryBuilder/filters/OrderByFilter/constants';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { addEmptyWidgetInDashboardJSONWithQuery } from 'hooks/dashboard/utils';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useAxiosError from 'hooks/useAxiosError';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { generatePath, useHistory } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import { ILog } from 'types/api/logs/log';
import {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	OrderByPayload,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuid } from 'uuid';

import { ActionsWrapper, TabsStyled } from './LogsExplorerViews.styled';

function LogsExplorerViews(): JSX.Element {
	const { notifications } = useNotifications();
	const history = useHistory();

	const queryClient = useQueryClient();

	const { queryData: pageSize } = useUrlQueryData(
		queryParamNamesMap.pageSize,
		DEFAULT_PER_PAGE_VALUE,
	);

	const { minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const currentMinTimeRef = useRef<number>(minTime);

	// Context
	const {
		currentQuery,
		stagedQuery,
		panelType,
		updateAllQueriesOperators,
		updateQueriesData,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	// State
	const [activeLog, setActiveLog] = useState<ILog | null>(null);
	const [page, setPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([]);
	const [requestData, setRequestData] = useState<Query | null>(null);

	const handleAxisError = useAxiosError();

	const currentStagedQueryData = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length !== 1) return null;

		return stagedQuery.builder.queryData[0];
	}, [stagedQuery]);

	const orderByTimestamp: OrderByPayload | null = useMemo(() => {
		const timestampOrderBy = currentStagedQueryData?.orderBy.find(
			(item) => item.columnName === 'timestamp',
		);

		return timestampOrderBy || null;
	}, [currentStagedQueryData]);

	const isMultipleQueries = useMemo(
		() =>
			currentQuery.builder.queryData.length > 1 ||
			currentQuery.builder.queryFormulas.length > 0,
		[currentQuery],
	);

	const isGroupByExist = useMemo(() => {
		const groupByCount: number = currentQuery.builder.queryData.reduce<number>(
			(acc, query) => acc + query.groupBy.length,
			0,
		);

		return groupByCount > 0;
	}, [currentQuery]);

	const isLimit: boolean = useMemo(() => {
		if (!currentStagedQueryData) return false;
		if (!currentStagedQueryData.limit) return false;

		return logs.length >= currentStagedQueryData.limit;
	}, [logs.length, currentStagedQueryData]);

	const listChartQuery = useMemo(() => {
		if (!stagedQuery || !currentStagedQueryData) return null;

		const modifiedQueryData: IBuilderQuery = {
			...currentStagedQueryData,
			aggregateOperator: StringOperators.COUNT,
		};

		const modifiedQuery: Query = {
			...stagedQuery,
			builder: {
				...stagedQuery.builder,
				queryData: stagedQuery.builder.queryData.map((item) => ({
					...item,
					...modifiedQueryData,
				})),
			},
		};

		return modifiedQuery;
	}, [stagedQuery, currentStagedQueryData]);

	const exportDefaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				currentQuery || initialQueriesMap.logs,
				PANEL_TYPES.TIME_SERIES,
				DataSource.LOGS,
			),
		[currentQuery, updateAllQueriesOperators],
	);

	const listChartData = useGetExplorerQueryRange(
		listChartQuery,
		PANEL_TYPES.TIME_SERIES,
	);

	const { data, isFetching, isError } = useGetExplorerQueryRange(
		requestData,
		panelType,
		{
			keepPreviousData: true,
			enabled: !isLimit,
		},
	);

	const handleSetActiveLog = useCallback((nextActiveLog: ILog) => {
		setActiveLog(nextActiveLog);
	}, []);

	const handleClearActiveLog = useCallback(() => {
		setActiveLog(null);
	}, []);

	const getUpdateQuery = useCallback(
		(newPanelType: GRAPH_TYPES): Query => {
			let query = updateAllQueriesOperators(
				currentQuery,
				newPanelType,
				DataSource.TRACES,
			);

			if (newPanelType === PANEL_TYPES.LIST) {
				query = updateQueriesData(query, 'queryData', (item) => ({
					...item,
					orderBy: item.orderBy.filter((item) => item.columnName !== SIGNOZ_VALUE),
					aggregateAttribute: initialAutocompleteData,
				}));
			}

			return query;
		},
		[currentQuery, updateAllQueriesOperators, updateQueriesData],
	);

	const handleChangeView = useCallback(
		(type: string) => {
			const newPanelType = type as GRAPH_TYPES;

			if (newPanelType === panelType) return;

			const query = getUpdateQuery(newPanelType);

			redirectWithQueryBuilderData(query, {
				[queryParamNamesMap.panelTypes]: newPanelType,
			});
		},
		[panelType, getUpdateQuery, redirectWithQueryBuilderData],
	);

	const getRequestData = useCallback(
		(
			query: Query | null,
			params: { page: number; log: ILog | null; pageSize: number },
		): Query | null => {
			if (!query) return null;

			const paginateData = getPaginationQueryData({
				currentStagedQueryData,
				listItemId: params.log ? params.log.id : null,
				orderByTimestamp,
				page: params.page,
				pageSize: params.pageSize,
			});

			const data: Query = {
				...query,
				builder: {
					...query.builder,
					queryData: query.builder.queryData.map((item) => ({
						...item,
						...paginateData,
						pageSize: params.pageSize,
					})),
				},
			};

			return data;
		},
		[currentStagedQueryData, orderByTimestamp],
	);

	const handleAddToQuery = useCallback(
		(fieldKey: string, fieldValue: string, operator: string): void => {
			const keysAutocomplete: BaseAutocompleteData[] =
				queryClient.getQueryData<SuccessResponse<IQueryAutocompleteResponse>>(
					[QueryBuilderKeys.GET_AGGREGATE_KEYS],
					{ exact: false },
				)?.payload.attributeKeys || [];

			const existAutocompleteKey = chooseAutocompleteFromCustomValue(
				keysAutocomplete,
				fieldKey,
			);

			const currentOperator =
				Object.keys(OPERATORS).find((op) => op === operator) || '';

			const nextQuery: Query = {
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: currentQuery.builder.queryData.map((item) => ({
						...item,
						filters: {
							...item.filters,
							items: [
								...item.filters.items.filter(
									(item) => item.key?.id !== existAutocompleteKey.id,
								),
								{
									id: uuid(),
									key: existAutocompleteKey,
									op: currentOperator,
									value: fieldValue,
								},
							],
						},
					})),
				},
			};

			redirectWithQueryBuilderData(nextQuery);
		},
		[currentQuery, queryClient, redirectWithQueryBuilderData],
	);

	const handleEndReached = useCallback(
		(index: number) => {
			if (isLimit) return;
			if (logs.length < pageSize) return;

			const lastLog = logs[index];

			const limit = currentStagedQueryData?.limit;

			const nextLogsLenth = logs.length + pageSize;

			const nextPageSize =
				limit && nextLogsLenth >= limit ? limit - logs.length : pageSize;

			if (!stagedQuery) return;

			const newRequestData = getRequestData(stagedQuery, {
				page: page + 1,
				log: orderByTimestamp ? lastLog : null,
				pageSize: nextPageSize,
			});

			setPage((prevPage) => prevPage + 1);

			setRequestData(newRequestData);
		},
		[
			isLimit,
			logs,
			currentStagedQueryData?.limit,
			pageSize,
			stagedQuery,
			getRequestData,
			page,
			orderByTimestamp,
		],
	);

	const {
		mutate: updateDashboard,
		isLoading: isUpdateDashboardLoading,
	} = useUpdateDashboard();

	const handleExport = useCallback(
		(dashboard: Dashboard | null): void => {
			if (!dashboard) return;

			const updatedDashboard = addEmptyWidgetInDashboardJSONWithQuery(
				dashboard,
				exportDefaultQuery,
			);

			updateDashboard(updatedDashboard, {
				onSuccess: (data) => {
					if (data.error) {
						const message =
							data.error === 'feature usage exceeded' ? (
								<span>
									Panel limit exceeded for {DataSource.LOGS} in community edition. Please
									checkout our paid plans{' '}
									<a
										href="https://signoz.io/pricing/?utm_source=product&utm_medium=dashboard-limit"
										rel="noreferrer noopener"
										target="_blank"
									>
										here
									</a>
								</span>
							) : (
								data.error
							);
						notifications.error({
							message,
						});

						return;
					}

					const dashboardEditView = `${generatePath(ROUTES.DASHBOARD, {
						dashboardId: data?.payload?.uuid,
					})}/new?${QueryParams.graphType}=graph&${QueryParams.widgetId}=empty&${
						queryParamNamesMap.compositeQuery
					}=${encodeURIComponent(JSON.stringify(exportDefaultQuery))}`;

					history.push(dashboardEditView);
				},
				onError: handleAxisError,
			});
		},
		[
			exportDefaultQuery,
			history,
			notifications,
			updateDashboard,
			handleAxisError,
		],
	);

	useEffect(() => {
		const shouldChangeView = isMultipleQueries || isGroupByExist;

		if (panelType === PANEL_TYPES.LIST && shouldChangeView) {
			handleChangeView(PANEL_TYPES.TIME_SERIES);
		}
	}, [panelType, isMultipleQueries, isGroupByExist, handleChangeView]);

	useEffect(() => {
		const currentData = data?.payload.data.newResult.data.result || [];
		if (currentData.length > 0 && currentData[0].list) {
			const currentLogs: ILog[] = currentData[0].list.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			setLogs((prevLogs) => [...prevLogs, ...currentLogs]);
		}
	}, [data]);

	useEffect(() => {
		if (
			requestData?.id !== stagedQuery?.id ||
			currentMinTimeRef.current !== minTime
		) {
			const newRequestData = getRequestData(stagedQuery, {
				page: 1,
				log: null,
				pageSize,
			});
			setLogs([]);
			setPage(1);
			setRequestData(newRequestData);
			currentMinTimeRef.current = minTime;
		}
	}, [stagedQuery, requestData, getRequestData, pageSize, minTime]);

	const tabsItems: TabsProps['items'] = useMemo(
		() => [
			{
				label: (
					<TabLabel
						label="List View"
						tooltipText="Please remove attributes from Group By filter to switch to List View tab"
						isDisabled={isMultipleQueries || isGroupByExist}
					/>
				),
				key: PANEL_TYPES.LIST,
				disabled: isMultipleQueries || isGroupByExist,
				children: (
					<LogsExplorerList
						isLoading={isFetching}
						currentStagedQueryData={currentStagedQueryData}
						logs={logs}
						onOpenDetailedView={handleSetActiveLog}
						onEndReached={handleEndReached}
						onExpand={handleSetActiveLog}
						onAddToQuery={handleAddToQuery}
					/>
				),
			},
			{
				label: <TabLabel label="Time Series" isDisabled={false} />,
				key: PANEL_TYPES.TIME_SERIES,
				children: (
					<TimeSeriesView isLoading={isFetching} data={data} isError={isError} />
				),
			},
			{
				label: 'Table',
				key: PANEL_TYPES.TABLE,
				children: (
					<LogsExplorerTable
						data={data?.payload.data.newResult.data.result || []}
						isLoading={isFetching}
					/>
				),
			},
		],
		[
			isMultipleQueries,
			isGroupByExist,
			isFetching,
			currentStagedQueryData,
			logs,
			handleSetActiveLog,
			handleEndReached,
			handleAddToQuery,
			data,
			isError,
		],
	);

	const chartData = useMemo(() => {
		if (!stagedQuery) return [];

		if (panelType === PANEL_TYPES.LIST) {
			if (
				listChartData &&
				listChartData.data &&
				listChartData.data.payload.data.result.length > 0
			) {
				return listChartData.data.payload.data.result;
			}
			return [];
		}

		if (!data || data.payload.data.result.length === 0) return [];

		const isGroupByExist = stagedQuery.builder.queryData.some(
			(queryData) => queryData.groupBy.length > 0,
		);

		return isGroupByExist
			? data.payload.data.result
			: [data.payload.data.result[0]];
	}, [stagedQuery, data, panelType, listChartData]);

	return (
		<>
			<LogsExplorerChart isLoading={isFetching} data={chartData} />
			{stagedQuery && (
				<ActionsWrapper>
					<ExportPanel
						query={exportDefaultQuery}
						isLoading={isUpdateDashboardLoading}
						onExport={handleExport}
					/>
				</ActionsWrapper>
			)}
			<TabsStyled
				items={tabsItems}
				defaultActiveKey={panelType || PANEL_TYPES.LIST}
				activeKey={panelType || PANEL_TYPES.LIST}
				onChange={handleChangeView}
				destroyInactiveTabPane
			/>
			<LogDetail
				log={activeLog}
				onClose={handleClearActiveLog}
				onAddToQuery={handleAddToQuery}
				onClickActionItem={handleAddToQuery}
			/>

			<GoToTop />
		</>
	);
}

export default memo(LogsExplorerViews);
