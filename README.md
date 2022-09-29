# debut-plugin-bridge

[![CI](https://img.shields.io/github/workflow/status/voqse/debut-plugin-bridge/CI)](https://github.com/voqse/debut-plugin-bridge/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/debut-plugin-bridge)](https://www.npmjs.com/package/debut-plugin-bridge)

A plugin for [Debut](https://github.com/debut-js) platform that provides additional candles of specified tickers to strategy.

## Install
[@debut/community-core](https://github.com/debut-js/Strategies) should be installed. If you are using [Strategies](https://github.com/debut-js/Strategies) repository just type:
```shell
npm install debut-plugin-bridge
```
## Usage
1. Extend strategy options with `BridgePluginOptions`:
```typescript
// bot.ts
export interface CCIDynamicBotOptions
    extends BridgePluginOptions {
    //...
}

// cfgs.ts
export const ETHUSDT: CCIDynamicBotOptions = {
    tickers: ['BTCUSDT'],
    //...
```

2. Declare `BridgePluginAPI`:
```typescript
// bot.ts
export class CCIDynamic extends Debut {
    declare opts: BridgePluginAPI;

    //...

}
```

3. Register `bridgePlugin()` plugin
```typescript
// bot.ts
this.registerPlugins([bridgePlugin(this.opts, env?)]);
```

4. Get candles:
```typescript
// bot.ts
this.plugins.bridge.get();

// will return:
// [
//       {
//             time: 1662240600000,
//             o: 1552.42,
//             c: 1552.42,
//             h: 1552.42,
//             l: 1552.42,
//             v: 2456
//       },
// ]

```
