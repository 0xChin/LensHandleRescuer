
# Lens Handle Recover Bot

### Table of contents

- [About the project](#about-the-project)
- [Installation and usage](#installation-and-usage)
- [Troubleshooting](#troubleshooting)

### About the project
This is a script that relies on [Marlin flashbots](https://docs.marlin.org/docs/User%20Guides/Polygon%20MEV/For%20Searchers/) to recover a Lens Handle from a compromised wallet, sending a bundle with the funding tx + the transfer tx in the same block

### Installation and usage

##### .env
```bash
cp .env.example .env
```

 To complete the `.env` file, you will need:
- `POLYGON_RPC_URL`: A node endpoint, you can get it from [Chainlist](https://chainlist.org/)
- `COMPROMISED_PRIVATE_KEY`: The private key of the compromised account with the Lens handle
- `NON_COMPROMISED_PRIVATE_KEY`: A "sponsor" private key that will fund the compromised account
- `TOKEN_ID`: The token ID of the Lens handle that you want to recover. You can find it in [OpenSea](https://opensea.io) 

##### Running the bot
```bash
npm i -g ts-node # If ts-node is not installed
ts-node --esm index.ts 
```

### Troubleshooting
Due to the high speed in which Polygon creates new blocks (2s), it is *very* possible that at the time of sending a bundle, it arrives too early/late. You can try to change the `blk` variable, which is the target block. What better worked for me is sending the bundle 3 blocks ahead (`blk + 3`)

#####  Header not found
This error happens when you send a bundle targeting a block that is not the next one (e.g: sending a bundle for the block 10 when the current block is 6 and it arrives when the block 8 is being formed)

##### Please simulate on top of the latest block!
This error is the opposite of *header not found*. It happens when you send a bundle target a block that was already mined (e.g: sending a bundle for the block 10 when the current block is 10 and it arrives when the block 13 is being formed)

##### Bundle is never accepted
Currently in polygon, the validators are choosen to validate 64 blocks in a row. This means that the validator 0x123 of the block `n` will be the same for the block `n + 63`.

A good approach would be to have a script that looks when a validator that integrates the bundle methods starts validating blocks, participating validators are [0x88c5e96c1459d224383dcb1fe0cedd1fcee25ffb](https://polygonscan.com/address/0x88c5e96c1459d224383dcb1fe0cedd1fcee25ffb) and [0x742d13f0b2a19c823bdd362b16305e4704b97a38](https://polygonscan.com/address/0x742d13f0b2a19c823bdd362b16305e4704b97a38) and then start sending bundles, due to the fact that the next 63 block will also be validated by it uwu
