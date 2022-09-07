import { Candle, DebutOptions, PluginInterface } from '@debut/types';
import { logger, LoggerOptions } from '@voqse/logger';
import { cli, file } from '@debut/plugin-utils';
import path from 'path';
import { Bot } from './bot';
import { generateOHLC, getHistory } from '@debut/community-core';

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
    // addData(data): void;
}

export interface CandlesPluginAPI {
    [pluginName]: CandlesMethodsInterface;
}

export interface CandlesInterface extends PluginInterface {
    name: string;
    api: CandlesMethodsInterface;
}

type Params = {
    bot: string;
    ticker: string;
    days?: number;
    ohlc?: boolean;
    gap?: number;
};

export function candlesPlugin(opts: CandlesPluginOptions): CandlesInterface {
    const log = logger(pluginName, opts);
    const bots: TickerData<Bot> = {};
    const candles: TickerData<Candle[]> = {};

    let testing = false;
    let ticks;
    let testLastCandle: Candle;

    // const debutCandles: Candle[] = [];

    function get(): TickerData<Candle[]>;
    function get(ticker: string): Candle[];
    function get(ticker?: string): any {
        return ticker ? candles[ticker] : candles;
    }

    return {
        name: pluginName,
        api: {
            get,
            // addData(data) {
            //     debutCandles.push(data);
            // },
        },

        async onInit() {
            log.info('Initializing plugin...');
            const { days, gap, ohlc } = cli.getArgs<Params>();

            // Get main bot config
            const { transport, opts: debutOpts } = this.debut;

            // @ts-ignore
            if (transport?.setTicks) {
                testing = true;

                log.debug(`Loading ${opts.candles[0]} history...`);
                try {
                    ticks = await getHistory({
                        broker: opts.broker,
                        interval: opts.interval,
                        instrumentType: opts.instrumentType,
                        ticker: opts.candles[0],
                        days,
                        gapDays: gap,
                    });
                    if (ohlc) {
                        ticks = generateOHLC(ticks);
                    }
                    log.debug(`${ticks.length} candles loaded`);
                } catch (e) {
                    log.error('History load fail\n', e);
                }
            }

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

        onBeforeTick() {
            if (testing) {
                testLastCandle = ticks.shift();
            }
        },

        async onTick(tick) {
            log.verbose('onTick: Candle received');

            log.verbose(`onTick: ${opts.ticker} candle:`, tick);
            for (const ticker of opts.candles) {
                const currentCandle = testing ? testLastCandle : bots[ticker].currentCandle;
                log.verbose(`onTick: ${ticker} candle:`, currentCandle);
            }
        },

        async onCandle(candle) {
            log.verbose('onCandle: Candle received');

            log.verbose(`onCandle: ${opts.ticker} candle:`, candle);
            // Map all candles into last and prev pairs
            for (const ticker of opts.candles) {
                // log.verbose(`Looking for ${ticker} candle...`);
                const currentCandle = testing ? testLastCandle : bots[ticker].currentCandle;

                // Last one goes in array start
                candles[ticker].unshift(currentCandle);

                log.verbose(`onCandle: ${ticker} candle:`, currentCandle);

                // Keep only current and previous candles
                if (candles[ticker].length === 3) {
                    candles[ticker].pop();
                }
            }
            // log.verbose(`onCandle: ${opts.candles.length} candle(s) received`);
        },

        async onDispose() {
            log.info('Shutting down plugin...');

            // log.debug('Saving candles data...');
            // const botData = await cli.getBotData(this.debut.getName())!;
            // const workingDir = `${botData?.src}/${pluginName}/${this.debut.opts.ticker}/`;
            // const jsonPath = path.resolve(workingDir, './candles.json');
            //
            // try {
            //     file.ensureFile(jsonPath);
            //     file.saveFile(jsonPath, debutCandles);
            // } catch (e) {
            //     log.error('Candles data save fail\n', e);
            // }

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
