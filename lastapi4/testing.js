function to_letters(i) {
  let letters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  while (i > 0) {
    result += letters[i % 26];
    i = Math.floor(i / 26);
  }
  return result;
}

console.log(to_letters(1000));
