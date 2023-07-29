$(document).ready(function () {
  // Define constants
  var TWELVE_HOURS = 43200;
  var DEFAULT_GAS = 3000000;

  // Initialize variables
  var web3Provider;
  var ponziContract;
  var updateInterval;
  var coinbase;
  var jackpot;
  var countdown;

  // Function to connect to the blockchain using Infura
  function connectToInfura() {
    var infuraUrl = "https://mainnet.infura.io/v3/469b19720e5e488e85a00af2a63aa319"; // Replace with your Infura project ID
    web3Provider = new Web3.providers.HttpProvider(infuraUrl);
    window.web3 = new Web3(web3Provider);

    $.getJSON("static/js/abi.json", function (abi) {
      var contractAddress = $("0xF45717552f12Ef7cb65e95476F217Ea008167Ae3").val(); // Replace with your contract address
      ponziContract = new web3.eth.Contract(abi, contractAddress);

      clearInterval(updateInterval);
      updateInterval = setInterval(update, 10000); // Every 10 seconds
      update();
    });
  }

  // Function to connect to the wallet
  function connectWallet() {
    if (typeof window.ethereum !== "undefined") {
      window.web3 = new Web3(window.ethereum);
      window.ethereum
        .enable()
        .then(function (accounts) {
          openModal(
            "Wallet Connected",
            "Your Ethereum wallet is now connected.<br><br>Address: " +
              accounts[0]
          );
          connectToInfura();
        })
        .catch(function (error) {
          openModal(
            "Error",
            "An error occurred while connecting to your Ethereum wallet.<br><br>Error:<p>" +
              error +
              "</p>"
          );
          console.error(error);
        });
    } else {
      openModal(
        "Error",
        "No Ethereum wallet found. Please install MetaMask or another Ethereum wallet extension in your browser."
      );
    }
  }

  // Function to update contract and account information
  function update() {
    // Update coinbase and balance
    web3.eth.getCoinbase(function (error, result) {
      if (error) {
        handleError(error);
      } else {
        coinbase = result;
        $("#address").text(coinbase);
        web3.eth.getBalance(coinbase, function (error, result) {
          if (error) {
            handleError(error);
          } else {
            $("#balance").text(web3.utils.fromWei(result, "Ether"));
          }
        });
      }
    });

    // Update jackpot
    ponziContract.methods
      .profitFromCrash()
      .call(function (error, result) {
        if (error) {
          handleError(error);
        } else {
          var oldJackpot = jackpot;
          jackpot = parseInt(web3.utils.fromWei(result, "Ether"));
          if (oldJackpot != jackpot) {
            $("#jackpot").text(jackpot);
          }
        }
      })
      .catch(handleError);

    // Update countdown
    ponziContract.methods
      .lastTimeOfNewCredit()
      .call(function (error, result) {
        if (error) {
          handleError(error);
        } else {
          var oldCountdown = countdown;
          countdown = parseInt(new BigNumber(result));
          if (oldCountdown != countdown) {
            $("#countdown").countdown(
              new Date((countdown + TWELVE_HOURS) * 1000),
              function (event) {
                $(this).text(event.strftime("%H:%M:%S"));
              }
            );
          }
        }
      })
      .catch(handleError);

    // Update total payouts
    ponziContract.methods
      .totalPayedOut()
      .call(function (error, result) {
        if (error) {
          handleError(error);
        } else {
          $("#totalPayouts").text(web3.utils.fromWei(result, "Ether"));
        }
      })
      .catch(handleError);

    // Update total debts
    ponziContract.methods
      .totalDebt()
      .call(function (error, result) {
        if (error) {
          handleError(error);
        } else {
          $("#totalDebts").text(web3.utils.fromWei(result, "Ether"));
        }
      })
      .catch(handleError);

    // Update last investments and payouts
    ponziContract.methods
      .getCreditorAddresses()
      .call(function (error, newCreditorAddresses) {
        if (error) {
          handleError(error);
        } else {
          ponziContract.methods
            .getCreditorAmounts()
            .call(function (error, newCreditorAmounts) {
              if (error) {
                handleError(error);
              } else {
                ponziContract.methods
                  .lastCreditorPayedOut()
                  .call(function (error, newLastCreditorPayedOut) {
                    if (error) {
                      handleError(error);
                    } else {
                      if (newCreditorAddresses.length > 0) {
                        var winnerAddress =
                          newCreditorAddresses[
                            newCreditorAddresses.length - 1
                          ];
                        $("#winner")
                          .text(winnerAddress.substring(0, 7))
                          .attr(
                            "href",
                            "https://live.ether.camp/account/" + winnerAddress
                          );
                      }
                      var investments = $("#investments");
                      investments.html("");
                      for (
                        var i = newCreditorAddresses.length - 1;
                        i > newCreditorAddresses.length - 4 && i >= 0;
                        i--
                      ) {
                        var investorRow = $("<tr></tr>");
                        investorRow.append($("<td>" + (i + 1) + "</td>"));
                        investorRow.append(
                          $(
                            '<td><a href="' +
                              "https://live.ether.camp/account/" +
                              newCreditorAddresses[i] +
                              '" target="_blank">' +
                              newCreditorAddresses[i].substr(0, 22) +
                              "</a></td>"
                          )
                        );
                        investorRow.append(
                          $("<td>" + web3.utils.fromWei(newCreditorAmounts[i], "Ether").round(3) + "</td>")
                        );
                        investments.append(investorRow);
                      }
                      var payouts = $("#payouts");
                      payouts.html("");
                      for (
                        i = parseInt(newLastCreditorPayedOut) - 1;
                        i > newLastCreditorPayedOut - 4 && i >= 0;
                        i--
                      ) {
                        var payoutRow = $("<tr></tr>");
                        payoutRow.append($("<td>" + (i + 1) + "</td>"));
                        payoutRow.append(
                          $(
                            '<td><a href="' +
                              "https://live.ether.camp/account/" +
                              newCreditorAddresses[i] +
                              '" target="_blank">' +
                              newCreditorAddresses[i].substr(0, 22) +
                              "</a></td>"
                          )
                        );
                        payoutRow.append(
                          $("<td>" + web3.utils.fromWei(newCreditorAmounts[i], "Ether").round(3) + "</td>")
                        );
                        payouts.append(payoutRow);
                      }
                      var nextPayouts = $("#nextPayouts");
                      nextPayouts.html("");
                      for (
                        i = parseInt(newLastCreditorPayedOut);
                        i < newCreditorAddresses.length &&
                        i < parseInt(newLastCreditorPayedOut) + 3;
                        i++
                      ) {
                        var nextPayoutRow = $("<tr></tr>");
                        nextPayoutRow.append($("<td>" + (i + 1) + "</td>"));
                        nextPayoutRow.append(
                          $(
                            '<td><a href="' +
                              "https://live.ether.camp/account/" +
                              newCreditorAddresses[i] +
                              '" target="_blank">' +
                              newCreditorAddresses[i].substr(0, 22) +
                              "</a></td>"
                          )
                        );
                        nextPayoutRow.append(
                          $("<td>" + web3.utils.fromWei(newCreditorAmounts[i], "Ether").round(3) + "</td>")
                        );
                        nextPayouts.append(nextPayoutRow);
                      }
                      var buddies = $("#buddy");
                      var buddySelection =
                        $("#buddy").val() != "0"
                          ? $("#buddy").val()
                          : $.inArray(getUrlParameter("buddy"), newCreditorAddresses) > -1
                          ? getUrlParameter("buddy")
                          : "0";
                      buddies.html("");
                      buddies.append($("<option value='0'>Select buddy</option>"));
                      var uniqueAddresses = jQuery.unique(newCreditorAddresses);
                      for (i = 0; i < uniqueAddresses.length; i++) {
                        buddies.append(
                          $("<option>", {
                            value: uniqueAddresses[i],
                            text: uniqueAddresses[i],
                          })
                        );
                      }
                      buddies.val(buddySelection);
                    }
                  })
                  .catch(handleError);
              }
            })
            .catch(handleError);
        }
      })
      .catch(handleError);
  }

  // Function to handle investment
  $("#invest").on("click", function () {
    web3.eth.getBalance($("#contract-address").val(), function (error, result) {
      if (error) {
        handleError(error);
      } else {
        var value = $("#amount").val();
        if (!isNaN(value) && parseFloat(value) >= 1) {
          ponziContract.methods
            .lendGovernmentMoney($("#buddy").val())
            .send(
              { from: coinbase, value: web3.utils.toWei(value, "Ether"), gas: DEFAULT_GAS, gasPrice: web3.eth.gasPrice }
            )
            .on("transactionHash", function (txHash) {
              var txLink = "https://live.ether.camp/transaction/" + txHash;
              var buddyLink =
                window.location.origin + "/?buddy=" + coinbase;
              openModal(
                "Investment",
                "Thank you for your investment!<br><br>Your transaction:<br><a target='_blank' href='" +
                  txLink +
                  "'>" +
                  txLink.substring(0, 64) +
                  "</a><br><br>Spread the word and earn Ether:<br><a target='_blank' href='" +
                  buddyLink +
                  "'>" +
                  buddyLink +
                  "</a>"
              );
              $("#amount").val("");
            })
            .catch(handleError);
        } else {
          openModal("Wrong value", "You have to invest at least 1 Ether.");
        }
      }
    });
  });

  // Function to open the modal
  function openModal(title, body) {
    $(".modal-title").text(title);
    $(".modal-body").html(body);
    $("#modal").modal();
  }

  // Function to handle errors
  function handleError(error) {
    clearInterval(updateInterval);
    openModal(
      "Error",
      "An error occurred, please reload.<br><br>Error:<p>" + error + "</p>"
    );
    console.error(error);
  }

  // Function to get URL parameters
  function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
      sURLVariables = sPageURL.split("&"),
      sParameterName,
      i;

    for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split("=");
      if (sParameterName[0] === sParam) {
        return sParameterName[1] === undefined
          ? true
          : sParameterName[1].replace(/\/$/, "");
      }
    }
  }

  // Function to connect to the blockchain or the wallet
  function connect() {
    if (typeof web3 !== "undefined") {
      connectToInfura();
    } else {
      connectWallet();
    }
  }

  // Get the "Connect Wallet" button element
  var connectBtn = document.getElementById("connect-wallet-btn");

  // Attach the click event listener to the button
  connectBtn.addEventListener("click", connect);
});
