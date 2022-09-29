import { Debut, generateOHLC, getHistory } from '@debut/community-core';
import { BaseTransport, Candle, DebutOptions } from '@debut/types';
import { cli } from '@debut/plugin-utils';

type Params = {
    days?: number;
    ohlc?: boolean;
    gap?: number;
};

export class Provider extends Debut {
    private historicalTicks: Candle[] = [];
    private learningDays: number;

    constructor(transport: BaseTransport, opts: DebutOptions) {
        super(transport, opts);
    }

    public async init(learningDays?: number): Promise<void> {
        const { broker, interval, instrumentType, ticker } = this.opts;
        const { days, gap, ohlc } = cli.getArgs<Params>();
        const opts = {
            broker,
            interval,
            instrumentType,
            ticker,
            days,
            gapDays: gap || 0,
        };

        if (learningDays) {
            this.learningDays = learningDays;
            opts.days = learningDays;
            opts.gapDays = 0;
        }

        this.historicalTicks = await getHistory(opts);

        if (ohlc) {
            this.historicalTicks = generateOHLC(this.historicalTicks);
        }
    }

    private learningCandles(): Candle {
        if (this.historicalTicks.length) {
            return this.historicalTicks.shift();
        }
        this.getCandle = () => this.currentCandle;
        return this.currentCandle;
    }

    public getCandle(): Candle {
        if (this.historicalTicks.length) {
            // Boost performance by omitting conditional expression
            this.getCandle = this.learningDays ? this.learningCandles : () => this.historicalTicks.shift();
            return this.historicalTicks[0];
        }

        this.getCandle = () => this.currentCandle;
        return this.currentCandle;
    }
}
