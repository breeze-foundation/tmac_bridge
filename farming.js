const CryptoJS = require("crypto-js");
const Web3 = require('web3');
const Web3EthContract = require('web3-eth-contract');
const axios = require('axios')
const breej = require('breej')

const { FARMING_ABI } = require('./contracts/FARMINGCONTRACT')

const admin = '0x95610bfe8f08551DA773F0aa44f2EE87eA51D53E';
const privateKey = process.env.privKey;

const farming_contract_address = '0x7c60983cc1fa4671f6817755be5a8e1a89a7a10f'; 
const farming_contract = new Web3EthContract(FARMING_ABI, farming_contract_address);

start = async function() {
  processFarming();
  setInterval(() => {
    processFarming();
  }, 35 * 60 * 1000);
}

const processFarming = async function () {

	const lp_acc = await axios.get('https://api.breezechain.org/account/breeze-lpminer')
	lp_balance = lp_acc.data.balance;
	const balance = (lp_acc.data.balance)/1e6;
	console.log(balance)

	if(lp_balance>1000000){
		amount=parseInt(lp_balance)
		
		let getData = await farming_contract.methods.notifyRewardAmount(amount);
	  let data = getData.encodeABI();

		let web3 = new Web3('https://bsc-dataseed2.binance.org/');
		const nonce = await web3.eth.getTransactionCount(admin, 'pending');
		const gasPrice = await web3.eth.getGasPrice();
		const txData = {
			nonce: web3.utils.toHex(nonce),
			gasLimit: web3.utils.toHex(500000),
		 	gasPrice: web3.utils.toHex(gasPrice), // 10 Gwei
		  	from: admin,
		  	to: farming_contract_address,
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
            let wifKey = process.env.wifKey;
						let sender = 'breeze-lpminer';
						let newTx = { type: 3, data: { receiver: 'null', amount: parseInt(lp_balance), memo: '' } }; 
						let signedTx = breej.sign(wifKey, sender, newTx);
						breej.sendTransaction(signedTx, (error, result) => { if (error === null) { console.log('breeze tokens burnt') } else { console.log(error['error']) } })
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