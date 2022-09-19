import { Candle, DebutOptions, PluginInterface, WorkingEnv } from '@debut/types';
import { logger, LoggerOptions } from '@voqse/logger';
import { Bot } from './bot';

const pluginName = 'candles';

// TODO: Validate if a key is in opts.candles array
export type CandlesData<T> = {
    [key: string]: T;
};

export interface CandlesPluginOptions extends DebutOptions, LoggerOptions {
    candles: string[];
    learningDays?: number;
}

export interface CandlesMethodsInterface {
    get(): CandlesData<Candle>;
    get(ticker: string): Candle;
}

export interface CandlesPluginAPI {
    [pluginName]: CandlesMethodsInterface;
}

export interface CandlesPluginInterface extends PluginInterface {
    name: string;
    api: CandlesMethodsInterface;
}

export function candlesPlugin(opts: CandlesPluginOptions, env?: WorkingEnv): CandlesPluginInterface {
    const log = logger(pluginName, opts);
    const bots: CandlesData<Bot> = {};
    const candles: CandlesData<Candle> = {};

    let testing = env === WorkingEnv.tester || env === WorkingEnv.genetic;

    function get(): typeof candles;
    function get(ticker: string): Candle;
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
            for (const ticker of opts.candles) {
                log.debug(`Creating ${ticker} bot...`);
                bots[ticker] = new Bot(transport, { ...debutOpts, ticker, sandbox: true });
                // Load history if testing or learning mode
                if (testing) {
                    await bots[ticker].init();
                } else if (opts.learningDays) {
                    await bots[ticker].init(opts.learningDays);
                }
            }
            log.debug(`${Object.keys(bots).length} bot(s) created`);
        },

        async onStart() {
            log.info('Starting plugin...');
            if (testing) return;

            // Start all the bots concurrently
            await Promise.all(
                opts.candles.map((ticker) => {
                    log.debug(`Starting ${ticker} bot...`);
                    return bots[ticker].start();
                }),
            );
            log.debug(`${Object.keys(bots).length} bot(s) started`);
        },

        onBeforeTick() {
            // Get most recent candles from bots as soon as possible
            for (const ticker of opts.candles) {
                candles[ticker] = bots[ticker].getCandle();
            }
        },

        // Debug logging
        // async onTick(tick) {
        //     log.verbose('onTick: Received');
        //     log.verbose(`onTick: ${opts.ticker}:`, ...Object.values(tick));
        //     for (const ticker of opts.candles) {
        //         log.verbose(`onTick: ${ticker}:`, ...Object.values(candles[ticker]));
        //     }
        // },
        //
        // async onCandle(candle) {
        //     log.verbose('onCandle: Received');
        //     log.verbose(`onCandle: ${opts.ticker}:`, ...Object.values(candle));
        //     for (const ticker of opts.candles) {
        //         log.verbose(`onCandle: ${ticker}:`, ...Object.values(candles[ticker]));
        //     }
        // },

        async onDispose() {
            log.info('Shutting down plugin...');
            if (testing) return;

            // Stop all the bots concurrently
            await Promise.all(
                opts.candles.map((ticker) => {
                    log.debug(`Stop ${ticker} bot...`);
                    return bots[ticker].dispose();
                }),
            );
            log.debug(`${Object.keys(bots).length} bot(s) stopped`);
        },
    };
}
