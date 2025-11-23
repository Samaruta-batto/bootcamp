import react from 'react';
import {BrowserProvider, ethers} from 'ethers';
async function CrowdFund() {
    const contractAddress= '0xDf934DB5E85A82f6c89F01438a868Eb01A9b1D5E';
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    console.log(signer);
    return(
    <h1> Hello Shivam </h1>    
)
};

export default CrowdFund;