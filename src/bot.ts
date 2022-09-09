import { Debut } from '@debut/community-core';
import { BaseTransport, Candle, DebutOptions } from '@debut/types';

export class Bot extends Debut {
    constructor(transport: BaseTransport, opts: DebutOptions) {
        super(transport, opts);

        // this.registerPlugins([]);
    }

    // public getCandle() {
    //     return this.currentCandle;
    // }
}
