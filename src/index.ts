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
    // TODO: Validate if a key is in extraTickers array
    const debuts: { [key: string]: ExtraDebut } = {};
    const candles: { [key: string]: Candle[] } = {};

    return {
        name: 'extraCandles',
        api: {
            getCandles: () => candles,
        },

        onInit() {
            // Get main bot config
            const { transport, opts: debutOpts } = this.debut;

            // Init additional bots for every extra ticker
            for (const ticker of opts.extraTickers) {
                debuts[ticker] = new ExtraDebut(transport, { ...debutOpts, ticker, sandbox: true });
            }
        },

        async onStart() {
            // Start all the bots
            for (const ticker of opts.extraTickers) {
                await debuts[ticker].start();
            }
        },

        async onCandle() {
            // Map all candles into last and prev pairs
            for (const ticker of opts.extraTickers) {
                const { currentCandle } = debuts[ticker];

                // Last one goes in array start
                candles[ticker].unshift(currentCandle);

                // Keep only current and previous candles
                if (candles[ticker].length === 3) {
                    candles[ticker].pop();
                }
            }
        },

        async onDispose() {
            // Stop all the bots
            for (const ticker of opts.extraTickers) {
                await debuts[ticker].dispose();
            }
        },
    };
}
