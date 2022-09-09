# debut-plugin-candles

[![CI](https://img.shields.io/github/workflow/status/voqse/debut-plugin-candles/CI)](https://github.com/voqse/debut-plugin-candles/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/debut-plugin-candles)](https://www.npmjs.com/package/debut-plugin-candles)

A plugin for [Debut](https://github.com/debut-js) platform that provides additional candles of specified tickers to strategy.

## Install
[@debut/community-core](https://github.com/debut-js/Strategies) should be installed. If you are using [Strategies](https://github.com/debut-js/Strategies) repository just type:
```shell
npm install debut-plugin-candles
```
## Usage
1. Extend strategy options with `CandlesPluginOptions`:
```typescript
// bot.ts
export interface CCIDynamicBotOptions
    extends CandlesPluginOptions {
    //...
}

// cfgs.ts
export const ETHUSDT: CCIDynamicBotOptions = {
    candles: ['BTCUSDT'],
    //...
```

2. Declare `CandlesPluginAPI`:
```typescript
// bot.ts
export class CCIDynamic extends Debut {
    declare opts: CandlesPluginAPI;

    //...

}
```

3. Register `candlesPlugin()` plugin
```typescript
// bot.ts
this.registerPlugins([candlesPlugin(this.opts, env?)]);
```

4. Get candles:
```typescript
// bot.ts
this.plugins.candles.get();

// will return ([0] last, [1] prev):
// {
//     BTCUSDT: {
//             time: 1662240600000,
//             o: 1552.42,
//             c: 1552.42,
//             h: 1552.42,
//             l: 1552.42,
//             v: 2456
//         },
// }
```
