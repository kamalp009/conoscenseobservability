import { Time } from 'container/TopNav/DateTimeSelection/config';
import { Time as TimeV2 } from 'container/TopNav/DateTimeSelectionV2/config';
import { GlobalReducer } from 'types/reducer/globalTime';

import getMinAgo from './getStartAndEndTime/getMinAgo';

const GetMinMax = (
	interval: Time | TimeV2,
	dateTimeRange?: [number, number],
	// eslint-disable-next-line sonarjs/cognitive-complexity
): GetMinMaxPayload => {
	let maxTime = new Date().getTime();
	let minTime = 0;

	if (interval === '1min') {
		const minTimeAgo = getMinAgo({ minutes: 1 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '10min') {
		const minTimeAgo = getMinAgo({ minutes: 10 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '15min') {
		const minTimeAgo = getMinAgo({ minutes: 15 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '1hr') {
		const minTimeAgo = getMinAgo({ minutes: 60 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '30min') {
		const minTimeAgo = getMinAgo({ minutes: 30 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '45min') {
		const minTimeAgo = getMinAgo({ minutes: 45 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '5min') {
		const minTimeAgo = getMinAgo({ minutes: 5 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '1day') {
		// one day = 24*60(min)
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '3days') {
		// three day = one day * 3
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 * 3 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '4days') {
		// four day = one day * 4
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 * 4 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '10days') {
		// ten day = one day * 10
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 * 10 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '1week') {
		// one week = one day * 7
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 * 7 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '2weeks') {
		// two week = one day * 14
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 * 14 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '6weeks') {
		// six week = one day * 42
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 * 42 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === '2months') {
		// two months = one day * 60
		const minTimeAgo = getMinAgo({ minutes: 24 * 60 * 60 }).getTime();
		minTime = minTimeAgo;
	} else if (['3hr', '4hr', '6hr', '12hr'].includes(interval)) {
		const h = parseInt(interval.replace('hr', ''), 10);
		const minTimeAgo = getMinAgo({ minutes: h * 60 }).getTime();
		minTime = minTimeAgo;
	} else if (interval === 'custom') {
		maxTime = (dateTimeRange || [])[1] || 0;
		minTime = (dateTimeRange || [])[0] || 0;
	} else {
		throw new Error('invalid time type');
	}

	return {
		minTime: minTime * 1000000,
		maxTime: maxTime * 1000000,
	};
};

export interface GetMinMaxPayload {
	minTime: GlobalReducer['minTime'];
	maxTime: GlobalReducer['maxTime'];
}

export default GetMinMax;
