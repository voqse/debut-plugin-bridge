import { Debut, generateOHLC, getHistory } from '@debut/community-core';
import { BaseTransport, Candle, DebutOptions } from '@debut/types';
import { logger } from '../../node-logger';
import { cli } from '@debut/plugin-utils';

const log = logger('candles/bot', { logLevel: 3 });

type Params = {
    days?: number;
    ohlc?: boolean;
    gap?: number;
};

export class Bot extends Debut {
    private historicalTicks: Candle[] = [];

    constructor(transport: BaseTransport, opts: DebutOptions) {
        super(transport, opts);

        // this.registerPlugins([]);
    }

    public async init() {
        const { days, gap, ohlc } = cli.getArgs<Params>();

        log.debug(`Loading historical data for ${this.opts.ticker}...`);
        this.historicalTicks = await getHistory({
            broker: this.opts.broker,
            interval: this.opts.interval,
            instrumentType: this.opts.instrumentType,
            ticker: this.opts.ticker,
            days,
            gapDays: gap,
        });

        if (ohlc) {
            this.historicalTicks = generateOHLC(this.historicalTicks);
        }
    }

    public getCandle() {
        if (this.historicalTicks.length) {
            // Boost performance by omitting conditional expression
            this.getCandle = () => this.historicalTicks.shift();
            return this.historicalTicks[0];
        }

        this.getCandle = () => this.currentCandle;
        return this.currentCandle;
    }
}
