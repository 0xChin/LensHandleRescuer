import { ethers } from "ethers";
import {
  FlashbotsBundleProvider,
  FlashbotsBundleTransaction,
  FlashbotsBundleResolution,
} from "@flashbots/ethers-provider-bundle";

require("dotenv").config();

async function main() {
  console.log(process.env);

  let base = new ethers.providers.JsonRpcProvider(
    { url: process.env.POLYGON_RPC_URL! },
    137
  );

  await base.ready;

  const sponsorWallet = new ethers.Wallet(
    process.env.NON_COMPROMISED_PRIVATE_KEY!,
    base
  );

  const hackedWallet = new ethers.Wallet(
    process.env.COMPROMISED_PRIVATE_KEY!,
    base
  );

  let provider = new FlashbotsBundleProvider(
    base,
    sponsorWallet,
    { url: "http://bor.txrelay.marlin.org/" },
    137
  );

  const CONTRACT_ADDRESS = "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d"; // Lens Contract https://polygonscan.com/address/0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d#code

  const ABI = [
    "function safeTransferFrom(address from, address to, uint256 tokenId)",
  ];

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, hackedWallet);
  const gasPrice = ethers.utils.parseUnits("1100", "gwei"); // Hardcoded from https://polygas.org/

  const txs: FlashbotsBundleTransaction[] = [
    {
      signer: sponsorWallet,
      transaction: {
        to: hackedWallet.address,
        gasPrice,
        gasLimit: 21000,
        chainId: 137,
        value: ethers.utils.parseEther("0.5"), // 0.5 MATIC
      },
    },
    {
      signer: hackedWallet,
      transaction: {
        ...(await contract.populateTransaction.safeTransferFrom(
          hackedWallet.address,
          sponsorWallet.address,
          process.env.TOKEN_ID
        )),
        chainId: 137,
        gasPrice,
      },
    },
  ];

  // send bundle to marlin relay
  base.on("block", async (blk) => {
    blk = blk + 3;

    console.log(`Submitting bundle for block ${blk}`);
    const bundleSubmission = await provider.sendBundle(txs, blk);

    if ("error" in bundleSubmission) {
      console.log(
        `Something went wrong sending the bundle: ${bundleSubmission.error.message}`
      );
    } else {
      const bundleResolution = await bundleSubmission.wait();
      if (bundleResolution === FlashbotsBundleResolution.BundleIncluded) {
        console.log(`${blk}: Bundle included let's goooo`);
        process.exit(0);
      } else if (
        bundleResolution ===
        FlashbotsBundleResolution.BlockPassedWithoutInclusion
      ) {
        console.log(`${blk}: Block wasn't included. Let's keep going...`);
      } else if (
        bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh
      ) {
        console.log(`${blk}: Account nonce too high :(`);
        process.exit(1);
      }
    }
  });
}

main().catch(console.error);
