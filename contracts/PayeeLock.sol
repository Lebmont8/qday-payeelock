// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
interface IToken {function balanceOf(address)external view returns(uint256);}
contract PayeeLock {
 address public constant TOKEN=0x456569838f1d43009A91ebA4263147Afd7233483;
 uint256 public constant CHAIN=44005;
 uint96 public constant MAX_AMOUNT=1000000*1000000;
 enum State {Open,Paid,Cancelled}
 struct Invoice {address payee;address payer;uint96 amount;uint64 expiry;bytes32 terms;State state;}
 mapping(bytes32=>Invoice) public invoices;
 bool private locked;
 error Invalid();error Unauthorized();error TransferFailed();
 event Created(bytes32 indexed invoice,address indexed payee,address indexed payer,uint96 amount,uint64 expiry,bytes32 terms);
 event Paid(bytes32 indexed invoice,address indexed payer,address indexed payee,uint96 amount,bytes32 terms);
 event Cancelled(bytes32 indexed invoice);
 constructor(){require(block.chainid==CHAIN,"Aevum testnet only");require(TOKEN.code.length>0,"missing tUSD8");}
 modifier guard(){if(locked)revert Invalid();locked=true;_;locked=false;}
 function invoiceId(address merchant,bytes32 referenceId)public pure returns(bytes32){return keccak256(abi.encode(merchant,referenceId));}
 function create(bytes32 referenceId,address payer,uint96 amount,uint64 expiry,bytes32 terms)external returns(bytes32 id){
  if(referenceId==0||terms==0||amount==0||amount>MAX_AMOUNT||expiry<=block.timestamp||expiry>block.timestamp+30 days)revert Invalid();
  id=invoiceId(msg.sender,referenceId);if(invoices[id].payee!=address(0))revert Invalid();
  invoices[id]=Invoice(msg.sender,payer,amount,expiry,terms,State.Open);emit Created(id,msg.sender,payer,amount,expiry,terms);
 }
 function cancel(bytes32 id)external {Invoice storage n=invoices[id];if(n.payee!=msg.sender)revert Unauthorized();if(n.state!=State.Open)revert Invalid();n.state=State.Cancelled;emit Cancelled(id);}
 function pay(bytes32 id,uint96 maxAmount,address expectedPayee,bytes32 expectedTerms)external guard {
  Invoice storage n=invoices[id];
  if(n.payee==address(0)||n.state!=State.Open||block.timestamp>=n.expiry||n.amount>maxAmount||n.payee!=expectedPayee||n.terms!=expectedTerms)revert Invalid();
  if(n.payer!=address(0)&&n.payer!=msg.sender)revert Unauthorized();
  if(msg.sender==n.payee)revert Invalid();
  uint256 beforeBalance=IToken(TOKEN).balanceOf(n.payee);n.state=State.Paid;
  (bool ok,bytes memory answer)=TOKEN.call(abi.encodeWithSignature("transferFrom(address,address,uint256)",msg.sender,n.payee,n.amount));
  if(!ok||(answer.length!=0&&(answer.length!=32||!abi.decode(answer,(bool)))))revert TransferFailed();
  uint256 afterBalance=IToken(TOKEN).balanceOf(n.payee);
  if(afterBalance<beforeBalance||afterBalance-beforeBalance!=n.amount)revert TransferFailed();
  emit Paid(id,msg.sender,n.payee,n.amount,n.terms);
 }
}
