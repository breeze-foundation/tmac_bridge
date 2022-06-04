const CryptoJS = require("crypto-js");
const Web3 = require('web3');
const Web3EthContract = require('web3-eth-contract');
const axios = require('axios')
const breej = require('breej')

const { STAKING_ABI } = require('./contracts/STAKINGCONTRACT');

const admin = '0x95610bfe8f08551DA773F0aa44f2EE87eA51D53E';
const privateKey = process.env.privKey;

const staking_contract_address = '0xa917c217ce51e8d95bd0472e0dbbf2d2a4960673'; 
const staking_contract = new Web3EthContract(STAKING_ABI, staking_contract_address);

start = async function() {
  processStaking();
  setInterval(() => {
    processStaking();
  }, 8 * 60 * 60 * 1000);
}

const processStaking = async function () {

	const lp_acc = await axios.get('https://api.breezescan.io/account/breeze-lpminer')
	lp_balance = lp_acc.data.balance;
	console.log(lp_balance)
	const stk_acc = await axios.get('https://api.breezescan.io/account/breeze-staker')
	stk_balance = stk_acc.data.balance;
	console.log(stk_balance)

	const tot_balance = (lp_balance+stk_balance)/1e6;
	const defi_balance = parseInt(lp_balance+stk_balance)
	console.log(defi_balance)


	if(defi_balance>15000000){
		amount=parseInt(defi_balance)
		
		let getData = await staking_contract.methods.notifyRewardAmount(amount);
	  let data = getData.encodeABI();

		let web3 = new Web3('https://bsc-dataseed2.binance.org/');
		const nonce = await web3.eth.getTransactionCount(admin, 'pending');
		const gasPrice = await web3.eth.getGasPrice();
		const txData = {
			nonce: web3.utils.toHex(nonce),
			gasLimit: web3.utils.toHex(500000),
		 	gasPrice: web3.utils.toHex(gasPrice), // 10 Gwei
		  	from: admin,
		  	to: staking_contract_address,
		  	value: '0x0',
		  	data: data
		};

		const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
		try {
		  result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
		  console.log(result.status)
		  desttxid = result.transactionHash;
		  console.log('this is transaction id on bsc chain', result.transactionHash);
		  
			await web3.eth.getTransactionReceipt(desttxid, function (e, data) {
        if (e !== null) {
         	console.log("Could not find a transaction for your id! ID you provided was " + desttxid);
        } else {
          console.log(data.status);
          if(data.status == true) {
            console.log("Success");
            let wifsKey = process.env.wifKeyS;
						let senders = 'breeze-staker';
						let newTx = { type: 3, data: { receiver: 'null', amount: parseInt(stk_balance), memo: '' } }; 
						let signedTx = breej.sign(wifsKey, senders, newTx);
						breej.sendTransaction(signedTx, (error, result) => { if (error === null) { console.log('breeze staking account tokens burnt') } else { console.log(error['error']) } })
          
						let wiflKey = process.env.wifKeyL;
						let senderl = 'breeze-lpminer';
						let newTxl = { type: 3, data: { receiver: 'null', amount: parseInt(lp_balance), memo: '' } }; 
						let signedTxl = breej.sign(wiflKey, senderl, newTxl);
						breej.sendTransaction(signedTxl, (error, result) => { if (error === null) { console.log('breeze mining account tokens burnt') } else { console.log(error['error']) } })
          
          } else {
            console.log(e);
          }
        }
      })
		} catch (err) {
		  console.log(err)
		}
	} else{console.log('not enough lp balance so will run in next cycle')}
}

start();