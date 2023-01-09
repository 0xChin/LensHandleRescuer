import { ethers } from "ethers";
import {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
} from "@flashbots/ethers-provider-bundle";

require("dotenv").config();

async function main() {
  let provider = new ethers.providers.JsonRpcProvider(
    { url: process.env.POLYGON_RPC_URL! },
    137
  );

  await provider.ready;

  const user = new ethers.Wallet(
    process.env.NON_COMPROMISED_PRIVATE_KEY!,
    provider
  );

  let flashbotsProvider = new FlashbotsBundleProvider(
    provider,
    user,
    { url: "http://bor.txrelay.marlin.org/" },
    137
  );

  let lastTargetBlockNumber: number;

  provider.on("block", async () => {
    const gasPrice = await provider.getGasPrice();

    const txs = [
      {
        signer: user,
        transaction: {
          to: user.address,
          gasPrice: gasPrice,
          gasLimit: 21000,
          chainId: 137,
        },
      },
      {
        signer: user,
        transaction: {
          to: user.address,
          gasPrice: gasPrice,
          gasLimit: 21000,
          chainId: 137,
        },
      },
    ];

    const targetBlockNumber = (await provider.getBlockNumber()) + 2;
    if (lastTargetBlockNumber === targetBlockNumber) return;

    lastTargetBlockNumber = targetBlockNumber;

    console.log(`Sending bundle for block number ${targetBlockNumber}`);

    const bundleResponse = await flashbotsProvider.sendBundle(
      txs,
      targetBlockNumber
    );

    if ("error" in bundleResponse) {
      console.log(`An error ocurred: ${bundleResponse.error.message}`);
      return;
    }

    const bundleResolution = await bundleResponse.wait();
    if (bundleResolution === FlashbotsBundleResolution.BundleIncluded) {
      console.log(`Congrats, included in ${targetBlockNumber}`);
      process.exit(0);
    } else if (
      bundleResolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion
    ) {
      console.log(`Not included in ${targetBlockNumber}`);
    } else if (
      bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh
    ) {
      console.log(
        "Nonce too high, bailing, but transaction may still be included, check etherscan later"
      );
      process.exit(1);
    }
  });
}

main().catch(console.error);
