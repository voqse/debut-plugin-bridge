import { Candle, DebutOptions, PluginInterface } from '@debut/types';
import { logger, LoggerOptions } from '@voqse/logger';
import { Params, Provider } from './provider';
import { cli } from '@debut/plugin-utils';

// TODO: Validate if a key is in opts.candles array
type BridgeData<T> = {
    [key: string]: T;
};

interface BridgePluginMethods {
    get(): Candle[];
}

export interface BridgePluginOptions extends DebutOptions, LoggerOptions {
    bridge: string[];
}

export interface BridgePluginAPI {
    bridge: BridgePluginMethods;
}

export interface BridgePluginInterface extends PluginInterface {
    name: string;
    api: BridgePluginMethods;
}

export function bridgePlugin(opts: BridgePluginOptions): BridgePluginInterface {
    const log = logger('bridge', opts);
    const providers: BridgeData<Provider> = {};
    const candles: BridgeData<Candle> = {};

    const { days } = cli.getArgs<Params>();
    let testing = !!days;

    const allTickers = (callback) => {
        return Promise.all(opts.bridge.map((ticker) => callback(ticker, providers[ticker])));
    };

    const allTickersSync = (callback) => {
        return opts.bridge.map((ticker) => callback(ticker, providers[ticker]));
    };

    return {
        name: 'bridge',
        api: {
            get: () => Object.values(candles),
        },

        onInit() {
            log.info('Initializing plugin...');
            // Get main bot config
            const { transport, opts: debutOpts } = this.debut;

            // Init providers for every extra ticker
            allTickersSync((ticker) => {
                log.debug(`Creating ${ticker} provider...`);
                providers[ticker] = new Provider(transport, { ...debutOpts, ticker, sandbox: true });
            });
            // log.debug(`${Object.keys(providers).length} provider(s) created`);
        },

        async onLearn(days) {
            if (!days) return;

            await allTickers((ticker, provider) => {
                log.debug(`Learning ${ticker} provider...`);
                // Load history if testing or learning mode
                return provider.init(days);
            });
        },

        async onStart() {
            // Start all the providers concurrently
            await allTickers((ticker, provider) => {
                if (testing) {
                    log.debug(`Loading ${ticker} history...`);
                    // TODO: 1. Move cli days arg here and call init() without conditional
                    return provider.init();
                }

                log.debug(`Starting ${ticker} provider...`);
                return provider.start();
            });
        },

        onBeforeTick() {
            let getCandle = (ticker) => {
                const candle = providers[ticker].getCandle();

                if (!candle) {
                    log.error('Undefined candle received, please check your transport');
                    process.exit(0);
                }

                return candle;
            };

            // Get most recent candles from providers as soon as possible
            allTickersSync((ticker) => {
                candles[ticker] = getCandle(ticker);
            });
        },

        // Debug logging
        async onTick(tick) {
            log.verbose(`onTick: ${opts.ticker}:`, ...Object.values(tick));
            allTickersSync((ticker) => {
                log.verbose(`onTick: ${ticker}:`, ...Object.values(candles[ticker]));
            });
        },

        async onCandle(candle) {
            log.verbose(`onCandle: ${opts.ticker}:`, ...Object.values(candle));
            allTickersSync((ticker) => {
                log.verbose(`onCandle: ${ticker}:`, ...Object.values(candles[ticker]));
            });
        },

        async onDispose() {
            // log.info('Shutting down plugin...');
            if (testing) return;

            // Stop all the providers concurrently
            await allTickers((ticker, provider) => {
                log.debug(`Stopping ${ticker} provider...`);
                return provider.dispose();
            });
        },
    };
}
