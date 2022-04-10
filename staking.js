const CryptoJS = require("crypto-js");
const Web3 = require('web3');
const Web3EthContract = require('web3-eth-contract');
const axios = require('axios')
const breej = require('breej')

const { STAKING_ABI } = require('./contracts/STAKINGCONTRACT');

const admin = '0x95610bfe8f08551DA773F0aa44f2EE87eA51D53E';
const privateKey = process.env.privKey;

const staking_contract_address = '0xddc435fdeee94614539fe58e15a54a04546e00a7';
const staking_contract = new Web3EthContract(STAKING_ABI, staking_contract_address);

start = async function() {
  processStaking();
  setInterval(() => {
    processStaking();
  }, 35 * 60 * 1000);
}

const processStaking = async function () {
	
	const stk_acc = await axios.get('https://api.breezechain.org/account/breeze-staker')
	stk_balance = stk_acc.data.balance;
	const balance = (stk_acc.data.balance)/1e6;
	console.log(balance)

	if(stk_balance>1000000){
		const tok_data = await axios.get('https://api.coingecko.com/api/v3/coins/tmac') // change to tmac
		const tok_price = (tok_data.data.market_data.current_price.usd).toFixed(6);
		console.log(tok_price)

		total_stk_value = balance * tok_price;
		console.log(total_stk_value)

		const bnb_data = await axios.get('https://api.coingecko.com/api/v3/coins/binancecoin')
		const bnb_price = bnb_data.data.market_data.current_price.usd;
		console.log(bnb_price)

		const bnb_to_pay = (total_stk_value / bnb_price).toFixed(6)
		console.log(bnb_to_pay)

		amt = bnb_to_pay * 1e18
		console.log(amt)

		amount_to_pay =  25000000000000000 / 6;
		console.log(amount_to_pay)

		if(amount_to_pay>amt){amount=amt}else{amount=amount_to_pay}
		console.log(amount)
		amount = parseInt(amount)
		
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
						let sender = 'breeze-staker';
						let newTx = { type: 3, data: { receiver: 'null', amount: parseInt(stk_balance), memo: '' } };
						let signedTx = breej.sign(wifKey, sender, newTx);
						breej.sendTransaction(signedTx, (error, result) => { if (error === null) { console.log('breeze tokens burnt') } else { console.log(error['error']) } })
	                } else { console.log(e); }
	            }
	        })
		} catch (err) {console.log(err)}
	} else{console.log('not enough staking balance so will run in next cycle')}
}

start();