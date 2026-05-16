// ==========================================
// GAINWAVE - SMART CONTRACT DNA (ERC-20)
// ==========================================

// ABI definira, kako se kovanec obnaša in komunicira z denarnicami (MetaMask, Uniswap)
export const ERC20_ABI = [
  "constructor(string name_, string symbol_, uint256 initialSupply, address owner)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// To je Hex Bytecode (Prevedena Solidity koda pametne pogodbe v strojni jezik).
// Opomba: Za testni build uporabljamo standardni placeholder. 
// Pred pravim mainnet lansiranjem se sem vstavi polni preverjeni (audited) bytecode!
export const ERC20_BYTECODE = "0x608060405234801561001057600080fd5b5060405161022f38038061022f83398101604081905261002f91610074565b600080546001600160a01b031916331790556100a9565b60006020828403121561008657600080fd5b5051610093816100f8565b905080546001600160a01b0319166001600160a01b03831617905550565b610173806100b86000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80638da5cb5b14602d575b600080fd5b600054604051906001600160a01b0316815260200160405180910390f3fea264697066735822122096a66d03d3f9b5a83a008cf57cd10f6db0ab4bd3d1edb686e08b1a3fb3fc0d0364736f6c63430008120033";
