const CONTRACT_NAME = 'contractaaap';
const provider = 'ihavefoooooo';
var feeRate = 0;

var repay_deadline = 0;
var mortgagor = '';
var price = 0;
var stake = 0;
var stakeRate = 0;
var rate = 0;
var ExpectLoanValue = 0;
var cycle = 0;
var fee = 0;
var invest = 0;
var invest_deadline = 0;
var StakeSymbol= '';
var LoanSymbol= '';
var loantype= '';
var RepayMemo = '';

var stake_text = ''; 
var ExpectRepay = 0; //预计还款额

function sendToken (from, to, quantity, memo) {
  trans.send_inline("eosio.token", "transfer", {
    from: from,
    to: to,
    quantity: quantity,
    memo: memo
  }, [{
    "actor": from,
    "permission": "active"
  }]);
}

function stakeFalse (price, loantype, LoanSymbol, stake, stakeRate, rate, ExpectLoanValue, cycle, StakeSymbol) {
    if (price < 0 || price > 1000) {
        return 1;
	}
    if (cycle < -1 || cycle > 180) {
        return 1;
	}
    if (StakeSymbol == 'FO') {
        if (stake <10000 || stake > 10000000) {
            return 1;
	    }
	}
    if (StakeSymbol == 'FOETH') {
        if (stake <1 || stake > 100000) {
            return 1;
	    }
	}
    if (stakeRate <0.1 || stakeRate > 0.8) {
        return 1;
	}
    if (rate <= 0 || rate > 0.3) {
        return 1;
	}
    if (ExpectLoanValue >= stake*price*stakeRate*1.1) {
        return 1;
	}
    return 0;
}



function defi (from, to, quantity, memo) {
    var cur_time = action.publication_time;
    if (from === CONTRACT_NAME || to !== CONTRACT_NAME) {
        return;
    }
    var bAsset = quantity.split(' ');
    bAsset[0] = Number(bAsset[0]);
    var q = bAsset[0];
    var symbol = bAsset[1];

    var summary = db.summary(CONTRACT_NAME, CONTRACT_NAME);
    var mc = summary.find(1);
    var lenders = db.lenders(CONTRACT_NAME, CONTRACT_NAME);

    // Check Contract alive, if mc.data is defined then it's alive
    if (typeof(mc.data) == "undefined") {
	    /* Stake stage */

		// check memo length
        var MM = memo.split(';');
	    if (MM.length < 10) {
            sendToken(CONTRACT_NAME, from, quantity, '申请失败，参数错误，返回抵押');
	        return;
	    }

	    price = MM[0];
		loantype = String(MM[2]);
	    LoanSymbol= String(MM[3]);
	    stakeRate = Number(MM[4]);
	    stake = Number(MM[5]);
	    rate = Number(MM[6])/100;
	    ExpectLoanValue = Number(MM[7]);
	    cycle = Number(MM[8]);
		if (cycle < 0) {
			cycle = 180;
		}

	    StakeSymbol= symbol;
        invest_deadline = cur_time + 3600*24*1000000; 
		if (StakeSymbol == 'FOETH') {
            stake_text = stake.toFixed(8) + ' ' + StakeSymbol; 
		} else {
            stake_text = stake.toFixed(4) + ' ' + StakeSymbol; 
		}
        ExpectRepay = (ExpectLoanValue * (1 + rate*cycle/360) + 0.01).toFixed(6);

	    // stake asset symbol check
	    var arr=['FOETH','FO'];
	    var a=arr.indexOf(symbol);
	    if (a == -1) {
            return;
	    }
	    // stake asset quantity check
        if (symbol === "FO" & q < 10000) {
            sendToken(CONTRACT_NAME, from, quantity, '抵押资产应大于等于10000FO');
            return;
	    }
        if (symbol === "FOETH" & q < 1) {
            sendToken(CONTRACT_NAME, from, quantity, '抵押资产应大于等于1FOETH');
            return;
	    }
        if (q !== stake) {
            sendToken(CONTRACT_NAME, from, quantity, '抵押资产数量与合约不符！'+q+' not '+stake);
            return;
	    }

		// check memo value
		if (stakeFalse(price, loantype, LoanSymbol, stake, stakeRate, rate, ExpectLoanValue, cycle, StakeSymbol)) {
            sendToken(CONTRACT_NAME, from, quantity, '申请失败，参数检查失败，返回抵押');
	        return;
		}

		if (bAsset[0] === stake) {
		    mortgagor = from;
            const record = {
                id: 1,
				loantype: loantype,
                mortgagor: mortgagor,
                stake: String(stake),
				stakesymbol: StakeSymbol,
                price: price,
                stakeRate: String(stakeRate),
                loan: String(ExpectLoanValue),
				loansymbol: LoanSymbol,
                rate: String(rate),
                repay: ExpectRepay,
                cycle: cycle,
                invest: '0',
                got: '0',
                fee: '0',
                status: 'staked',
                deadline1: String(invest_deadline),
                deadline2: String(invest_deadline + 3600*24*cycle*1000000),
                completed: 0
            }
            summary.emplace(CONTRACT_NAME, record);
        } else {
            sendToken(CONTRACT_NAME, mortgagor, quantity, 'INFO: 金额与合约要求不符');
            return;
		}
		return;
    } else {
	    /* mc.data is defined */

	    // Check if contract is end
        if (mc.data.completed === 1) {
            return;
        }

		// Check if contract is used
		if (symbol === "FO" || symbol === "FOETH" ) {
            sendToken(CONTRACT_NAME, mortgagor, quantity, '该合约已被使用，请重新申请借款，系统将为您分配新的合约');
            return;
        }

		// Get params from table
        mortgagor = mc.data.mortgagor;
	    price = Number(mc.data.price);
	    stake = Number(mc.data.stake);
		StakeSymbol = mc.data.stakesymbol;
		LoanSymbol= mc.data.loansymbol;
		loantype = mc.data.loantype;
		invest = Number(mc.data.invest);
	    stakeRate = Number(mc.data.stakeRate);
	    rate = Number(mc.data.rate);
	    ExpectLoanValue = Number(mc.data.loan);
	    cycle = Number(mc.data.cycle);
        invest_deadline = Number(mc.data.deadline1);
        repay_deadline = Number(mc.data.deadline2);
		if (StakeSymbol === 'FOETH') {
            stake_text = stake.toFixed(8) + ' ' + StakeSymbol; 
		} else {
            stake_text = stake.toFixed(4) + ' ' + StakeSymbol; 
		}
		if (loantype == 'b' && mc.data.status === 'ongoing') {
			var index = Number(lenders.get_primary_key()) - 1;
		    var release_time = Number(lenders.find(index).data.timestamp); 
		    var duration = Math.ceil((cur_time - release_time)/10000000/3600/24);
		    ExpectRepay = (invest * (1 + rate*duration/360) + 0.01).toFixed(6);
			feeRate = 0;
		} else {
            ExpectRepay = Number(mc.data.repay);
		}

        if (from !== mortgagor) {
	        /* Invest stage */
			/* Or contract broken */
	       
            // Deny the invest if over deadline
            // And payback motegagor and investor
            if (cur_time > invest_deadline && cur_time <= repay_deadline) {
                if (mc.data.status === 'staked') {
                    sendToken(CONTRACT_NAME, mortgagor, stake_text, '认购失败，退回抵押');
                    for (var i = 0; i < lenders.get_primary_key(); i++) {
                        var lender = lenders.find(i);
                        var payback = lender.data.invested;
                        var account = lender.data.lender;
                        lender.data.completed = 1;
                        lender.update(CONTRACT_NAME);
                        sendToken(CONTRACT_NAME, account, payback, '认购失败，退回本金');
                    }
                    mc.data.completed = 1;
                    mc.data.status = 'fail';
                    mc.update(CONTRACT_NAME);
                    sendToken(CONTRACT_NAME, from, quantity, '认购超时，退回认购款');
                    return;
                }
            }

            // Ask sharing stake when break contract
            if (cur_time > repay_deadline && mc.data.completed == 0) {
                var total = invest;
                for (var i = 0; i < lenders.get_primary_key(); i++) {
                    var lender = lenders.find(i);
                    var buy = Number((lender.data.invested).split(' ')[0]);
                    var proportion = buy/total;
		            if (StakeSymbol == 'FOETH') {
                        var payback = (Math.floor((stake * proportion)*10000)/10000).toFixed(8) + ' ' + StakeSymbol;
		            } else {
                        var payback = (Math.floor((stake * proportion)*10000)/10000).toFixed(4) + ' ' + StakeSymbol;
		            }
                    var account = lender.data.lender;
                    lender.data.completed = '1';
                    lender.update(CONTRACT_NAME);
                    sendToken(CONTRACT_NAME, account, payback, '理财到期，贷款违约，按比例均分抵押资产');
                }
                sendToken(CONTRACT_NAME, from, quantity, '违约发生，退回触发款');
                mc.data.completed = '1';
                mc.data.status = 'break';
                mc.update(CONTRACT_NAME);
                return;
            }

            // check if invest >= ExpectLoanValue
            if (invest >= ExpectLoanValue) {
                sendToken(CONTRACT_NAME, from, quantity, '超过认购额，退回认购款'+ExpectLoanValue);
                return;
            }

            if (symbol === LoanSymbol && q >= 1) {
                var id = lenders.get_primary_key();
                var payback = q * (1 + rate*cycle/360)
                var new_invest = Number(invest + q);
                var new_invest_str = String(new_invest.toFixed(6)) + ' '+LoanSymbol;

                // 理财认购不得超过期望认购的20%
                if (new_invest > ExpectLoanValue*1.2) {
                    sendToken(CONTRACT_NAME, from, quantity, '超过认购额，退回认购款');
                    return
                }

                // 符合认购条件记入table
                const record = {
                  id: id,
                  lender: from,
                  invested: quantity,
                  payback: String(payback.toFixed(6)) + ' '+LoanSymbol,
                  timestamp: String(cur_time),
                  completed: 0
                }
                lenders.emplace(CONTRACT_NAME, record);


                mc.data.invest = String(new_invest);
                mc.data.repay = (new_invest * (1 + rate*cycle/360)).toFixed(6)

                // Release loan if invest enough, and update status
                if (new_invest >= ExpectLoanValue) {
		            if (loantype == 'b' && mc.data.status === 'ongoing') {
		            	feeRate = 0;
                        fee = feeRate * new_invest;
		            } else {
                        fee = feeRate * new_invest * cycle;
		            }
                    mc.data.got = String((new_invest - fee).toFixed(6));
                    repay_deadline = cur_time + 3600*24*cycle*1000000;
                    mc.data.deadline2= String(repay_deadline);
                    mc.data.status = 'ongoing';
	    			const date = new Date(repay_deadline/1000);
	    			const Y = date.getFullYear() + '-';
                    const M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
                    const D = date.getDate() + ' ';
                    const h = date.getHours() + ':';
                    const m = date.getMinutes() + ':';
                    const s = date.getSeconds();
	    			const dt = Y+M+D+h+m+s;
					if (loantype == 'b') {
	    			    RepayMemo = '贷款释放，还款截止时间：' + dt + '，还款方式：随借随还'; 
					} else {
	    			    RepayMemo = '贷款释放，还款截止时间：' + dt + '，还款金额：' + mc.data.repay + ' '+LoanSymbol; 
					}
                    sendToken(CONTRACT_NAME, mortgagor, mc.data.got + ' '+LoanSymbol, RepayMemo);
                    if (feeRate > 0) {
                        mc.data.fee = String(fee.toFixed(6));
                        sendToken(CONTRACT_NAME, provider, mc.data.fee + ' '+LoanSymbol, '手续费');
                    }
                }
                mc.update(CONTRACT_NAME);
	    	}
        } else {
	    	/* Mortgagor repay stage */

	    	if (symbol === LoanSymbol) {
			    // 超额还款退差额
                if (q > ExpectRepay) {
				    var overbalance = String((q - ExpectRepay).toFixed(6));
                    sendToken(CONTRACT_NAME, mortgagor, overbalance + ' ' + LoanSymbol, 'INFO: 退回超付额'+overbalance+' '+LoanSymbol);
                }
				// 还款不足退款
                if (q < ExpectRepay) {
                    sendToken(CONTRACT_NAME, mortgagor, quantity, 'INFO: 低于还款额'+ExpectRepay);
                    return;
                }
				// Write table
                var repay = db.repay(CONTRACT_NAME, CONTRACT_NAME);
                const record = {
                  id: 1,
                  quantity: quantity,
                  timestamp: String(cur_time),
                  completed: 1
                }
                repay.emplace(CONTRACT_NAME, record);

                // Return Principal and interest
                for (var i = 0; i < lenders.get_primary_key(); i++) {
                    var lender = lenders.find(i);
                    var account = lender.data.lender;
					if (loantype == 'b') {
                        var one_invested = lender.data.invested;
                        var one_invested = one_invested.split(' ');
                        var one_invested_q = Number(one_invested[0]);
                        var one_invested_symbol = one_invested[1];
                        var payback = String((one_invested_q * (1 + rate*duration/360)).toFixed(6)) + ' ' + one_invested_symbol;
					} else {
                        var payback = lender.data.payback;
					}
                    lender.data.completed = 1;
                    lender.update(CONTRACT_NAME);
                    sendToken(CONTRACT_NAME, account, payback, '合约完成，返回本息');
                }

                // 5. Return stake
                sendToken(CONTRACT_NAME, mortgagor, stake_text, '合约完成，返回抵押');
                mc.data.completed = 1;
                mc.data.status = 'end';
                mc.update(CONTRACT_NAME);
	    	}
        }
	}
}

exports.on_transfer = (from, to, quantity, memo) => {
    defi(from, to, quantity, memo);
};

exports.on_extransfer = (from, to, quantity, memo) => {
    var contract = quantity['contract'];
    if (contract != 'eosio') {
        return;
    }
    quantity = quantity['quantity'];
    defi(from, to, quantity, memo);
};
