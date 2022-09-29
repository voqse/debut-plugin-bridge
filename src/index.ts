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

        async onInit() {
            log.info('Initializing plugin...');
            // Get main bot config
            const { transport, opts: debutOpts } = this.debut;

            // Init providers for every extra ticker
            await Promise.all(
                opts.bridge.map((ticker) => {
                    log.debug(`Creating ${ticker} provider...`);
                    providers[ticker] = new Provider(transport, { ...debutOpts, ticker, sandbox: true });

                    // Load history if testing or learning mode
                    // TODO: 1. Fix Issue: If main ticker history loaded, tester doesn't wait
                    //       for additional loading, so plugin returns undefined candles
                    //       2. Move cli days arg here and call init() without conditional
                    if (testing) {
                        providers[ticker].init();
                    } else if (opts.learningDays) {
                        providers[ticker].init(opts.learningDays);
                    }
                }),
            );
            log.debug(`${Object.keys(providers).length} provider(s) created`);
        },

        async onStart() {
            log.info('Starting plugin...');
            if (testing) return;

            // Start all the providers concurrently
            await Promise.all(
                opts.bridge.map((ticker) => {
                    log.debug(`Starting ${ticker} provider...`);
                    providers[ticker].start();
                }),
            );
            log.debug(`${Object.keys(providers).length} provider(s) started`);
        },

        onBeforeTick() {
            let getCandle = (ticker) => {
                const candle = providers[ticker].getCandle();

                if (!candle) {
                    log.error('Undefined candle received, please check your transport')
                    process.exit(0)
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

            // Stop all the providers concurrently
            await Promise.all(
                opts.bridge.map((ticker) => {
                    log.debug(`Stop ${ticker} provider...`);
                    providers[ticker].dispose();
                }),
            );
            log.debug(`${Object.keys(providers).length} provider(s) stopped`);
        },
    };
}
