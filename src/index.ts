import { Candle, DebutOptions, PluginInterface } from '@debut/types';
import { Bot } from './bot';
import { logger, LogLevel } from './utils';

const pluginName = 'candles';

export interface CandlesPluginOptions extends DebutOptions {
    [pluginName]: string[];
    logLevel: LogLevel;
}

export interface CandlesMethodsInterface {
    get(): TickersObject<Candle[]>;
    get(ticker: string): Candle[];
}

export interface CandlesPluginAPI {
    [pluginName]: CandlesMethodsInterface;
}

export interface CandlesInterface extends PluginInterface {
    name: string;
    api: CandlesMethodsInterface;
}

// TODO: Validate if a key is in opts.candles array
export type TickersObject<T> = {
    [key: string]: T;
};

export function candlesPlugin(opts: CandlesPluginOptions): CandlesInterface {
    const log = logger(pluginName, opts.logLevel);
    const bots: TickersObject<Bot> = {};
    const candles: TickersObject<Candle[]> = {};

    function get(): TickersObject<Candle[]>;
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

                    // await bots[ticker].learn(1);
                }
            } catch (e) {
                log.error('Bot(s) creation fail', e);
            }
            log.debug(`${Object.keys(bots).length} bot(s) created`);
        },

        async onStart() {
            log.info('Starting plugin...');

            // Start all the bots concurrently
            await Promise.all(
                opts.candles.map((ticker) => {
                    log.debug(`Starting ${ticker} bot...`);
                    return bots[ticker].start();
                }),
            );

            log.debug(`${Object.keys(bots).length} bot(s) started`);
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
            await Promise.all(
                opts.candles.map((ticker) => {
                    log.debug(`Shutting down ${ticker} bot...`);
                    return bots[ticker].dispose();
                }),
            );

            log.debug(`${Object.keys(bots).length} bot(s) stopped`);
        },
    };
}
