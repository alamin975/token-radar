# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/alamin975/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/alamin975/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Which pre-token protocol is worth farming next, and what to do about it. Token Radar reads a sealed DefiLlama protocol snapshot, ranks every protocol that records no token by what its launch would be worth, and hands each one a concrete farm plan — in a web dashboard you can sort, search and filter.

Entered on [make.fun](https://make.fun/bounty/token-radar-01) for the token-radar-01 bounty.

## How value is scored

Implied value is this radar's own claim, built only from the snapshot's figures — TVL, seven-day TVL growth and how long the protocol has run with no token recorded. No protocol name is ever special-cased.

```
base     = $1,000,000 × √(TVL / $1,000,000)
growth   = clamp(7d change, −50%, +100%)
growth × = 1 + 0.8 × growth / 100
maturity × = 0.75 + 0.25 × min(age, 1095) / 1095   (age unknown: ×0.875)
implied  = round(base × growth × × maturity ×)
```

TVL is on a square-root scale on purpose: the biggest rankable protocol holds about 550× the TVL of the smallest, but only about 23× the base value, so a fast-growing young protocol can outrank a large stagnant one. Growth is clamped so one hot week cannot dominate the board. "Records no token" means the snapshot lists no market cap, CoinGecko id or symbol for the protocol — DefiLlama's record, not proof it has none.

The board covers every protocol the snapshot's watchlist names (TVL at or above $50,000,000, no token recorded, not a wrapped, staked or bridged product, not a versioned pool, not named after an exchange) plus every other protocol the same rule keeps, however small — 198 rows on this snapshot. Protocols whose token already trades are set aside in "Already launched" and are never ranked.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

`main.ts` (Node 22, standard library only) reads the snapshot, writes `board.json`, the dashboard's data (`data.js`), copies `dashboard/` and `screenshots/` to the output, and writes `dossier.json` with the vendored `vendor/makefun-board.ts`. Running it twice writes byte-identical output. Open `out/dashboard/index.html` in a browser to use the dashboard.
