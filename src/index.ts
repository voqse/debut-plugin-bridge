import { Candle, DebutOptions, PluginInterface } from '@debut/types';
import { logger, LoggerOptions } from '@voqse/logger';
import { Bot } from './bot';

const pluginName = 'candles';

// TODO: Validate if a key is in opts.candles array
export type TickerData<T> = {
    [key: string]: T;
};

export interface CandlesPluginOptions extends DebutOptions, LoggerOptions {
    candles: string[];
}

export interface CandlesMethodsInterface {
    get(): TickerData<Candle[]>;
    get(ticker: string): Candle[];
}

export interface CandlesPluginAPI {
    [pluginName]: CandlesMethodsInterface;
}

export interface CandlesInterface extends PluginInterface {
    name: string;
    api: CandlesMethodsInterface;
}

export function candlesPlugin(opts: CandlesPluginOptions): CandlesInterface {
    const log = logger(pluginName, opts);
    const bots: TickerData<Bot> = {};
    const candles: TickerData<Candle[]> = {};

    function get(): TickerData<Candle[]>;
    function get(ticker: string): Candle[];
    function get(ticker?: string): any {
        return ticker ? candles[ticker] : candles;
    }

    return {
        name: pluginName,
        api: {
            get,
        },

        async onInit() {
            log.info('Initializing plugin...');
            // Get main bot config
            const { transport, opts: debutOpts } = this.debut;

            // Init additional bots for every extra ticker
            try {
                for (const ticker of opts.candles) {
                    log.debug(`Creating ${ticker} bot...`);
                    bots[ticker] = new Bot(transport, { ...debutOpts, ticker, sandbox: true });
                    candles[ticker] = [];
                }
                log.debug(`${Object.keys(bots).length} bot(s) created`);
            } catch (e) {
                log.error('Bot(s) creation fail\n', e);
            }

            // // Pre-learn all bots
            // try {
            //     await Promise.all(
            //         opts.candles.map((ticker) => {
            //             log.debug(`Pre-learning ${ticker} bot...`);
            //             return bots[ticker].learn(7);
            //         }),
            //     );
            //     log.debug(`${Object.keys(bots).length} bot(s) pre-learned`);
            // } catch (e) {
            //     log.error('Bot(s) pre-learning fail\n', e);
            // }
        },

        async onStart() {
            log.info('Starting plugin...');
            // Start all the bots concurrently
            try {
                await Promise.all(
                    opts.candles.map((ticker) => {
                        log.debug(`Starting ${ticker} bot...`);
                        return bots[ticker].start();
                    }),
                );
                log.debug(`${Object.keys(bots).length} bot(s) started`);
            } catch (e) {
                log.error('Bot(s) start fail\n', e);
            }
        },

        async onCandle() {
            log.verbose('Candle received');

            // Map all candles into last and prev pairs
            for (const ticker of opts.candles) {
                log.verbose(`Looking for ${ticker} candle...`);
                const { currentCandle } = bots[ticker];

                // Last one goes in array start
                candles[ticker].unshift(currentCandle);

                // Keep only current and previous candles
                if (candles[ticker].length === 3) {
                    candles[ticker].pop();
                }
            }
            log.verbose(`${opts.candles.length} candle(s) received`);
        },

        async onDispose() {
            log.info('Shutting down plugin...');
            // Stop all the bots concurrently
            try {
                await Promise.all(
                    opts.candles.map((ticker) => {
                        log.debug(`Stop ${ticker} bot...`);
                        return bots[ticker].dispose();
                    }),
                );
                log.debug(`${Object.keys(bots).length} bot(s) stopped`);
            } catch (e) {
                log.error('Bot(s) stop fail\n', e);
            }
        },
    };
}
