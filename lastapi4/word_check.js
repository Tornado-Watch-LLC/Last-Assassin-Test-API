module.exports = {
  code_okay: function (code) {
    code = code.toLowerCase();
    let skip_words = [
      "arse",
      "ass",
      "ahole",
      "bitch",
      "cunt",
      "damn",
      "fuck",
      "hell",
      "god",
      "jesus",
      "christ",
      "nigga",
      "piss",
      "prick",
      "shit",
      "slut",
      "dick",
      "cock",
      "pussy",
      "slut",
    ];
    for (let word of skip_words) {
      if (code.includes(word)) {
        return false;
      }
    }
    return true;
  },
};
