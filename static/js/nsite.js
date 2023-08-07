$(document).ready(function () {
    if (typeof window.ethereum === 'undefined') {
      window.web3 = new Web3();
    }
  
    /* state */
    var updateInterval;
    var coinbase;
    var jackpot;
    var countdown;
  
    /* constants */
    var TWELVE_HOURS = 43200;
    var DEFAULT_GAS = 3000000;
  
    // Function to connect to the blockchain using Infura
    function connectToInfura() {
      var infuraUrl = "https://goerli.infura.io/v3/4c665d4153cd460098da8b8b5695739f"; // Replace with your Infura project ID
      var web3Instance = new Web3(new Web3.providers.HttpProvider(infuraUrl));
  
      $.getJSON("static/js/abi.json", function (abi) {
        var contractAddress = "0x8a50914AF0415588DF1652943F955b3E4C89ac4A"; // Replace with your contract address
        window.ponziContract = new web3Instance.eth.Contract(abi, contractAddress);
  
        clearInterval(updateInterval);
        updateInterval = setInterval(update, 10000); // every 10s
        update();
      });
    }
  
    // Get the "Connect Wallet" button element
    var connectWalletBtn = document.getElementById("connect-wallet-btn");
  
    // Attach the click event listener to the button
    connectWalletBtn.addEventListener("click", function () {
      if (typeof window.ethereum !== 'undefined') {
        window.web3 = new Web3(window.ethereum);
        window.ethereum.request({ method: 'eth_requestAccounts' }).then(function (accounts) {
          openModal('Wallet Connected', 'Your Ethereum wallet is now connected.<br><br>Address: ' + accounts[0]);
          connectToInfura();
        }).catch(function (error) {
          openModal('Error', 'An error occurred while connecting to your Ethereum wallet.<br><br>Error:<p>' + error + '</p>');
          console.error(error);
        });
      } else {
        openModal('Error', 'No Ethereum wallet found. Please install MetaMask or another Ethereum wallet extension in your browser.');
      }
    });
  
    function openModal(title, body) {
      $('.modal-title').text(title);
      $('.modal-body').html(body);
      $('#modal').modal();
    }
  
    function handleError(error) {
      clearInterval(updateInterval);
      openModal('Error', 'An error occurred, please reload.<br><br>Error:<p>' + error + '</p>');
      console.error(error);
    }
  
    function getUrlParameter(sParam) {
      var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;
  
      for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
          return sParameterName[1] === undefined ? true : sParameterName[1].replace(/\/$/, "");
        }
      }
    }
  
    function update() {
      // update coinbase and balance
      window.ethereum.request({ method: 'eth_requestAccounts' }).then(function (accounts) {
        coinbase = accounts[0];
        $("#address").text(coinbase);
        web3.eth.getBalance(coinbase, function (error, result) {
          if (error) {
            handleError(error);
          }
          else {
            $("#balance").text(web3.utils.fromWei(result, "ether"));
          }
        });
      }).catch(function (error) {
        handleError(error);
      });
  
      // update jackpot
      ponziContract.methods.profitFromCrash().call(function (error, result) {
        if (error) {
          handleError(error);
        }
        else {
          var oldJackpot = jackpot;
          jackpot = parseInt(web3.utils.fromWei(result, "ether"));
          if (oldJackpot != jackpot) {
            $('#jackpot').countTo({
              from: oldJackpot,
              to: jackpot,
              speed: 1000,
              refreshInterval: 50,
              formatter: function (value) {
                return Math.ceil(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
              }
            });
          }
        }
      });
  
      // update countdown
      ponziContract.methods.lastTimeOfNewCredit().call(function (error, result) {
        if (error) {
          handleError(error);
        }
        else {
          var oldCountdown = countdown;
          countdown = parseInt(result); // BigNumber conversion not needed
          if (oldCountdown != countdown) {
            $("#countdown").countdown(new Date((countdown + TWELVE_HOURS) * 1000), function (event) {
              $(this).text(
                event.strftime('%H:%M:%S')
              );
            });
          }
        }
      });
  
      // update total payouts
      ponziContract.methods.totalPayedOut().call(function (error, result) {
        if (error) {
          handleError(error);
        }
        else {
          $("#totalPayouts").text(web3.utils.fromWei(result, "ether"));
        }
      });
  
      // update total debts
      ponziContract.methods.totalDebt().call(function (error, result) {
        if (error) {
          handleError(error);
        }
        else {
          $("#totalDebts").text(web3.utils.fromWei(result, "ether"));
        }
      });
  
      // update last investments and payouts
      ponziContract.methods.getCreditorAddresses().call(function (error, newCreditorAddresses) {
        if (error) {
          handleError(error);
        }
        else {
          ponziContract.methods.getCreditorAmounts().call(function (error, newCreditorAmounts) {
            if (error) {
              handleError(error);
            }
            else {
              ponziContract.methods.lastCreditorPayedOut().call(function (error, newLastCreditorPayedOut) {
                if (error) {
                  handleError(error);
                }
                else {
                  if (newCreditorAddresses.length > 0) {
                    var winnerAddress = newCreditorAddresses[newCreditorAddresses.length - 1];
                    $("#winner").text(winnerAddress.substring(0, 7)).attr("href", "https://goerli.etherscan.io/address/" + winnerAddress);
                  }
  
                  var investments = $("#investments");
                  investments.html("");
                  for (var i = newCreditorAddresses.length - 1; i > (newCreditorAddresses.length - 4) && i >= 0; i--) {
                    var investorRow = $("<tr></tr>");
                    investorRow.append($("<td>" + (i + 1) + "</td>"));
                    investorRow.append($('<td><a href="' + "https://goerli.etherscan.io/address/" + newCreditorAddresses[i] + '" target="_blank">' + newCreditorAddresses[i].substr(0, 22) + "</a></td>"));
                    investorRow.append($("<td>" + web3.utils.fromWei(newCreditorAmounts[i], "ether") + "</td>"));
                    investments.append(investorRow);
                  }
  
                  var payouts = $("#payouts");
                  payouts.html("");
                  for (i = parseInt(newLastCreditorPayedOut) - 1; i > (newLastCreditorPayedOut - 4) && i >= 0; i--) {
                    var payoutRow = $("<tr></tr>");
                    payoutRow.append($("<td>" + (i + 1) + "</td>"));
                    payoutRow.append($('<td><a href="' + "https://goerli.etherscan.io/address/" + newCreditorAddresses[i] + '" target="_blank">' + newCreditorAddresses[i].substr(0, 22) + "</a></td>"));
                    payoutRow.append($("<td>" + web3.utils.fromWei(newCreditorAmounts[i], "ether") + "</td>"));
                    payouts.append(payoutRow);
                  }
  
                  var nextPayouts = $("#nextPayouts");
                  nextPayouts.html("");
                  for (i = parseInt(newLastCreditorPayedOut); i < newCreditorAddresses.length && i < (parseInt(newLastCreditorPayedOut) + 3); i++) {
                    var nextPayoutRow = $("<tr></tr>");
                    nextPayoutRow.append($("<td>" + (i + 1) + "</td>"));
                    nextPayoutRow.append($('<td><a href="' + "https://goerli.etherscan.io/address/" + newCreditorAddresses[i] + '" target="_blank">' + newCreditorAddresses[i].substr(0, 22) + "</a></td>"));
                    nextPayoutRow.append($("<td>" + web3.utils.fromWei(newCreditorAmounts[i], "ether") + "</td>"));
                    nextPayouts.append(nextPayoutRow);
                  }
  
                  var buddies = $("#buddy");
                  var buddySelection = $("#buddy").val() != "0" ? $("#buddy").val() : ($.inArray(getUrlParameter('buddy'), newCreditorAddresses) > -1 ? getUrlParameter('buddy') : "0");
                  buddies.html("");
                  buddies.append($('<option>', { value: 0 }).text("Select buddy"));
                  var uniqueAddresses = jQuery.unique(newCreditorAddresses);
                  for (i = 0; i < uniqueAddresses.length; i++) {
                    buddies.append($('<option>', { value: uniqueAddresses }).text(uniqueAddresses));
                  }
                  buddies.val(buddySelection);
                }
              });
            }
          });
        }
      });
    }
  
    $("#connect").on("click", function () {
      openModal('Connecting', 'Establishing connection. Please close window.');
      connectToInfura();
    });
  
    $("#invest").on("click", function () {
      web3.eth.getBalance("0x8a50914AF0415588DF1652943F955b3E4C89ac4A", function (error, result) {
        if (error) {
          handleError(error);
        }
        else {
          var value = $("#amount").val();
          if (!isNaN(value) && parseFloat(value) >= 1) {
            ponziContract.methods.lendGovernmentMoney($("#buddy").val())
              .send({ from: coinbase, value: web3.utils.toWei(value, "ether"), gas: DEFAULT_GAS, gasPrice: web3.eth.gasPrice })
              .then(function (receipt) {
                var txLink = "https://live.ether.camp/transaction/" + receipt.transactionHash;
                var buddyLink = window.location.origin + "/?buddy=" + coinbase;
                openModal('Investment', 'Thank you for your investment!<br><br>Your transaction:<br><a target="_blank" href="' + txLink + '">' + txLink.substring(0, 64) + '</a><br><br>Spread the word and earn Ether:<br><a target="_blank" href="' + buddyLink + '">' + buddyLink + '</a>');
                $("#amount").val("");
              })
              .catch(function (error) {
                handleError(error);
              });
          }
          else {
            openModal('Wrong value', 'You have to invest at least 1 Ether.');
          }
        }
      });
    });
  
    connectToInfura();
  });
  