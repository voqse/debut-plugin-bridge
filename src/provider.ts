import { Debut, generateOHLC, getHistory } from '@debut/community-core';
import { BaseTransport, Candle, DebutOptions } from '@debut/types';
import { cli } from '@debut/plugin-utils';

export type Params = {
    days?: number;
    ohlc?: boolean;
    gap?: number;
};

export class Provider extends Debut {
    private historicalTicks: Candle[] = [];
    private learningDays: number;
    private counter: number = 0;
    public currentTick: Candle;

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

        // if (ohlc) {
        //     this.historicalTicks = generateOHLC(this.historicalTicks);
        // }
    }

    async onTick(candle: Candle) {
        this.currentTick = candle;
    }

    private learningCandles(): Candle {
        if (this.counter < this.historicalTicks.length) {
            return this.historicalTicks[this.counter++];
        }

        this.getCandle = () => this.currentTick;
        return this.currentTick;
    }

    public getCandle(): Candle {
        if (this.historicalTicks.length) {
            // Boost performance by omitting conditional expression
            this.getCandle = this.learningDays
                ? this.learningCandles
                : () => this.historicalTicks[this.counter++ % this.historicalTicks.length];
            return this.historicalTicks[this.counter++];
        }

        this.getCandle = () => this.currentTick;
        return this.currentTick;
    }
}
