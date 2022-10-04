import { Candle, DebutOptions, PluginInterface, WorkingEnv } from '@debut/types';
import { logger, LoggerOptions } from '@voqse/logger';
import { Provider } from './provider';

// TODO: Validate if a key is in opts.candles array
type BridgeData<T> = {
    [key: string]: T;
};

interface BridgeMethodsInterface {
    get(): Candle[];
}

export interface BridgePluginOptions extends DebutOptions, LoggerOptions {
    bridge: string[];
    // TODO: Get this param from CLI
    learningDays?: number;
}

export interface BridgePluginAPI {
    bridge: BridgeMethodsInterface;
}

export interface BridgePluginInterface extends PluginInterface {
    name: string;
    api: BridgeMethodsInterface;
}

export function bridgePlugin(opts: BridgePluginOptions, env?: WorkingEnv): BridgePluginInterface {
    const log = logger('bridge', opts);
    const providers: BridgeData<Provider> = {};
    const candles: BridgeData<Candle> = {};

    let testing = env === WorkingEnv.tester || env === WorkingEnv.genetic;

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
            for (const ticker of opts.bridge) {
                log.debug(`Creating ${ticker} provider...`);
                providers[ticker] = new Provider(transport, { ...debutOpts, ticker, sandbox: true });
            }
            log.debug(`${Object.keys(providers).length} provider(s) created`);
        },

        async onLearn(days) {
            if (!days) return;

            await Promise.all(
                opts.bridge.map((ticker) => {
                    log.debug(`Creating ${ticker} provider...`);
                    // Load history if testing or learning mode
                    // TODO: 1. Move cli days arg here and call init() without conditional
                    return providers[ticker].init(opts.learningDays);
                }),
            );
        },

        async onStart() {
            log.info('Starting plugin...');
            if (testing) {
                await Promise.all(
                    opts.bridge.map((ticker) => {
                        log.debug(`Loading ${ticker} history...`);
                        return providers[ticker].init();
                    }),
                );
                return;
            }

            // Start all the providers concurrently
            await Promise.all(
                opts.bridge.map((ticker) => {
                    log.debug(`Starting ${ticker} provider...`);
                    return providers[ticker].start();
                }),
            );
            log.debug(`${Object.keys(providers).length} provider(s) started`);
        },

        onBeforeTick() {
            let getCandle = (ticker) => {
                const candle = providers[ticker].getCandle();

                if (!candle) {
                    log.error('Undefined candle received, please check your transport');
                    process.exit(0);
                }

                // Do not check candles if transport is ok
                getCandle = (ticker) => providers[ticker].getCandle();
                return candle;
            };

            // Get most recent candles from providers as soon as possible
            for (const ticker of opts.bridge) {
                candles[ticker] = getCandle(ticker);
            }
        },

        // Debug logging
        // async onTick(tick) {
        //     log.verbose('onTick: Received');
        //     log.verbose(`onTick: ${opts.ticker}:`, ...Object.values(tick));
        //     for (const ticker of opts.bridge) {
        //         log.verbose(`onTick: ${ticker}:`, ...Object.values(candles[ticker]));
        //     }
        // },
        //
        // async onCandle(candle) {
        //     log.verbose('onCandle: Received');
        //     log.verbose(`onCandle: ${opts.ticker}:`, ...Object.values(candle));
        //     for (const ticker of opts.bridge) {
        //         log.verbose(`onCandle: ${ticker}:`, ...Object.values(candles[ticker]));
        //     }
        // },

        async onDispose() {
            log.info('Shutting down plugin...');
            if (testing) return;

            // Stop all the providers concurrently
            await Promise.all(
                opts.bridge.map((ticker) => {
                    log.debug(`Stop ${ticker} provider...`);
                    return providers[ticker].dispose();
                }),
            );
            log.debug(`${Object.keys(providers).length} provider(s) stopped`);
        },
    };
}
