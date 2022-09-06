import { Candle, PluginInterface } from '@debut/types';
import { ExtraDebut } from './debut';
import { logger, LogLevel } from './utils';

export type ExtraCandlesPluginOptions = {
    extraTickers: string[];
    logLevel: LogLevel;
};

export interface ExtraCandlesMethodsInterface {
    getCandles(): { [key: string]: Candle[] };
}

export interface ExtraCandlesPluginAPI {
    extraCandles: ExtraCandlesMethodsInterface;
}

export interface ExtraCandlesInterface extends PluginInterface {
    name: 'extraCandles';
    api: ExtraCandlesMethodsInterface;
}

export function extraCandles(opts: ExtraCandlesPluginOptions): ExtraCandlesInterface {
    // TODO: Validate if a key is in extraTickers array
    const debuts: { [key: string]: ExtraDebut } = {};
    const candles: { [key: string]: Candle[] } = {};
    const log = logger('[extraCandles]', opts.logLevel);

    return {
        name: 'extraCandles',
        api: {
            getCandles: () => candles,
        },

        async onInit() {
            log.info('Initializing plugin...');
            // Get main bot config
            const { transport, opts: debutOpts } = this.debut;

            // Init additional bots for every extra ticker
            try {
                for (const ticker of opts.extraTickers) {
                    log.verbose(`Creating ${ticker} bot...`);
                    debuts[ticker] = new ExtraDebut(transport, { ...debutOpts, ticker, sandbox: true });
                    candles[ticker] = [];

                    // await debuts[ticker].start();
                }
            } catch (e) {
                log.error('Bot(s) creation fail', e);
            }
            log.debug(`${Object.keys(debuts).length} bot(s) created`);
        },

        async onStart() {
            log.info('Starting plugin...');

            // Start all the bots
            for (const ticker of opts.extraTickers) {
                log.verbose(`Starting ${ticker} bot...`);
                await debuts[ticker].start();
            }
            log.debug(`${Object.keys(debuts).length} bot(s) started`);
        },

        async onCandle() {
            log.verbose('Candle received');

            // Map all candles into last and prev pairs
            for (const ticker of opts.extraTickers) {
                log.verbose(`Looking for ${ticker} candle...`);
                const { currentCandle } = debuts[ticker];

                // Last one goes in array start
                candles[ticker].unshift(currentCandle);

                // Keep only current and previous candles
                if (candles[ticker].length === 3) {
                    candles[ticker].pop();
                }
            }
            log.verbose('All candle(s) received');
        },

        async onDispose() {
            log.info('Shutting down plugin...');
            // Stop all the bots
            for (const ticker of opts.extraTickers) {
                log.verbose(`Shutting down ${ticker} bot...`);
                await debuts[ticker].dispose();
            }
            log.debug(`${Object.keys(debuts).length} bot(s) stopped`);
        },
    };
}
