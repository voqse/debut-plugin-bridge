import { Candle, PluginInterface } from '@debut/types';
export interface ExtraCandlesPluginAPI {
    extraCandles: {
        getCandles: () => Candle[][];
    };
}
export declare type ExtraCandlesPluginOptions = {
    extraTickers: string[];
};
export declare function corrTransport(opts: ExtraCandlesPluginOptions): PluginInterface;
