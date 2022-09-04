import { Debut } from '@debut/community-core';
import { BaseTransport, DebutOptions } from '@debut/types';

export class ExtraDebut extends Debut {
    constructor(transport: BaseTransport, opts: DebutOptions) {
        super(transport, opts);

        // this.registerPlugins([]);
    }

    // public getCandle() {
    //     return this.currentCandle;
    // }
}
