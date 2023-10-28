// import "../libraries/spl_token.sol";
// import {SplToken} from "../libraries/spl_token.sol";
import "../libraries/spl_token.sol";
import "solana";

@program_id("J2eUKE878XKXJZaP7vXwxgWnWnNQMqHSkMPoRFQwa86b")
contract pda_mint_authority {
    bytes1 bump; // stores the bump for the + address

    @payer(payer)
    @seed("mint_authority") // hard-coded seed
    constructor(
        @bump bytes1 _bump  // bump for the pda address
    ) {
        // Independently derive the PDA address from the seeds, bump, and programId
        (address pda, bytes1 pdaBump) = try_find_program_address(["mint_authority"], type(pda_mint_authority).program_id);

        // Verify that the bump passed to the constructor matches the bump derived from the seeds and programId
        // This ensures that only the canonical pda address can be used to create the account (first bump that generates a valid pda address)
        require(pdaBump == _bump, 'INVALID_BUMP');

        bump = _bump;
    }


    @mutableSigner(payer) // payer account
    @mutableSigner(mint) // mint account to be created
    @mutableAccount(metadata) // metadata account to be created
    @account(mintAuthority) // mint authority for the mint account
    @account(rentAddress)
    @account(metaplexId)
    function createTokenMint(
        address freezeAuthority, // freeze authority for the mint account
        uint8 decimals, // decimals for the mint account
        string name, // name for the metadata account
        string symbol, // symbol for the metadata account
        string uri // uri for the metadata account
    ) external {
        // Invoke System Program to create a new account for the mint account and,
        // Invoke Token Program to initialize the mint account
        // Set mint authority, freeze authority, and decimals for the mint account
        SplToken.create_mint(
            tx.accounts.payer.key,           // payer account
            tx.accounts.mint.key,            // mint account
            tx.accounts.mintAuthority.key,   // mint authority
            freezeAuthority,                 // freeze authority
            decimals                         // decimals
        );

        // Invoke Metadata Program to create a new account for the metadata account
        _createMetadataAccount(
            tx.accounts.metadata.key,       // metadata account
            tx.accounts.mint.key,           // mint account
            tx.accounts.mintAuthority.key,  // mint authority
            tx.accounts.payer.key,          // payer
            tx.accounts.payer.key,          // update authority (of the metadata account)
            name, // name
            symbol, // symbol
            uri, // uri (off-chain metadata json)
            tx.accounts.rentAddress.key,
            tx.accounts.metaplexId.key
        );
    }

    // Create metadata account, must reimplement manually to sign with PDA, which is the mint authority
    function _createMetadataAccount(
        address metadata, // metadata account address
		address mint, // mint account address
		address mintAuthority, // mint authority
		address payer, // payer
		address updateAuthority, // update authority for the metadata account
		string name, // token name
		string symbol, // token symbol
		string uri, // token uri
        address rentAddress,
        address metaplexId
    ) private {
        // // Independently derive the PDA address from the seeds, bump, and programId
        (address pda, bytes1 _bump) = try_find_program_address(["mint_authority"], type(pda_mint_authority).program_id);

        require(mintAuthority == pda, 'INVALID_PDA');

        DataV2 data = DataV2({
            name: name,
            symbol: symbol,
            uri: uri,
            sellerFeeBasisPoints: 0,
            creatorsPresent: false,
            collectionPresent: false,
            usesPresent: false
        });

        CreateMetadataAccountArgsV3 args = CreateMetadataAccountArgsV3({
            data: data,
            isMutable: true,
            collectionDetailsPresent: false
        });

        AccountMeta[7] metas = [
            AccountMeta({pubkey: metadata, is_writable: true, is_signer: false}),
            AccountMeta({pubkey: mint, is_writable: false, is_signer: false}),
            AccountMeta({pubkey: mintAuthority, is_writable: false, is_signer: true}),
            AccountMeta({pubkey: payer, is_writable: true, is_signer: true}),
            AccountMeta({pubkey: updateAuthority, is_writable: false, is_signer: false}),
            AccountMeta({pubkey: address"11111111111111111111111111111111", is_writable: false, is_signer: false}),
            AccountMeta({pubkey: rentAddress, is_writable: false, is_signer: false})
        ];

        bytes1 discriminator = 33;
        bytes instructionData = abi.encode(discriminator, args);

        metaplexId.call{accounts: metas, seeds: [["mint_authority", abi.encode(_bump)]]}(instructionData);
    }

    struct CreateMetadataAccountArgsV3 {
        DataV2 data;
        bool isMutable;
        bool collectionDetailsPresent; // To handle Rust Option<> in Solidity
    }

    struct DataV2 {
        string name;
        string symbol;
        string uri;
        uint16 sellerFeeBasisPoints;
        bool creatorsPresent; // To handle Rust Option<> in Solidity
        bool collectionPresent; // To handle Rust Option<> in Solidity
        bool usesPresent; // To handle Rust Option<> in Solidity
    }

    @mutableSigner(payer)
    @mutableAccount(tokenAccount)
    @account(owner)
    @mutableAccount(mint)
    @mutableAccount(pdaAccount)
    function mintTo() external {
        // Create an associated token account for the owner to receive the minted token
        SplToken.create_associated_token_account(
            tx.accounts.payer.key, // payer account
            tx.accounts.tokenAccount.key, // associated token account address
            tx.accounts.mint.key, // mint account
            tx.accounts.owner.key // owner account
        );

        // Mint 1 token to the associated token account
        _mintTo(
            tx.accounts.mint.key, // mint account
            tx.accounts.tokenAccount.key, // token account
            1, // amount
            tx.accounts.pdaAccount.key
        );

        // // Remove mint authority from mint account
        _removeMintAuthority(
            tx.accounts.mint.key, // mint
            tx.accounts.pdaAccount.key
        );
    }

    // Invoke the token program to mint tokens to a token account, using a PDA as the mint authority
    function _mintTo(address mint, address account, uint64 amount, address pdaAccount) private {
        // Independently derive the PDA address from the seeds, bump, and programId
        (address pda, bytes1 _bump) = try_find_program_address(["mint_authority"], type(pda_mint_authority).program_id);
        require(pdaAccount == pda, 'INVALID_PDA');

        // Prepare instruction data
        bytes instructionData = new bytes(9);
        instructionData[0] = uint8(7); // MintTo instruction index
        instructionData.writeUint64LE(amount, 1); // Amount to mint

        // Prepare accounts required by instruction
        AccountMeta[3] metas = [
            AccountMeta({pubkey: mint, is_writable: true, is_signer: false}),
            AccountMeta({pubkey: account, is_writable: true, is_signer: false}),
            AccountMeta({pubkey: pda, is_writable: true, is_signer: true}) // mint authority
        ];

        // Invoke the token program with prepared accounts and instruction data
        SplToken.tokenProgramId.call{accounts: metas, seeds: [["mint_authority", abi.encode(_bump)]]}(instructionData);
    }

    function _removeMintAuthority(address mintAccount, address pdaAccount) private {
        // Independently derive the PDA address from the seeds, bump, and programId
        (address pda, bytes1 _bump) = try_find_program_address(["mint_authority"], type(pda_mint_authority).program_id);
        require(pdaAccount == pda, 'INVALID_PDA');

		AccountMeta[2] metas = [
			AccountMeta({pubkey: mintAccount, is_signer: false, is_writable: true}),
			AccountMeta({pubkey: pda, is_signer: true, is_writable: false}) // mint authority
		];

		bytes instructionData = new bytes(9);
		instructionData[0] = uint8(6); // SetAuthority instruction index
		instructionData[1] = uint8(0); // AuthorityType::MintTokens
		instructionData[3] = 0;

        // Invoke the token program with prepared accounts and instruction data
        SplToken.tokenProgramId.call{accounts: metas, seeds: [["mint_authority", abi.encode(_bump)]]}(instructionData);
	}

   // get some money for your nft from buyer in sol(lamports) tokens

     // Transfer tokens from one token account to another via Cross Program Invocation to Token Program
    function transferTokens(
        address from, // token account to transfer from
        address to, // token account to transfer to
        uint64 amount // amount to transfer
    ) public {
        SplToken.TokenAccountData from_data = SplToken.get_token_account_data(from);
        SplToken.transfer(from, to, from_data.owner, amount);
    }

// creating a buyer token account 



//  sell nft to buyer
    function transferToken(address payer, address src, address dest, address mint, uint64 amount) public {
        // Create an associated token account for the destination to receive the transferred token
        SplToken.create_associated_token_account(
            payer,
            dest,
            mint,
            dest
        );
        // Transfer tokens to the buyer token account
        _transfer(
            src,
            dest,
            amount
        );
    }

    function _transfer(address src, address dest, uint64 amount) private {
        (address pda, bytes1 _bump) = try_find_program_address(["mint_authority"], type(pda_mint_transfer_authority).program_id);
        require(address(this) == pda, 'INVALID_PDA');

        bytes instructionData = new bytes(9);
        instructionData[0] = uint8(3); // Transfer instruction index
        instructionData.writeUint64LE(amount, 1); // Amount to transfer

        AccountMeta[3] metas = [
            AccountMeta({pubkey: src, is_writable: true, is_signer: false}),
            AccountMeta({pubkey: dest, is_writable: true, is_signer: false}),
            AccountMeta({pubkey: pda, is_writable: false, is_signer: true}) // transfer authority
        ];

        SplToken.tokenProgramId.call{accounts: metas, seeds: [["mint_authority", abi.encode(_bump)]]}(instructionData);
    }
}