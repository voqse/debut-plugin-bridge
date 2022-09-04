import { Candle, PluginInterface } from '@debut/types';
import { ExtraDebut } from './debut';

export type ExtraCandlesPluginOptions = {
    extraTickers: string[];
};

export interface ExtraCandlesPluginAPI {
    extraCandles: {
        getCandles: () => Candle[][];
    };
}

export function extraCandles(opts: ExtraCandlesPluginOptions): PluginInterface {
    let extraDebuts: ExtraDebut[] = [];
    let extraCandles: Candle[][] = []; // [0] - current candles; [1] - previous candle

    return {
        name: 'extraCandles',
        api: {
            getCandles: () => extraCandles,
        },

        onInit() {
            // Get main bot config
            const { transport, opts: debutOpts } = this.debut;

            // Init additional bots for every extra ticker
            extraDebuts = opts.extraTickers.map(
                (ticker) => new ExtraDebut(transport, { ...debutOpts, ticker, sandbox: true }),
            );
        },

        async onStart() {
            // Start all the bots
            for (const extraDebut of extraDebuts) {
                await extraDebut.start();
            }
        },

        async onCandle() {
            // Get current candle for all additional tickers
            const currCandles = extraDebuts.map((extraDebut) => extraDebut.currentCandle);

            // Last one goes in array start
            extraCandles.unshift(currCandles);

            // Keep only current and previous candles
            if (extraCandles.length === 3) {
                extraCandles.pop();
            }
        },

        async onDispose() {
            // Stop all the bots
            for (const extraDebut of extraDebuts) {
                await extraDebut.dispose();
            }
        },
    };
}
