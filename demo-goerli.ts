import { BigNumber, ethers } from "ethers";
import {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
} from "@flashbots/ethers-provider-bundle";
require("dotenv").config();

async function main() {
  if (!process.env.NON_COMPROMISED_PRIVATE_KEY) {
    console.log("Lol there is no PK");
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(
    "https://eth-goerli.g.alchemy.com/v2/_NSNyynMXiXn2o8TcjR5omRDTolWlzxE",
    "goerli"
  );

  const authSigner = new ethers.Wallet(
    "0x2000000000000000000000000000000000000000000000000000000000000000",
    provider
  );

  const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider,
    authSigner,
    "https://relay-goerli.flashbots.net",
    "goerli"
  );

  const wallet = new ethers.Wallet(process.env.NON_COMPROMISED_PRIVATE_KEY);
  const gasPrice = await provider.getGasPrice();
  const signedTransactions = await flashbotsProvider.signBundle([
    {
      signer: wallet,
      transaction: {
        to: wallet.address,
        gasPrice: gasPrice,
        gasLimit: 21000,
        chainId: 5,
        value: 0,
      },
    },
    {
      signer: wallet,
      transaction: {
        to: wallet.address,
        gasPrice: gasPrice,
        gasLimit: 21000,
        chainId: 5,
        value: 0,
      },
    },
  ]);

  const blockNumber = await provider.getBlockNumber();

  const simulation = await flashbotsProvider.simulate(
    signedTransactions,
    blockNumber + 1
  );

  // Using TypeScript discrimination
  if ("error" in simulation) {
    console.log(`Simulation Error: ${simulation.error.message}`);
  } else {
    console.log("Simulation succeded let's send bundles :)");

    provider.on("block", async (blockNumber) => {
      console.log(`Submitting bundle for block ${blockNumber + 1}`);

      const bundleSubmission = await flashbotsProvider.sendRawBundle(
        signedTransactions,
        blockNumber + 1
      );

      if ("error" in bundleSubmission) {
        console.log(
          `Something went wrong sending the bundle: ${bundleSubmission.error.message}`
        );
      } else {
        const bundleResolution = await bundleSubmission.wait();
        if (bundleResolution === FlashbotsBundleResolution.BundleIncluded) {
          console.log(`${blockNumber + 1}: Bundle included let's goooo`);
          process.exit(0);
        } else if (
          bundleResolution ===
          FlashbotsBundleResolution.BlockPassedWithoutInclusion
        ) {
          console.log(
            `${blockNumber + 1}: Block wasn't included. Let's keep going...`
          );
        } else if (
          bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh
        ) {
          console.log(`${blockNumber + 1}: Account nonce too high :(`);
          process.exit(1);
        }
      }
    });
  }
}

main().catch(console.error);
