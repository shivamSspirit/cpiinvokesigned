import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PdaMintAuthority } from "../target/types/pda_mint_authority";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
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
  const wallet = provider.wallet;
  const connection = provider.connection;

  const program = anchor.workspace
    .PdaMintAuthority as Program<PdaMintAuthority>;

  // Derive the PDA that will be used to initialize the dataAccount.
  const [dataAccountPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    program.programId
  );

  const nftTitle = "Homer NFT";
  const nftSymbol = "HOMR";
  const nftUri =
    "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/nft.json";

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .new([bump])
      .accounts({ dataAccount: dataAccountPDA })
      .rpc();
    console.log("Your transaction signature", tx);
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
    const tokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      wallet.publicKey
    );

    const tx = await program.methods
      .mintTo()
      .accounts({ 
        pdaAccount: dataAccountPDA,
        payer: wallet.publicKey,
        tokenAccount: tokenAccount,
        owner: wallet.publicKey,
        mint: mintKeypair.publicKey
     })
      .rpc({ skipPreflight: true });
    console.log("Your transaction signature", tx);
  });


  //selling nft 

  // it("Sell!", async () => {
  
  //   // Testing constants

  //   const saleAmount = 1 * anchor.web3.LAMPORTS_PER_SOL;

  //   // previous minted nft mint address
  //   const mint: anchor.web3.PublicKey = new anchor.web3.PublicKey(
  //     "2KSX5KmRVfcpU7wniJDV8aRsVpcd8PKPWdVePsv71DVo"
  //   );
    
  //   const buyer: anchor.web3.Keypair = await createKeypairFromFile(__dirname + "/keypairs/chaibuyer.json");
  //   console.log(`Buyer public key: ${buyer.publicKey}`);

  //   // Derive the associated token account address for owner & buyer

  //   const ownerTokenAddress = await anchor.utils.token.associatedAddress({
  //     mint: mint,
  //     owner: wallet.publicKey
  //   });
  //   const buyerTokenAddress = await anchor.utils.token.associatedAddress({
  //     mint: mint,
  //     owner: buyer.publicKey,
  //   });
  //   console.log(`Request to sell NFT: ${mint} for ${saleAmount} lamports.`);
  //   console.log(`Owner's Token Address: ${ownerTokenAddress}`);
  //   console.log(`Buyer's Token Address: ${buyerTokenAddress}`);

  //   // Transact with the "sell" function in our on-chain program
    
  //   await program.methods.sell(
  //     new anchor.BN(saleAmount)
  //   )
  //   .accounts({
  //     mint: mint,
  //     ownerTokenAccount: ownerTokenAddress,
  //     ownerAuthority: wallet.publicKey,
  //     buyerTokenAccount: buyerTokenAddress,
  //     buyerAuthority: buyer.publicKey,
  //   })
  //   .signers([buyer])
  //   .rpc();
  // });


});