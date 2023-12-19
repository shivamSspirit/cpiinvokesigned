import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CpiInvokeSigned } from "../target/types/cpi_invoke_signed";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

import { createKeypairFromFile } from '../utils'


import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    getAccount
} from "@solana/spl-token";
import { min } from "bn.js";

describe("pda-mint-authority", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const wallet = provider.wallet;

    console.log("wallet", wallet);

    const connection = provider.connection
    // Amount of additional lamports to fund the dataAccount with.
    const fundLamports = 1 * anchor.web3.LAMPORTS_PER_SOL;

    const program = anchor.workspace
        .CpiInvokeSigned as Program<CpiInvokeSigned>;

    // Derive the PDA that will be used to initialize the dataAccount.
    // const [dataAccountPDA, bump] = PublicKey.findProgramAddressSync(
    //     [Buffer.from("mint_authority")],
    //     program.programId
    // );

    // console.log("dataAccountPDA", dataAccountPDA);
    // console.log("bump", bump);



    it("sell the nft to new user token account", async () => {

        const sellAmount = new anchor.BN(20000000);
        const tokenAmount = new anchor.BN(1);

        // mint key of nft to be sell

        const mint: anchor.web3.PublicKey = new anchor.web3.PublicKey(
            "HPrf3dPxiYyv4qEwny4MJWPC2QAZbtMVgVUpjKVwqQys"
        );

        const buyer: anchor.web3.Keypair = await createKeypairFromFile(__dirname + "/keypairs/main_buyer.json");
        console.log(`Buyer public key: ${buyer.publicKey}`);

       const sellerTokenAccount = await anchor.utils.token.associatedAddress({
            mint: mint,
            owner: wallet.publicKey
        })

        console.log("seller token  account", sellerTokenAccount);

        // Derive wallet's associated token account address for mint
      const buyerTokenAccount = await anchor.utils.token.associatedAddress({
            mint: mint,
            owner: buyer.publicKey
        })

        console.log("buyerTokenAccount", buyerTokenAccount)

// const ooj  = anchor.utils.token.associatedAddress({mint: mint, owner: wallet.publicKey})

      //  let tokenAccount = await getAccount(connection, buyerTokenAccount);
    //  7vxEK31pZeWbUEzvgvU3LaQg415pJpWyKr1dQyHVYf7h
    //  HLZHH2DBQD1EjjW6Cev4bJPfHhy9PLerfqPLCfuVhUQH)
//console.log("bbbbbtokenAccount", tokenAccount)

let response = await connection.getParsedTokenAccountsByOwner(buyer.publicKey, {
    mint: mint,
  });
  
  console.log('respo',response)



        console.log("mint key of nft to be sell", mint)

        const tx = await program.methods
            .sell(sellAmount, tokenAmount)
            .accounts({
                payer: wallet.publicKey,
                buyer: buyer.publicKey,
                sellerTokenAccount: sellerTokenAccount,
                buyerTokenAccount: buyerTokenAccount,
                mint: mint,
                owner: wallet.publicKey,
            }).signers([buyer])
            .rpc({ skipPreflight: true });
        console.log("Your transaction signature", tx);



    })
});