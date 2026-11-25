// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
// Test-only in-memory token; NEVER deployed/replaces real tUSD8.
contract MockToken {
 mapping(address=>uint256)public balanceOf;
 mapping(address=>mapping(address=>uint256))public allowance;
 uint256 public mode;address public reenter;bytes public reenterData;bool public blockedReentry;
 function mint(address a,uint256 amount)external{balanceOf[a]+=amount;}
 function approve(address spender,uint256 amount)external returns(bool){allowance[msg.sender][spender]=amount;return true;}
 function setMode(uint256 m,address a,bytes calldata d)external{mode=m;reenter=a;reenterData=d;}
 function transferFrom(address from,address to,uint256 amount)external returns(bool){
  if(mode==1)return false;if(mode==2)revert("token revert");
  require(balanceOf[from]>=amount&&allowance[from][msg.sender]>=amount,"funds/allowance");
  allowance[from][msg.sender]-=amount;balanceOf[from]-=amount;
  balanceOf[to]+=mode==3?amount-1:amount;
  if(mode==4){(bool ok,)=reenter.call(reenterData);blockedReentry=!ok;}
  if(mode==5)assembly{return(0,0)}
  return true;
 }
}
