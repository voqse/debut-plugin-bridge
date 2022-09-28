import { Candle, DebutOptions, PluginInterface, WorkingEnv } from '@debut/types';
import { logger, LoggerOptions } from '@voqse/logger';
import { Bot } from './bot';

const pluginName = 'candles';

// TODO: Validate if a key is in opts.candles array
export type CandlesData<T> = {
    [key: string]: T;
};

interface CandlesMethodsInterface {
    get(): Candle[];
}

export interface CandlesPluginOptions extends DebutOptions, LoggerOptions {
    candles: string[];
    // TODO: Get this param from CLI
    learningDays?: number;
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

    return {
        name: pluginName,
        api: {
            get: () => Object.values(candles),
        },

        async onInit() {
            log.info('Initializing plugin...');
            // Get main bot config
            const { transport, opts: debutOpts } = this.debut;

            // Init additional bots for every extra ticker
            await Promise.allSettled(
                opts.candles.map((ticker) => {
                    log.debug(`Creating ${ticker} bot...`);
                    bots[ticker] = new Bot(transport, { ...debutOpts, ticker, sandbox: true });

                    // Load history if testing or learning mode
                    // TODO: 1. Fix Issue: If main ticker history loaded, tester doesn't wait
                    //       for additional loading, so plugin returns undefined candles
                    //       2. Move cli days arg here and call init() without conditional
                    if (testing) {
                        bots[ticker].init();
                    } else if (opts.learningDays) {
                        bots[ticker].init(opts.learningDays);
                    }
                }),
            );
            log.debug(`${Object.keys(bots).length} bot(s) created`);
        },

        async onStart() {
            log.info('Starting plugin...');
            if (testing) return;

            // Start all the bots concurrently
            await Promise.allSettled(
                opts.candles.map((ticker) => {
                    log.debug(`Starting ${ticker} bot...`);
                    bots[ticker].start();
                }),
            );
            log.debug(`${Object.keys(bots).length} bot(s) started`);
        },

        onBeforeTick() {
            // Get most recent candles from bots as soon as possible
            for (const ticker of opts.candles) {
                const candle = bots[ticker].getCandle();

                if (!candle) {
                    throw 'pluginCandles: Undefined candle received, please check your transport.';
                }
                candles[ticker] = candle;
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
            await Promise.allSettled(
                opts.candles.map((ticker) => {
                    log.debug(`Stop ${ticker} bot...`);
                    bots[ticker].dispose();
                }),
            );
            log.debug(`${Object.keys(bots).length} bot(s) stopped`);
        },
    };
}
