import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import bs58 from 'bs58';
import { ERC20_ABI, ERC20_BYTECODE } from '@/lib/contracts';

export async function POST(req: Request) {
  try {
    const { name, symbol, supply, network, ownerAddress } = await req.json();

    if (!name || !symbol || !supply || !network || !ownerAddress) {
      return NextResponse.json({ error: "Missing parameters for Forge Deployment!" }, { status: 400 });
    }

    // ==========================================
    // 🟡 SOLANA LOGIKA
    // ==========================================
    if (network === 'SOL') {
      const connection = new Connection(process.env.SOL_RPC_URL || "https://api.mainnet-beta.solana.com", 'confirmed');
      const secretKeyString = process.env.SOLANA_PRIVATE_KEY;
      
      if (!secretKeyString) throw new Error("Solana Master Wallet not configured!");

      // Dekodiranje Phantom Private Key-a
      let secretKey;
      try {
        secretKey = bs58.decode(secretKeyString);
      } catch {
        secretKey = Uint8Array.from(JSON.parse(secretKeyString));
      }
      
      const payer = Keypair.fromSecretKey(secretKey);
      const ownerPubkey = new PublicKey(ownerAddress);

      // 1. Kreiraj Kovanec (Mint)
      const mint = await createMint(connection, payer, payer.publicKey, payer.publicKey, 9);

      // 2. Ustvari Token Account za končnega uporabnika
      const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, ownerPubkey);

      // 3. Skuj (Mint) žetone in jih pošlji uporabniku
      const amount = BigInt(supply) * BigInt(10 ** 9);
      await mintTo(connection, payer, mint, tokenAccount.address, payer, amount);

      return NextResponse.json({
        success: true,
        message: `Solana Token ${symbol} forged successfully!`,
        contractAddress: mint.toBase58(),
        explorerUrl: `https://solscan.io/token/${mint.toBase58()}`
      });

    // ==========================================
    // 🔵🟡 ETHEREUM & BINANCE LOGIKA (EVM)
    // ==========================================
    } else if (network === 'ETH' || network === 'BNB') {
      
      let rpcUrl = process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/";
      if (network === 'ETH') rpcUrl = process.env.ETH_RPC_URL || "https://cloudflare-eth.com";

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const evmPrivateKey = process.env.EVM_PRIVATE_KEY;
      
      if (!evmPrivateKey) throw new Error("EVM Master Wallet not configured!");
      const wallet = new ethers.Wallet(evmPrivateKey, provider);

      // Tovarna pametnih pogodb
      const factory = new ethers.ContractFactory(ERC20_ABI, ERC20_BYTECODE, wallet);
      const initialSupply = ethers.parseUnits(supply.toString(), 18);

      // Pošiljanje na Blockchain
      const contract = await factory.deploy(name, symbol, initialSupply, ownerAddress);
      await contract.waitForDeployment();
      
      const contractAddress = await contract.getAddress();

      return NextResponse.json({
        success: true,
        message: `EVM Token ${symbol} forged successfully on ${network}!`,
        contractAddress: contractAddress,
        explorerUrl: network === 'ETH' ? `https://etherscan.io/token/${contractAddress}` : `https://bscscan.com/token/${contractAddress}`
      });

    } else {
      return NextResponse.json({ error: "Unsupported Blockchain Network" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Forge Deploy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
