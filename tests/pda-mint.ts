import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CpiInvokeSigned } from "../target/types/cpi_invoke_signed";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY,  } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

import {createKeypairFromFile} from '../utils'



import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,  
} from "@solana/spl-token";

describe("pda-mint-authority", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const mintKeypair = anchor.web3.Keypair.generate();


  console.log("mintKeypair",mintKeypair)

  // const buyerKeyPair = anchor.web3.Keypair.generate();


  const wallet = provider.wallet;

  console.log("wallet",wallet);

  const connection = provider.connection

  // Amount of additional lamports to fund the dataAccount with.
  const fundLamports = 1 * anchor.web3.LAMPORTS_PER_SOL;

  const program = anchor.workspace.CpiInvokeSigned as Program<CpiInvokeSigned>;

  // Derive the PDA that will be used to initialize the dataAccount.
  const [dataAccountPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("check_auth")],
    program.programId
  );

  console.log("dataAccountPDA", dataAccountPDA);
  console.log("bump", bump);


  let sellerTokenAccount;


  const nftTitle = "xoxo NFT";
  const nftSymbol = "xoxo mupply";
  const nftUri =
    "https://res.cloudinary.com/ddwkxn8ak/image/upload/v1699300422/solangsol/647c5577ff434978e885ef7e_2_tn3ygn.png";

  it("Is initialized!", async () => {
    // Add your test here.
     const tx = await program.methods
        .new([bump], new anchor.BN(fundLamports))
      .accounts({ dataAccount: dataAccountPDA })
      .rpc();
     console.log("Your transaction signature", tx);


    const accountInfo = await connection.getAccountInfo(dataAccountPDA);
   console.log("AccountInfo Lamports:", accountInfo.lamports);
  });

  it("Create an NFT!", async () => {
    const metaplex = Metaplex.make(connection);
    const metadataAddress = await metaplex
      .nfts()
      .pdas()
      .metadata({ mint: mintKeypair.publicKey });

    // Add your test here.
    const tx = await program.methods
      .createTokenMint(
        dataAccountPDA, // freeze authority
        0, // 0 decimals for NFT
        nftTitle, // NFT name
        nftSymbol, // NFT symbol
        nftUri // NFT URI
      )
      .accounts({
        payer: wallet.publicKey,
        mint: mintKeypair.publicKey,
        metadata: metadataAddress,
        mintAuthority: dataAccountPDA,
        rentAddress: SYSVAR_RENT_PUBKEY,
        metaplexId: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
      })
      .signers([mintKeypair])
      .rpc({ skipPreflight: true });
    console.log("Your transaction signature", tx);
  });

  it("Mint the NFT to your wallet!", async () => {
    // Derive wallet's associated token account address for mint
    sellerTokenAccount = await anchor.utils.token.associatedAddress({
      mint: mintKeypair.publicKey,
      owner: wallet.publicKey
  })

    console.log("sellerTokenAccount",sellerTokenAccount)

    const tx = await program.methods
      .mintTo()
      .accounts({
        pdaAccount: dataAccountPDA,
        payer: wallet.publicKey,
        tokenAccount: sellerTokenAccount,
        owner: wallet.publicKey,
        mint: mintKeypair.publicKey
      })
      .rpc({ skipPreflight: true });
    console.log("Your transaction signature", tx);
  });

});