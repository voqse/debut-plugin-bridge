import { Candle, DebutOptions, PluginInterface, WorkingEnv } from '@debut/types';
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
    get(): TickerData<Candle>;
    get(ticker: string): Candle;
}

export interface CandlesPluginAPI {
    [pluginName]: CandlesMethodsInterface;
}

export interface CandlesInterface extends PluginInterface {
    name: string;
    api: CandlesMethodsInterface;
}

export function candlesPlugin(opts: CandlesPluginOptions, env?: WorkingEnv): CandlesInterface {
    const log = logger(pluginName, opts);
    const bots: TickerData<Bot> = {};
    const candles: TickerData<Candle> = {};

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

                // Load history if testing mode
                if (testing) await bots[ticker].init();
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
            // Get most recent candle from bot as soon as possible while production mode
            for (const ticker of opts.candles) {
                candles[ticker] = bots[ticker].getCandle();
            }
        },

        // async onTick(tick) {
        //     log.verbose('onTick: Candle received');
        //     log.verbose(`onTick: ${opts.ticker} candle:`, tick);
        //     for (const ticker of opts.candles) {
        //         log.verbose(`onTick: ${ticker} candle:`, candles[ticker]);
        //     }
        // },
        //
        // async onCandle(candle) {
        //     log.verbose('onCandle: Candle received');
        //     log.verbose(`onCandle: ${opts.ticker} candle:`, candle);
        //     for (const ticker of opts.candles) {
        //         log.verbose(`onCandle: ${ticker} candle:`, candles[ticker]);
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
