# debut-plugin-extra-candles

[![CI](https://img.shields.io/github/workflow/status/voqse/debut-plugin-extra-candles/CI)](https://github.com/voqse/debut-plugin-extra-candles/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/debut-plugin-extra-candles)](https://www.npmjs.com/package/debut-plugin-extra-candles)

A plugin for [Debut](https://github.com/debut-js) platform that provides additional candles of specified tickers to strategy.

## Install
[@debut/community-core](https://github.com/debut-js/Strategies) should be installed. If you are using [Strategies](https://github.com/debut-js/Strategies) repository just type:
```shell
npm install debut-plugin-extra-candles
```
## Usage
1. Extend strategy options with `ExtraCandlesPluginOptions`:
```typescript
// bot.ts
export interface CCIDynamicBotOptions
    extends ExtraCandlesPluginOptions {
    //...
}

// cfgs.ts
export const ETHUSDT: CCIDynamicBotOptions = {
    corrTopLevel: 0.4,
    corrLowLevel: -0.4,
    corrPeriod: 20,
    extraTickers: ['BTCUSDT'],
    //...
```

2. Declare `ExtraCandlesPluginAPI`:
```typescript
// bot.ts
export class CCIDynamic extends Debut {
    declare opts: ExtraCandlesPluginAPI;

    //...

}
```

3. Register `extraCandles()` plugin
```typescript
// bot.ts
this.registerPlugins([extraCandles(this.opts)]);
```

4. Get candles:
```typescript
// bot.ts
this.plugins.extraCandles.getCandles();

// will return:
// {
//     BTCUSDT: [
//         {
//             time: 1662240600000,
//             o: 1552.42,
//             c: 1552.42,
//             h: 1552.42,
//             l: 1552.42,
//             v: 2456
//         },
//         {
//             time: 1662239700000,
//             o: 1554.6,
//             c: 1554.6,
//             h: 1554.6,
//             l: 1554.6,
//             v: 3274
//         }
//     ]
// }
```
