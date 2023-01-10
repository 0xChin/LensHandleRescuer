import { ethers } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
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

  const CONTRACT_ADDRESS = "0x96F1BA24294fFE0DfcD832D8376dA4a4645a4Cd6"; // Lens Proxy Contract https://polygonscan.com/address/0x96f1ba24294ffe0dfcd832d8376da4a4645a4cd6#code

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

  const txs = [
    /* {
      signer: user,
      transaction: await contract.populateTransaction.coinbasetransfer({
        value: ethers.utils.parseEther("0.1"),
        gasPrice: "31000000000",
      }),
    }, */
    {
      signer: hackedUser,
      transaction: await contract.populateTransaction.safeTransferFrom(
        hackedUser.address,
        user.address,
        process.env.TOKEN_ID
      ),
    },
  ];

  const blk = await base.getBlockNumber();

  // send bundle to marlin relay
  /*   const result = await provider.sendBundle(txs, blk + 1);
  console.log(result); */
}

main().catch(console.error);
