import { ethers } from "ethers";
import {
  FlashbotsBundleProvider,
  FlashbotsBundleTransaction,
  FlashbotsBundleResolution,
} from "@flashbots/ethers-provider-bundle";
require("dotenv").config();

async function main() {
  // Standard json rpc provider directly from ethers.js (NOT Flashbots)
  // create the base provider
  let base = new ethers.providers.JsonRpcProvider(
    { url: process.env.POLYGON_RPC_URL! },
    137
  );

  await base.ready;

  const user = new ethers.Wallet(
    process.env.NON_COMPROMISED_PRIVATE_KEY!,
    base
  );

  const hackedUser = new ethers.Wallet(
    process.env.COMPROMISED_PRIVATE_KEY!,
    base
  );

  let provider = new FlashbotsBundleProvider(
    base,
    user,
    { url: "http://bor.txrelay.marlin.org/" },
    137
  );

  const CONTRACT_ADDRESS = "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d"; // Lens Contract https://polygonscan.com/address/0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d#code

  const ABI = [
    {
      inputs: [
        { internalType: "address", name: "from", type: "address" },
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "tokenId", type: "uint256" },
      ],
      name: "safeTransferFrom",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, user);

  const txs: FlashbotsBundleTransaction[] = [
    {
      signer: user,
      transaction: {
        to: user.address,
        gasPrice: ethers.utils.parseUnits("180", "gwei"),
        gasLimit: 21000,
        chainId: 137,
        value: 0,
      },
    },
    {
      signer: user,
      transaction: {
        to: user.address,
        gasPrice: ethers.utils.parseUnits("180", "gwei"),
        gasLimit: 21000,
        chainId: 137,
        value: 0,
      },
    },
    /*     {
      signer: user,
      transaction: {
        ...(await contract.populateTransaction.safeTransferFrom(
          user.address,
          user.address,
          process.env.TOKEN_ID
        )),
        chainId: 137,
        gasPrice: BigNumber.from("31000000000"),
      },
    }, */
  ];

  // send bundle to marlin relay
  base.on("block", async (blk) => {
    console.log(`Submitting bundle for block ${blk + 2}`);
    const bundleSubmission = await provider.sendBundle(txs, blk + 2);

    if ("error" in bundleSubmission) {
      console.log(
        `Something went wrong sending the bundle: ${bundleSubmission.error.message}`
      );
    } else {
      const bundleResolution = await bundleSubmission.wait();
      if (bundleResolution === FlashbotsBundleResolution.BundleIncluded) {
        console.log(`${blk + 2}: Bundle included let's goooo`);
        process.exit(0);
      } else if (
        bundleResolution ===
        FlashbotsBundleResolution.BlockPassedWithoutInclusion
      ) {
        console.log(`${blk + 2}: Block wasn't included. Let's keep going...`);
      } else if (
        bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh
      ) {
        console.log(`${blk + 2}: Account nonce too high :(`);
        process.exit(1);
      }
    }
  });
}

main().catch(console.error);
