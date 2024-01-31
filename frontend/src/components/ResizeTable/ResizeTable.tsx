/* eslint-disable react/jsx-props-no-spreading */

import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { dragColumnParams } from 'hooks/useDragColumns/configs';
import {
	SyntheticEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import ReactDragListView from 'react-drag-listview';
import { ResizeCallbackData } from 'react-resizable';

import ResizableHeader from './ResizableHeader';
import { DragSpanStyle } from './styles';
import { ResizeTableProps } from './types';

function ResizeTable({
	columns,
	onDragColumn,
	...restProps
}: ResizeTableProps): JSX.Element {
	const [columnsData, setColumns] = useState<ColumnsType>([]);

	const handleResize = useCallback(
		(index: number) => (
			_e: SyntheticEvent<Element>,
			{ size }: ResizeCallbackData,
		): void => {
			const newColumns = [...columnsData];
			newColumns[index] = {
				...newColumns[index],
				width: size.width,
			};
			setColumns(newColumns);
		},
		[columnsData],
	);

	const mergedColumns = useMemo(
		() =>
			columnsData.map((col, index) => ({
				...col,
				...(onDragColumn && {
					title: (
						<DragSpanStyle className="dragHandler">
							{col?.title?.toString() || ''}
						</DragSpanStyle>
					),
				}),
				onHeaderCell: (column: ColumnsType<unknown>[number]): unknown => ({
					width: column.width,
					onResize: handleResize(index),
				}),
			})) as ColumnsType<any>,
		[columnsData, onDragColumn, handleResize],
	);

	const tableParams = useMemo(
		() => ({
			...restProps,
			components: { header: { cell: ResizableHeader } },
			columns: mergedColumns,
		}),
		[mergedColumns, restProps],
	);

	useEffect(() => {
		if (columns) {
			setColumns(columns);
		}
	}, [columns]);

	const paginationConfig = {
		hideOnSinglePage: true,
		showTotal: (total: number, range: number[]): string =>
			`${range[0]}-${range[1]} of ${total} items`,
		...tableParams.pagination,
	};

	return onDragColumn ? (
		<ReactDragListView.DragColumn {...dragColumnParams} onDragEnd={onDragColumn}>
			<Table {...tableParams} pagination={paginationConfig} />
		</ReactDragListView.DragColumn>
	) : (
		<Table {...tableParams} pagination={paginationConfig} />
	);
}

ResizeTable.defaultProps = {
	onDragColumn: undefined,
};

export default ResizeTable;
